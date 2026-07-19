import Link from "next/link";
import { AuthFrame, Field } from "@/components/auth/auth-frame";
import { SubmitButton } from "@/components/auth/submit-button";
import { signUp } from "../actions";

export default function SignUpPage() {
  return (
    <AuthFrame title="Criar sua conta" subtitle="Comece a monitorar seus processos automaticamente.">
      <form action={signUp} className="flex flex-col gap-3.5">
        <Field name="name" label="Nome completo" type="text" />
        <Field name="email" label="E-mail" type="email" />
        <Field name="password" label="Senha" type="password" />
        <SubmitButton pendingLabel="Criando conta..." className="mt-1.5 w-full">Criar conta</SubmitButton>
      </form>
      <p className="mt-5 text-center text-[13px] text-zinc-500">
        Já tem conta? <Link className="font-semibold text-accent hover:underline" href="/auth/login">Entrar</Link>
      </p>
    </AuthFrame>
  );
}
