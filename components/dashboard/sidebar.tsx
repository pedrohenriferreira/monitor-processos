"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Processos" },
  { href: "/dashboard/import", label: "Importar Planilha" },
  { href: "/dashboard/settings", label: "Notificações" },
  { href: "/dashboard/account", label: "Conta" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Sidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col justify-between border-r border-zinc-200 bg-zinc-50 p-4">
      <div>
        <div className="mb-7 flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">M</div>
          <span className="text-[15.5px] font-bold">Monitor Processual</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors",
                  active ? "bg-accent/10 text-accent" : "hover:bg-zinc-100"
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-accent" : "bg-zinc-300")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2.5 border-t border-zinc-200 pt-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
          {initials(name || email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium">{name || email}</div>
        </div>
        <form action="/auth/sign-out" method="post">
          <button className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800">Sair</button>
        </form>
      </div>
    </aside>
  );
}
