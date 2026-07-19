import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return (
    <div className="flex h-screen">
      <Sidebar name={user.fullName ?? ""} email={user.email} />
      <main className="min-w-0 flex-1 overflow-y-auto p-7 md:p-8">{children}</main>
    </div>
  );
}
