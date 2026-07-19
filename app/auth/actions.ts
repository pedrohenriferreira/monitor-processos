"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
const get = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
export async function login(formData: FormData) { const user = await db.user.findUnique({ where: { email: get(formData, "email").toLowerCase() } }); if (!user || !(await bcrypt.compare(get(formData, "password"), user.passwordHash))) redirect("/auth/login?error=credenciais"); await createSession(user); redirect("/dashboard"); }
export async function signUp(formData: FormData) { const email = get(formData, "email").toLowerCase(); const password = get(formData, "password"); if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) redirect("/auth/sign-up?error=dados-invalidos"); try { const user = await db.user.create({ data: { email, fullName: get(formData, "name") || null, passwordHash: await bcrypt.hash(password, 10) } }); await createSession(user); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect("/auth/sign-up?error=email-existente"); throw error; } redirect("/dashboard"); }
export async function resetPassword() { redirect("/auth/login?message=contate-suporte"); }
export async function updatePassword(formData: FormData) { const password = get(formData, "password"); if (password.length < 8) redirect("/auth/update-password?error=senha-curta"); const { getCurrentUser } = await import("@/lib/auth"); const user = await getCurrentUser(); if (!user) redirect("/auth/login"); await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } } }); const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } }); await createSession(updated); redirect("/dashboard"); }
