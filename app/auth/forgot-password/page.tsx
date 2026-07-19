import Link from "next/link";
import { AuthFrame, Field } from "@/components/auth/auth-frame";
import { SubmitButton } from "@/components/auth/submit-button";
import { resetPassword } from "../actions";

export default function ForgotPassword() {
  return (
    <AuthFrame title="Recuperar senha" subtitle="Enviaremos um link de redefinição para o seu e-mail.">
      <form action={resetPassword} className="flex flex-col gap-3.5">
        <Field name="email" label="E-mail" type="email" />
        <SubmitButton pendingLabel="Enviando..." className="mt-1.5 w-full">Enviar link</SubmitButton>
      </form>
      <p className="mt-5 text-center text-[13px] text-zinc-500">
        <Link className="font-semibold text-accent hover:underline" href="/auth/login">Voltar para o login</Link>
      </p>
    </AuthFrame>
  );
}
