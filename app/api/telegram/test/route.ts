import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTelegramMessage, testMessage } from "@/lib/telegram";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const connection = await db.telegramConnection.findUnique({ where: { userId: user.id }, select: { chatId: true } });
  if (!connection?.chatId) return NextResponse.json({ error: "Telegram não conectado." }, { status: 409 });
  try {
    await sendTelegramMessage(connection.chatId, testMessage());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar a notificação de teste." }, { status: 500 });
  }
}
