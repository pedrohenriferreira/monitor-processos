"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Prefs = { notifyNovoAndamento: boolean; notifyPrazo: boolean; notifyAudiencia: boolean };

const ITEMS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "notifyNovoAndamento", label: "Novo andamento", description: "Quando um processo tiver movimentação" },
  { key: "notifyPrazo", label: "Prazo se aproximando", description: "Alertas de prazos processuais (heurística por palavra-chave)" },
  { key: "notifyAudiencia", label: "Audiência marcada", description: "Nova data de audiência definida na importação" },
];

export function NotificationPreferences({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [sendingTest, setSendingTest] = useState(false);

  async function toggle(key: keyof Prefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const response = await fetch("/api/telegram/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!response.ok) {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      toast.error("Não foi possível atualizar a preferência.");
    }
  }

  async function sendTest() {
    setSendingTest(true);
    const response = await fetch("/api/telegram/test", { method: "POST" });
    setSendingTest(false);
    if (!response.ok) return toast.error("Não foi possível enviar a notificação de teste.");
    toast.success("Notificação de teste enviada via Telegram.");
  }

  return (
    <div className="max-w-[600px] rounded-xl border border-zinc-200 p-5">
      <div className="mb-3 text-sm font-semibold">Preferências de notificação</div>
      {ITEMS.map((item, index) => (
        <div key={item.key} className={`flex items-center justify-between py-2.5 ${index < ITEMS.length - 1 ? "border-b border-zinc-100" : ""}`}>
          <div>
            <div className="text-[13.5px] font-medium">{item.label}</div>
            <div className="text-xs text-zinc-400">{item.description}</div>
          </div>
          <Switch checked={prefs[item.key]} onCheckedChange={(value) => toggle(item.key, value)} />
        </div>
      ))}
      <Button variant="outline" size="sm" className="mt-4" onClick={sendTest} disabled={sendingTest}>
        {sendingTest ? "Enviando..." : "Enviar notificação de teste"}
      </Button>
    </div>
  );
}
