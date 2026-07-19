import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const connection = await db.telegramConnection.findUnique({ where: { userId: user.id }, select: { chatId: true } });
  return NextResponse.json({ connected: Boolean(connection?.chatId) });
}

export async function POST() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 }); const rawUsername = process.env.TELEGRAM_BOT_USERNAME; if (!rawUsername) return NextResponse.json({ error: "Bot Telegram não configurado." }, { status: 503 }); const username = rawUsername.trim().replace(/^@/, ""); const token = randomBytes(24).toString("base64url"); const expiresAt = new Date(Date.now() + 15 * 60 * 1000); try { await db.telegramConnection.upsert({ where: { userId: user.id }, create: { userId: user.id, linkTokenHash: hash(token), linkTokenExpiresAt: expiresAt }, update: { linkTokenHash: hash(token), linkTokenExpiresAt: expiresAt, chatId: null, connectedAt: null } }); return NextResponse.json({ url: `https://t.me/${username}?start=${token}`, expiresAt: expiresAt.toISOString() }); } catch { return NextResponse.json({ error: "Não foi possível gerar o vínculo." }, { status: 500 }); } }

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  await db.telegramConnection.updateMany({ where: { userId: user.id }, data: { chatId: null, connectedAt: null, linkTokenHash: null, linkTokenExpiresAt: null } });
  return NextResponse.json({ ok: true });
}
