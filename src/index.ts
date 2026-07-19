/**
 * Monitor de Andamentos Processuais
 * ---------------------------------
 * 1. Lê os processos da planilha Excel (processos.xlsx)
 * 2. Consulta a API Pública do DataJud (CNJ) para cada processo
 * 3. Se houver movimentação mais recente que a registrada, atualiza a planilha
 * 4. Envia notificação no Telegram para o advogado responsável
 *
 * Uso: pnpm start  (ou agendado via cron / Task Scheduler)
 */

import ExcelJS from "exceljs";
import "dotenv/config";

// ── Config ──────────────────────────────────────────────────────────────────

const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!; // chat padrão (grupo do escritório)
const PLANILHA_PATH = process.env.PLANILHA_PATH ?? "./processos.xlsx";

// Colunas esperadas na planilha (linha 1 = cabeçalho)
const COL = {
  numero: 1, // Número do processo (formato CNJ, com ou sem máscara)
  tribunal: 2, // Alias do tribunal no DataJud: tjsp, trf3, tst, trt2...
  advogado: 3, // Nome do advogado responsável
  chatId: 4, // (opcional) chat_id individual do advogado no Telegram
  ultimaMov: 5, // Descrição da última movimentação registrada
  dataUltimaMov: 6, // Data/hora da última movimentação registrada
  ultimaVerificacao: 7, // Quando o script rodou pela última vez
  status: 8, // OK | NOVO ANDAMENTO | ERRO
} as const;

// ── DataJud ─────────────────────────────────────────────────────────────────

interface Movimento {
  codigo: number;
  nome: string;
  dataHora: string;
  complementosTabelados?: { nome: string; descricao: string }[];
}

async function consultarProcesso(
  numeroProcesso: string,
  tribunal: string
): Promise<Movimento[] | null> {
  const numero = numeroProcesso.replace(/\D/g, ""); // API espera só dígitos
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.toLowerCase()}/_search`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `APIKey ${DATAJUD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: numero } },
      size: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`DataJud ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const hit = data?.hits?.hits?.[0]?._source;
  if (!hit?.movimentos?.length) return null;

  // Ordena por data decrescente e retorna
  return [...hit.movimentos].sort(
    (a: Movimento, b: Movimento) =>
      new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );
}

// ── Telegram ────────────────────────────────────────────────────────────────

async function notificarTelegram(chatId: string, texto: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    console.error(`Falha ao notificar Telegram: ${await res.text()}`);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtData = (iso: string | Date) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

function houveNovoAndamento(
  ultimoMovApi: Movimento,
  dataRegistrada: string | Date | null | undefined
): boolean {
  if (!dataRegistrada) return true; // primeira verificação
  return (
    new Date(ultimoMovApi.dataHora).getTime() >
    new Date(dataRegistrada).getTime()
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PLANILHA_PATH);
  const sheet = workbook.worksheets[0];

  let novos = 0;
  let erros = 0;

  // Itera a partir da linha 2 (pula cabeçalho)
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const numero = String(row.getCell(COL.numero).value ?? "").trim();
    const tribunal = String(row.getCell(COL.tribunal).value ?? "").trim();
    if (!numero || !tribunal) continue;

    const advogado = String(row.getCell(COL.advogado).value ?? "").trim();
    const chatId =
      String(row.getCell(COL.chatId).value ?? "").trim() || TELEGRAM_CHAT_ID;
    const dataRegistrada = row.getCell(COL.dataUltimaMov).value as
      | string
      | Date
      | null;

    try {
      const movimentos = await consultarProcesso(numero, tribunal);
      row.getCell(COL.ultimaVerificacao).value = fmtData(new Date());

      if (!movimentos) {
        row.getCell(COL.status).value = "NÃO ENCONTRADO";
        continue;
      }

      const ultimo = movimentos[0];

      if (houveNovoAndamento(ultimo, dataRegistrada)) {
        novos++;
        row.getCell(COL.ultimaMov).value = ultimo.nome;
        row.getCell(COL.dataUltimaMov).value = fmtData(ultimo.dataHora);
        row.getCell(COL.status).value = "NOVO ANDAMENTO";

        await notificarTelegram(
          chatId,
          [
            `⚖️ <b>Novo andamento processual</b>`,
            ``,
            `<b>Processo:</b> ${numero}`,
            `<b>Tribunal:</b> ${tribunal.toUpperCase()}`,
            `<b>Advogado:</b> ${advogado || "—"}`,
            `<b>Movimentação:</b> ${ultimo.nome}`,
            `<b>Data:</b> ${fmtData(ultimo.dataHora)}`,
          ].join("\n")
        );
      } else {
        row.getCell(COL.status).value = "SEM ALTERAÇÃO";
      }
    } catch (err) {
      erros++;
      row.getCell(COL.status).value = "ERRO";
      console.error(`Erro no processo ${numero}:`, err);
    }

    // Respeita rate limit da API pública (evita 429)
    await new Promise((r) => setTimeout(r, 1500));
  }

  await workbook.xlsx.writeFile(PLANILHA_PATH);
  console.log(
    `Concluído: ${novos} novo(s) andamento(s), ${erros} erro(s). Planilha atualizada.`
  );
}

main().catch((err) => {
  console.error("Falha geral na execução:", err);
  process.exit(1);
});
