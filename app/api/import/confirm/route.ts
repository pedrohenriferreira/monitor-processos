import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateRows, type ImportRow } from "@/lib/processes";
import { audienciaMessage, audienciaSummaryMessage, sendTelegramMessage } from "@/lib/telegram";

const schema = z.object({
  filename: z.string().max(255),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
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
  const { valid, rejected } = validateRows(parsed.data.rows, parsed.data.mapping);
  try {
    // These two are independent — run them concurrently instead of one-after-another.
    const [importRecord, existing] = await Promise.all([
      db.import.create({ data: { userId: user.id, filename: parsed.data.filename, totalRows: parsed.data.rows.length, importedRows: valid.length, rejectedRows: rejected.length } }),
      valid.length
        ? db.process.findMany({
            where: { userId: user.id, OR: valid.map((row) => ({ numeroCnj: row.numeroCnj, tribunal: row.tribunal })) },
            select: { numeroCnj: true, tribunal: true, proximaAudiencia: true, audienciaAlertadaPara: true },
          })
        : Promise.resolve([]),
    ]);
    const existingByKey = new Map(existing.map((p) => [`${p.numeroCnj}|${p.tribunal}`, p]));

    if (valid.length) {
      await bulkUpsertProcesses(user.id, importRecord.id, valid);
    }

    // Best-effort bookkeeping/notifications — don't make the user wait on these.
    db.import.update({ where: { id: importRecord.id }, data: { status: "COMPLETED" } }).catch(() => {});
    notifyAudienciaChanges(user.id, valid, existingByKey).catch(() => {});

    return NextResponse.json({ imported: valid.length, rejected: rejected.length, rejectedRows: rejected });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar os processos." }, { status: 500 });
  }
}

// Single round-trip bulk upsert instead of one upsert per row — matters a lot for
// large spreadsheets (hundreds/thousands of rows previously meant that many sequential queries).
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

async function notifyAudienciaChanges(
  userId: string,
  rows: ImportRow[],
  existingByKey: Map<string, { numeroCnj: string; tribunal: string; proximaAudiencia: Date | null; audienciaAlertadaPara: Date | null }>
) {
  const changed = rows.filter((row) => {
    if (!row.proximaAudiencia) return false;
    const prior = existingByKey.get(`${row.numeroCnj}|${row.tribunal}`);
    const priorValue = prior?.audienciaAlertadaPara?.toISOString() ?? prior?.proximaAudiencia?.toISOString();
    return priorValue !== row.proximaAudiencia;
  });
  if (!changed.length) return;

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
