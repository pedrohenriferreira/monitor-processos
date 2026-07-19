import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const process = await db.process.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!process) return NextResponse.json({ error: "Processo não encontrado." }, { status: 404 });
  const events = await db.processEvent.findMany({
    where: { processId: id },
    orderBy: { happenedAt: "desc" },
    select: { id: true, name: true, happenedAt: true, code: true },
  });
  return NextResponse.json({ events });
}
