export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }) });
  if (!response.ok) throw new Error(`Telegram ${response.status}: ${await response.text()}`);
}

type ProcessRef = { numero_cnj: string; tribunal: string; advogado: string | null };

function formatBr(dateHora: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(dateHora));
}

export function movementMessage(process: ProcessRef, movement: { nome: string; dataHora: string }) {
  const date = formatBr(movement.dataHora);
  return [`<b>Novo andamento processual</b>`, "", `<b>Processo:</b> ${process.numero_cnj}`, `<b>Tribunal:</b> ${process.tribunal.toUpperCase()}`, `<b>Advogado:</b> ${process.advogado || "-"}`, `<b>Movimentação:</b> ${movement.nome}`, `<b>Data:</b> ${date}`].join("\n");
}

export function prazoMessage(process: ProcessRef, movement: { nome: string; dataHora: string }) {
  const date = formatBr(movement.dataHora);
  return [`<b>⏰ Possível prazo em andamento</b>`, "", `<b>Processo:</b> ${process.numero_cnj}`, `<b>Tribunal:</b> ${process.tribunal.toUpperCase()}`, `<b>Advogado:</b> ${process.advogado || "-"}`, `<b>Movimentação:</b> ${movement.nome}`, `<b>Data:</b> ${date}`, "", "<i>Alerta baseado no texto da movimentação — confirme o prazo real no processo.</i>"].join("\n");
}

export function audienciaMessage(process: ProcessRef, proximaAudiencia: string) {
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(proximaAudiencia));
  return [`<b>📅 Audiência marcada</b>`, "", `<b>Processo:</b> ${process.numero_cnj}`, `<b>Tribunal:</b> ${process.tribunal.toUpperCase()}`, `<b>Advogado:</b> ${process.advogado || "-"}`, `<b>Data da audiência:</b> ${date}`].join("\n");
}

export function audienciaSummaryMessage(count: number) {
  return [`<b>📅 Audiências atualizadas</b>`, "", `${count} processos tiveram a data de audiência definida ou alterada nesta importação.`].join("\n");
}

export function testMessage() {
  return ["<b>Notificação de teste</b>", "", "Se você recebeu esta mensagem, as notificações do Monitor Processual estão funcionando corretamente."].join("\n");
}
