import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [processCount, connection] = await Promise.all([
    db.process.count({ where: { userId: user.id } }),
    db.telegramConnection.findUnique({ where: { userId: user.id }, select: { chatId: true } }),
  ]);

  const displayName = user.fullName || user.email;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-[22px] font-semibold">Minha Conta</h1>
      <div className="rounded-xl border border-zinc-200 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-base font-semibold text-zinc-700">
            {initials(displayName)}
          </div>
          <div>
            <div className="text-[15px] font-semibold">{displayName}</div>
            <div className="text-[12.5px] text-zinc-500">{user.email}</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3.5 text-[13.5px]">
          <Row label="Processos monitorados" value={String(processCount)} />
          <Row label="Notificações Telegram" value={connection?.chatId ? "Ativo" : "Não conectado"} />
        </div>
        <form action="/auth/sign-out" method="post">
          <Button variant="danger" className="mt-5 w-full">Sair</Button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
