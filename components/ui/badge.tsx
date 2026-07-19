import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold", {
  variants: {
    variant: {
      novo: "border-blue-200 bg-blue-50 text-blue-700",
      aguardando: "border-amber-200 bg-amber-50 text-amber-700",
      urgente: "border-red-200 bg-red-50 text-red-700",
      concluido: "border-green-200 bg-green-50 text-green-700",
      tribunal: "border-zinc-200 bg-zinc-100 text-zinc-700 font-medium",
    },
  },
  defaultVariants: { variant: "tribunal" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export const STATUS_BADGE: Record<string, { variant: "novo" | "aguardando" | "urgente" | "concluido"; label: string }> = {
  PENDING: { variant: "aguardando", label: "Aguardando" },
  NOT_FOUND: { variant: "aguardando", label: "Não encontrado" },
  NEW_EVENT: { variant: "novo", label: "Novo andamento" },
  ERROR: { variant: "urgente", label: "Erro na consulta" },
  OK: { variant: "concluido", label: "Sem alteração" },
};
