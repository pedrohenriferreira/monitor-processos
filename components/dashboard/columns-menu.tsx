"use client";
import type { Table } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ProcessRow } from "./process-types";

const LABELS: Record<string, string> = {
  numeroCnj: "Número do Processo",
  tribunal: "Tribunal",
  ultimoAndamento: "Último Andamento",
  classe: "Classe/Assunto",
  parteAdversa: "Parte Adversa",
  advogado: "Advogado Responsável",
  valorCausa: "Valor da Causa",
  proximaAudiencia: "Próxima Audiência",
};

export function ColumnsMenu({ table }: { table: Table<ProcessRow> }) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          Colunas <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
          >
            {LABELS[column.id] ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
