import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Content from "./content";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const processes = user
    ? await db.process.findMany({
        where: { userId: user.id },
        select: {
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
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <Content
      userId={user?.id ?? ""}
      processes={processes.map((p) => ({
        ...p,
        valorCausa: p.valorCausa ? Number(p.valorCausa) : null,
        lastEventAt: p.lastEventAt?.toISOString() ?? null,
        lastCheckedAt: p.lastCheckedAt?.toISOString() ?? null,
        proximaAudiencia: p.proximaAudiencia?.toISOString() ?? null,
      }))}
    />
  );
}
