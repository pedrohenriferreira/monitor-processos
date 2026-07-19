import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({ name, label, type }: { name: string; label: string; type: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required autoComplete={type === "password" ? "current-password" : "email"} />
    </div>
  );
}

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-5">
      <section className="w-full max-w-[400px] rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">M</div>
          <span className="text-[17px] font-bold">Monitor Processual</span>
        </div>
        <h1 className="mb-1 text-[19px] font-semibold">{title}</h1>
        {subtitle && <p className="mb-5 text-[13px] text-zinc-500">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}
