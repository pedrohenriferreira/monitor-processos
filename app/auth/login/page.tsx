import Link from "next/link";
import { login } from "../actions";
import { AuthFrame, Field } from "@/components/auth/auth-frame";
import { SubmitButton } from "@/components/auth/submit-button";

export default function LoginPage() {
  return (
    <AuthFrame title="Entrar na sua conta" subtitle="Acesse o painel de monitoramento dos seus processos.">
      <form action={login} className="flex flex-col gap-3.5">
        <Field name="email" label="E-mail" type="email" />
        <Field name="password" label="Senha" type="password" />
        <SubmitButton pendingLabel="Entrando..." className="mt-1.5 w-full">Entrar</SubmitButton>
      </form>
      <div className="mt-5 flex justify-between text-[13px]">
        <Link className="text-accent hover:underline" href="/auth/forgot-password">Esqueci minha senha</Link>
        <Link className="text-accent hover:underline" href="/auth/sign-up">Criar conta</Link>
      </div>
    </AuthFrame>
  );
}
