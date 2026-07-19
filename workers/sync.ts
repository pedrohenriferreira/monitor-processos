import "dotenv/config";
import { db } from "../lib/db.js";
import { consultarProcesso, isNewerMovement } from "../lib/datajud.js";
import { movementMessage, prazoMessage, sendTelegramMessage } from "../lib/telegram.js";

const delay = Number(process.env.WORKER_DELAY_MS ?? 1500);
const wait = () => new Promise((resolve) => setTimeout(resolve, delay));

// Bounded heuristic: DataJud exposes no structured deadline field, only free-text
// movement names. This is a best-effort keyword guess, not real deadline tracking —
// results vary by tribunal wording and may miss or over-flag movements.
const PRAZO_KEYWORDS = ["prazo", "intimacao", "manifestacao", "contestacao", "replica", "recurso", "embargos"];
function matchesPrazoKeyword(nome: string) {
  const normalized = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return PRAZO_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

async function main() {
  const run = await db.workerRun.create({ data: {} });
  let newEvents = 0; let errors = 0;
  const processes = await db.process.findMany({ where: { isActive: true }, orderBy: { updatedAt: "asc" } });
  for (const process of processes) {
    try {
      const movements = await consultarProcesso(process.numeroCnj, process.tribunal);
      const checkedAt = new Date();
      if (!movements.length) { await db.process.update({ where: { id: process.id }, data: { status: "NOT_FOUND", lastCheckedAt: checkedAt, lastError: null } }); await wait(); continue; }
      const latest = movements[movements.length - 1];
      if (!process.lastEventAt) { await db.process.update({ where: { id: process.id }, data: { lastEventName: latest.nome, lastEventCode: latest.codigo, lastEventAt: new Date(latest.dataHora), lastCheckedAt: checkedAt, status: "OK", lastError: null } }); await wait(); continue; }
      const newMovements = movements.filter((movement) => isNewerMovement(movement, process.lastEventAt!.toISOString()));
      if (!newMovements.length) { await db.process.update({ where: { id: process.id }, data: { lastCheckedAt: checkedAt, status: "OK", lastError: null } }); await wait(); continue; }
      await db.process.update({ where: { id: process.id }, data: { lastEventName: latest.nome, lastEventCode: latest.codigo, lastEventAt: new Date(latest.dataHora), lastCheckedAt: checkedAt, status: "NEW_EVENT", lastError: null } });
      const connection = await db.telegramConnection.findUnique({ where: { userId: process.userId }, select: { chatId: true, notifyNovoAndamento: true, notifyPrazo: true } });
      for (const movement of newMovements) {
        const event = await db.processEvent.upsert({ where: { processId_happenedAt_name: { processId: process.id, happenedAt: new Date(movement.dataHora), name: movement.nome } }, create: { processId: process.id, userId: process.userId, code: movement.codigo, name: movement.nome, happenedAt: new Date(movement.dataHora), metadata: { complementos: movement.complementosTabelados ?? [] } }, update: {} });
        newEvents++;
        const processRef = { numero_cnj: process.numeroCnj, tribunal: process.tribunal, advogado: process.advogado };
        if (connection?.chatId && connection.notifyNovoAndamento && !event.notifiedAt) {
          await sendTelegramMessage(connection.chatId, movementMessage(processRef, movement));
          await db.processEvent.update({ where: { id: event.id }, data: { notifiedAt: new Date() } });
        }
        if (connection?.chatId && connection.notifyPrazo && !event.prazoNotifiedAt && matchesPrazoKeyword(movement.nome)) {
          await sendTelegramMessage(connection.chatId, prazoMessage(processRef, movement));
          await db.processEvent.update({ where: { id: event.id }, data: { prazoNotifiedAt: new Date() } });
        }
      }
    } catch (err) { errors++; await db.process.update({ where: { id: process.id }, data: { status: "ERROR", lastCheckedAt: new Date(), lastError: err instanceof Error ? err.message.slice(0, 1000) : "Erro desconhecido" } }); }
    await wait();
  }
  await db.workerRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), totalProcesses: processes.length, newEvents, errors, status: errors ? "COMPLETED_WITH_ERRORS" : "COMPLETED" } });
  console.log(`Concluído: ${newEvents} novo(s) andamento(s), ${errors} erro(s).`);
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());
