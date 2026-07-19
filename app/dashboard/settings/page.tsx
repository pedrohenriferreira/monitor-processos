import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { NotificationItem } from "@/components/dashboard/recent-notifications";
import Content from "./content";

const PROCESS_SELECT = {
  id: true,
  numeroCnj: true,
  tribunal: true,
  advogado: true,
  classe: true,
  parteAdversa: true,
  valorCausa: true,
  proximaAudiencia: true,
  lastEventName: true,
  lastEventAt: true,
  lastCheckedAt: true,
  status: true,
} as const;

export default async function SettingsPage() {
  const user = await getCurrentUser();

  const [connection, events] = user
    ? await Promise.all([
        db.telegramConnection.findUnique({
          where: { userId: user.id },
          select: { chatId: true, notifyNovoAndamento: true, notifyPrazo: true, notifyAudiencia: true },
        }),
        db.processEvent.findMany({
          where: { userId: user.id, OR: [{ notifiedAt: { not: null } }, { prazoNotifiedAt: { not: null } }] },
          orderBy: { happenedAt: "desc" },
          take: 6,
          select: { id: true, name: true, happenedAt: true, process: { select: PROCESS_SELECT } },
        }),
      ])
    : [null, []];

  const items: NotificationItem[] = events.map((event) => ({
    eventId: event.id,
    description: event.name,
    happenedAt: event.happenedAt.toISOString(),
    process: {
      ...event.process,
      valorCausa: event.process.valorCausa ? Number(event.process.valorCausa) : null,
      lastEventAt: event.process.lastEventAt?.toISOString() ?? null,
      lastCheckedAt: event.process.lastCheckedAt?.toISOString() ?? null,
      proximaAudiencia: event.process.proximaAudiencia?.toISOString() ?? null,
    },
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-[22px] font-semibold">Notificações</h1>
      <p className="mb-6 text-[13px] text-zinc-500">
        Avisos automáticos de movimentação processual, com opção de receber alertas também pelo Telegram.
      </p>
      <Content
        items={items}
        connected={Boolean(connection?.chatId)}
        prefs={{
          notifyNovoAndamento: connection?.notifyNovoAndamento ?? true,
          notifyPrazo: connection?.notifyPrazo ?? false,
          notifyAudiencia: connection?.notifyAudiencia ?? false,
        }}
      />
    </div>
  );
}
