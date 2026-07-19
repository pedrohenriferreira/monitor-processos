import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(2000) });

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
  const { count } = await db.process.deleteMany({ where: { id: { in: parsed.data.ids }, userId: user.id } });
  return NextResponse.json({ removed: count });
}
