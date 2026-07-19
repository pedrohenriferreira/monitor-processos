"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge, STATUS_BADGE } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/utils";
import type { ProcessRow } from "./process-types";

type EventItem = { id: string; name: string; happenedAt: string; code: number | null };

export function ProcessDetailSheet({ process, onOpenChange }: { process: ProcessRow | null; onOpenChange: (open: boolean) => void }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!process) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for an in-flight fetch keyed off `process`, guarded by `cancelled`
    setLoading(true);
    fetch(`/api/processes/${process.id}/events`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setEvents(data.events ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [process]);

  if (!process) return null;
  const status = STATUS_BADGE[process.status];

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="mb-3 pr-8">
          <SheetTitle className="mb-1.5 font-mono text-[14.5px] font-semibold">{process.numeroCnj}</SheetTitle>
          <Badge variant="tribunal" className="uppercase">{process.tribunal}</Badge>
        </div>
        <div className="mb-1 flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="text-[13px]">{process.lastEventName ?? "Ainda não consultado"}</span>
        </div>
        <div className="mb-4 text-xs text-zinc-400">{formatDate(process.lastEventAt)}</div>

        <div className="mb-5 grid grid-cols-2 gap-4 border-y border-zinc-100 py-4">
          <Field label="Classe" value={process.classe} />
          <Field label="Parte adversa" value={process.parteAdversa} />
          <Field label="Advogado" value={process.advogado} />
          <Field label="Valor da causa" value={formatCurrency(process.valorCausa)} />
          <Field label="Próxima audiência" value={formatDateOnly(process.proximaAudiencia)} />
          <Field label="Última verificação" value={formatDate(process.lastCheckedAt)} />
        </div>

        <div className="mb-3 text-sm font-semibold">Histórico de Andamentos</div>
        {loading && <div className="text-sm text-zinc-400">Carregando...</div>}
        <div className="flex flex-col">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                {index < events.length - 1 && <span className="min-h-6 w-px flex-1 bg-zinc-200" />}
              </div>
              <div className="pb-4">
                <div className="mb-0.5 text-xs text-zinc-400">{formatDate(event.happenedAt)}</div>
                <div className="text-[13px]">{event.name}</div>
              </div>
            </div>
          ))}
          {!loading && !events.length && <div className="text-sm text-zinc-400">Nenhum andamento registrado ainda.</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="mb-0.5 text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-[13px]">{value || "—"}</div>
    </div>
  );
}
