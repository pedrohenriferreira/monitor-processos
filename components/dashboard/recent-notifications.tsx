"use client";
import { useState } from "react";
import { STATUS_BADGE } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ProcessDetailSheet } from "./process-detail-sheet";
import type { ProcessRow } from "./process-types";

const DOT_COLOR: Record<string, string> = { novo: "#1d4ed8", aguardando: "#b45309", urgente: "#b91c1c", concluido: "#15803d" };

export type NotificationItem = { eventId: string; description: string; happenedAt: string; process: ProcessRow };

export function RecentNotifications({ items }: { items: NotificationItem[] }) {
  const [detailRow, setDetailRow] = useState<ProcessRow | null>(null);

  return (
    <div className="mb-8">
      <div className="mb-3 text-sm font-semibold">Avisos Recentes</div>
      <div className="max-w-[680px] overflow-hidden rounded-xl border border-zinc-200">
        {items.length ? (
          items.map((item, index) => {
            const status = STATUS_BADGE[item.process.status];
            return (
              <div
                key={item.eventId}
                onClick={() => setDetailRow(item.process)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-zinc-50 ${index < items.length - 1 ? "border-b border-zinc-100" : ""}`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT_COLOR[status.variant] }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-zinc-700">{item.process.numeroCnj}</span>
                    <span className="rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium uppercase">{item.process.tribunal}</span>
                  </div>
                  <div className="mt-0.5 text-[13px]">{item.description}</div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[11.5px] text-zinc-400">{formatDate(item.happenedAt)}</span>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center text-sm text-zinc-400">Nenhum aviso ainda.</div>
        )}
      </div>
      <ProcessDetailSheet process={detailRow} onOpenChange={(open) => !open && setDetailRow(null)} />
    </div>
  );
}
