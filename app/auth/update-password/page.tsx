import { AuthFrame, Field } from "@/components/auth/auth-frame";
import { SubmitButton } from "@/components/auth/submit-button";
import { updatePassword } from "../actions";

export default function UpdatePassword() {
  return (
    <AuthFrame title="Definir nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <form action={updatePassword} className="flex flex-col gap-3.5">
        <Field name="password" label="Nova senha" type="password" />
        <SubmitButton pendingLabel="Atualizando..." className="mt-1.5 w-full">Atualizar senha</SubmitButton>
      </form>
    </AuthFrame>
  );
}
