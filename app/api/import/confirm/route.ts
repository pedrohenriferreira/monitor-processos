import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateRows, type ImportRow } from "@/lib/processes";
import { audienciaMessage, audienciaSummaryMessage, sendTelegramMessage } from "@/lib/telegram";

const IMPORT_CHUNK_SIZE = 200;

const schema = z.object({
  importId: z.string().uuid(),
  mapping: z.object({
    numeroCnj: z.string().min(1),
    tribunal: z.string().min(1),
    advogado: z.string().optional(),
    classe: z.string().optional(),
    parteAdversa: z.string().optional(),
    valorCausa: z.string().optional(),
    proximaAudiencia: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados de importação inválidos." }, { status: 400 });

  const importRecord = await db.import.findUnique({ where: { id: parsed.data.importId } });
  if (!importRecord || importRecord.userId !== user.id) {
    return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  }
  if (importRecord.status !== "PREVIEW" || !importRecord.rawRows) {
    return NextResponse.json({ error: "Esta importação já foi processada ou expirou." }, { status: 409 });
  }

  const rawRows = importRecord.rawRows as Record<string, unknown>[];
  const { valid, rejected } = validateRows(rawRows, parsed.data.mapping);
  // Um único INSERT ... ON CONFLICT falha inteiro se duas linhas da MESMA leva mirarem a
  // mesma chave (numero_cnj, tribunal) — planilha com processo repetido, por exemplo.
  // Mantém só a última ocorrência e reporta as demais como rejeitadas, em vez de derrubar o lote.
  const { deduped: toImport, duplicates } = dedupeByProcessKey(valid);
  const allRejected = [...rejected, ...duplicates];

  // Responde rápido com um payload mínimo — a escrita em si acontece em segundo plano
  // (após a resposta) e o cliente acompanha o progresso via polling em GET /api/import/[id].
  await db.import.update({
    where: { id: importRecord.id },
    data: {
      status: "PROCESSING",
      importedRows: toImport.length,
      rejectedRows: allRejected.length,
      rejectedDetails: allRejected,
      rawRows: Prisma.DbNull,
    },
  });

  after(() => processImport(importRecord.id, user.id, toImport));

  return NextResponse.json({ importId: importRecord.id, importedRows: toImport.length, rejectedRows: allRejected.length });
}

function dedupeByProcessKey(rows: ImportRow[]) {
  const lastIndexByKey = new Map<string, number>();
  rows.forEach((row, index) => lastIndexByKey.set(`${row.numeroCnj}|${row.tribunal}`, index));

  const deduped: ImportRow[] = [];
  const duplicates: { rowNumber: number; reason: string }[] = [];
  rows.forEach((row, index) => {
    if (lastIndexByKey.get(`${row.numeroCnj}|${row.tribunal}`) === index) deduped.push(row);
    else duplicates.push({ rowNumber: row.rowNumber, reason: "Processo duplicado nesta planilha — mantida apenas a última ocorrência." });
  });
  return { deduped, duplicates };
}

async function processImport(importId: string, userId: string, valid: ImportRow[]) {
  const changed: ImportRow[] = [];
  try {
    for (let i = 0; i < valid.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = valid.slice(i, i + IMPORT_CHUNK_SIZE);
      const existing = await db.process.findMany({
        where: { userId, OR: chunk.map((row) => ({ numeroCnj: row.numeroCnj, tribunal: row.tribunal })) },
        select: { numeroCnj: true, tribunal: true, proximaAudiencia: true, audienciaAlertadaPara: true },
      });
      const existingByKey = new Map(existing.map((p) => [`${p.numeroCnj}|${p.tribunal}`, p]));

      await bulkUpsertProcesses(userId, importId, chunk);

      for (const row of chunk) {
        if (!row.proximaAudiencia) continue;
        const prior = existingByKey.get(`${row.numeroCnj}|${row.tribunal}`);
        const priorValue = prior?.audienciaAlertadaPara?.toISOString() ?? prior?.proximaAudiencia?.toISOString();
        if (priorValue !== row.proximaAudiencia) changed.push(row);
      }

      await db.import.update({ where: { id: importId }, data: { processedRows: { increment: chunk.length } } });
    }

    // Notificação de audiência é melhor-esforço — não deve derrubar uma importação que já
    // gravou os processos com sucesso.
    if (changed.length) await notifyAudienciaChanges(userId, changed).catch(() => {});
    await db.import.update({ where: { id: importId }, data: { status: "COMPLETED" } });
  } catch {
    await db.import
      .update({
        where: { id: importId },
        data: { status: "FAILED", errorMessage: "Falha ao salvar parte dos processos. Os processos já processados até o momento da falha foram mantidos." },
      })
      .catch(() => {});
  }
}

// Upsert em lote por página (chunk) em vez de um único INSERT gigante ou um upsert por linha —
// dá granularidade pra reportar progresso e evita uma cláusula OR com milhares de condições.
async function bulkUpsertProcesses(userId: string, importId: string, rows: ImportRow[]) {
  const values = rows.map(
    (row) => Prisma.sql`(
      ${randomUUID()}::uuid, ${userId}::uuid, ${importId}::uuid, ${row.numeroCnj}, ${row.tribunal},
      ${row.advogado}, ${row.classe}, ${row.parteAdversa}, ${row.valorCausa}, ${row.proximaAudiencia}::timestamptz,
      now(), now()
    )`
  );
  await db.$executeRaw`
    INSERT INTO processes (id, user_id, import_id, numero_cnj, tribunal, advogado, classe, parte_adversa, valor_causa, proxima_audiencia, created_at, updated_at)
    VALUES ${Prisma.join(values)}
    ON CONFLICT (user_id, numero_cnj, tribunal)
    DO UPDATE SET
      import_id = EXCLUDED.import_id,
      advogado = EXCLUDED.advogado,
      classe = EXCLUDED.classe,
      parte_adversa = EXCLUDED.parte_adversa,
      valor_causa = EXCLUDED.valor_causa,
      proxima_audiencia = EXCLUDED.proxima_audiencia,
      updated_at = now()
  `;
}

async function notifyAudienciaChanges(userId: string, changed: ImportRow[]) {
  const connection = await db.telegramConnection.findUnique({ where: { userId }, select: { chatId: true, notifyAudiencia: true } });
  if (!connection?.chatId || !connection.notifyAudiencia) return;

  if (changed.length > 10) {
    await sendTelegramMessage(connection.chatId, audienciaSummaryMessage(changed.length));
  } else {
    for (const row of changed) {
      await sendTelegramMessage(connection.chatId, audienciaMessage({ numero_cnj: row.numeroCnj, tribunal: row.tribunal, advogado: row.advogado }, row.proximaAudiencia!));
    }
  }

  await Promise.all(
    changed.map((row) =>
      db.process.update({
        where: { userId_numeroCnj_tribunal: { userId, numeroCnj: row.numeroCnj, tribunal: row.tribunal } },
        data: { audienciaAlertadaPara: new Date(row.proximaAudiencia!) },
      })
    )
  );
}
