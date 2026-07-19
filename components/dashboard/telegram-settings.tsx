"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TelegramIcon } from "@/components/icons/telegram-icon";
import { NotificationPreferences } from "./notification-preferences";

type Prefs = { notifyNovoAndamento: boolean; notifyPrazo: boolean; notifyAudiencia: boolean };

async function fetchConnected() {
  const response = await fetch("/api/telegram/link");
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.connected);
}

export function TelegramSettings({ connected, prefs }: { connected: boolean; prefs: Prefs }) {
  const router = useRouter();
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Enquanto o link estiver aberto, checa periodicamente se o /start já chegou no webhook,
  // para não depender do usuário lembrar de clicar em "verificar conexão".
  useEffect(() => {
    if (!url || connected) return;
    const interval = setInterval(async () => {
      if (await fetchConnected()) router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [url, connected, router]);

  async function generate() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/telegram/link", { method: "POST" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Não foi possível gerar o link.");
    setUrl(data.url);
  }

  async function verify() {
    setChecking(true);
    const isConnected = await fetchConnected();
    setChecking(false);
    if (isConnected) return router.refresh();
    toast.info("Ainda não detectamos a conexão. Abra o bot no Telegram e envie /start antes de tentar novamente.");
  }

  async function disconnect() {
    setDisconnecting(true);
    const response = await fetch("/api/telegram/link", { method: "DELETE" });
    setDisconnecting(false);
    if (!response.ok) return toast.error("Não foi possível desconectar.");
    setUrl(undefined);
    router.refresh();
  }

  if (connected) {
    return (
      <div className="mb-8 max-w-[600px]">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
            <span className="text-sm font-semibold">Telegram conectado</span>
          </div>
          <button className="text-[13px] font-medium text-red-700 hover:underline disabled:opacity-50" onClick={disconnect} disabled={disconnecting}>
            Desconectar
          </button>
        </div>
        <NotificationPreferences initial={prefs} />
      </div>
    );
  }

  return (
    <div className="mb-8 max-w-[600px] rounded-xl border border-zinc-200 p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          <TelegramIcon size={44} />
        </div>
        <div>
          <div className="mb-1 text-[15px] font-semibold">Receba alertas em tempo real</div>
          <div className="text-[13px] leading-relaxed text-zinc-500">
            Conecte sua conta ao bot do Telegram para ser notificado sempre que houver uma nova movimentação processual.
          </div>
        </div>
      </div>

      {!url ? (
        <Button onClick={generate} disabled={loading}>
          {loading && <LoaderCircle className="animate-spin" size={16} />}
          Gerar link de vinculação
        </Button>
      ) : (
        <div>
          <div className="mb-3 text-[13.5px]">Abra o link abaixo para vincular sua conta ao bot do Telegram:</div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Abrir bot no Telegram
              </a>
            </Button>
            <Button variant="outline" onClick={verify} disabled={checking}>
              {checking ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
              Já vinculei, verificar conexão
            </Button>
          </div>
          <div className="mt-3 text-xs text-zinc-400">O link expira em 15 minutos.</div>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
