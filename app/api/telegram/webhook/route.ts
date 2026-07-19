import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const update = await request.json();
  const message = update?.message;
  const chatId = String(message?.chat?.id ?? "");
  const text = String(message?.text ?? "");
  if (!chatId || !text.startsWith("/start")) return NextResponse.json({ ok: true });

  const token = text.match(/^\/start\s+([A-Za-z0-9_-]+)$/)?.[1];
  if (!token) {
    await sendTelegramMessage(chatId, "Para vincular sua conta, gere o link de conexão no painel do Monitor Processual e abra-o para iniciar esta conversa.");
    return NextResponse.json({ ok: true });
  }

  const connection = await db.telegramConnection.findFirst({ where: { linkTokenHash: hash(token) } });
  if (!connection || !connection.linkTokenExpiresAt || connection.linkTokenExpiresAt < new Date()) {
    await sendTelegramMessage(chatId, "Este vínculo não é válido ou expirou. Gere um novo link no painel.");
    return NextResponse.json({ ok: true });
  }

  await db.telegramConnection.update({
    where: { id: connection.id },
    data: { chatId, linkTokenHash: null, linkTokenExpiresAt: null, connectedAt: new Date() },
  });
  await sendTelegramMessage(chatId, "Notificações do Monitor Processual ativadas para esta conta.");
  return NextResponse.json({ ok: true });
}
