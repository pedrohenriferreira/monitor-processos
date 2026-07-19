import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  notifyNovoAndamento: z.boolean().optional(),
  notifyPrazo: z.boolean().optional(),
  notifyAudiencia: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const connection = await db.telegramConnection.findUnique({ where: { userId: user.id } });
  if (!connection?.chatId) return NextResponse.json({ error: "Telegram não conectado." }, { status: 409 });
  const updated = await db.telegramConnection.update({ where: { userId: user.id }, data: parsed.data });
  return NextResponse.json({
    notifyNovoAndamento: updated.notifyNovoAndamento,
    notifyPrazo: updated.notifyPrazo,
    notifyAudiencia: updated.notifyAudiencia,
  });
}
