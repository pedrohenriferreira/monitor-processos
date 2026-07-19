"use client";
import { useState } from "react";
import type { Column } from "@tanstack/react-table";
import { ChevronLeft, ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OPERATORS_BY_TYPE, formatFilterLabel, type FilterModel, type FilterOperator, type OperatorSpec } from "./table-filters";
import type { ProcessRow } from "./process-types";

type Col = Column<ProcessRow, unknown>;

export function FilterBar({ table, filterableIds }: { table: import("@tanstack/react-table").Table<ProcessRow>; filterableIds: string[] }) {
  const columns = filterableIds.map((id) => table.getColumn(id)).filter((c): c is Col => Boolean(c));
  const active = columns.filter((c) => Boolean(c.getFilterValue()));
  const available = columns.filter((c) => !c.getFilterValue());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterAdder columns={available} />
      {active.map((column) => (
        <ActiveFilterChip key={column.id} column={column} />
      ))}
      {active.length > 0 && (
        <button
          type="button"
          className="text-[12.5px] font-medium text-zinc-500 hover:text-red-700"
          onClick={() => active.forEach((c) => c.setFilterValue(undefined))}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function FilterAdder({ columns }: { columns: Col[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Col | null>(null);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSelected(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListFilter size={14} />
          Filtrar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()}>
        {!selected ? (
          columns.length ? (
            <div className="flex flex-col gap-0.5 p-1">
              {columns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className="rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-zinc-100"
                  onClick={() => setSelected(column)}
                >
                  {column.columnDef.meta?.displayName ?? column.id}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-[13px] text-zinc-400">Todas as colunas já têm um filtro.</div>
          )
        ) : (
          <FilterEditor
            column={selected}
            onBack={() => setSelected(null)}
            onApply={() => {
              setOpen(false);
              setSelected(null);
            }}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActiveFilterChip({ column }: { column: Col }) {
  const meta = column.columnDef.meta;
  if (!meta) return null;
  const value = column.getFilterValue() as FilterModel | undefined;
  const label = formatFilterLabel(meta, value);

  return (
    <div className="flex items-center rounded-full border border-accent/30 bg-accent/10 text-[12.5px] font-medium text-accent">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="max-w-[220px] truncate px-2.5 py-1 hover:underline">
            {label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64" collisionPadding={12} onCloseAutoFocus={(e) => e.preventDefault()}>
          <FilterEditor column={column} onApply={() => {}} />
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button" className="mr-1.5 rounded-full p-0.5 hover:bg-accent/20" onClick={() => column.setFilterValue(undefined)}>
        <X size={12} />
      </button>
    </div>
  );
}

function FilterEditor({ column, onBack, onApply }: { column: Col; onBack?: () => void; onApply: () => void }) {
  const meta = column.columnDef.meta;
  const existing = column.getFilterValue() as FilterModel | undefined;
  const operators = meta ? OPERATORS_BY_TYPE[meta.type] : [];
  const [operator, setOperator] = useState<FilterOperator>(existing?.operator ?? operators[0]?.value ?? "contains");
  const [values, setValues] = useState<(string | number)[]>(existing?.values ?? []);

  if (!meta) return null;
  const spec = operators.find((o) => o.value === operator) ?? operators[0];

  function apply() {
    const filled = values.filter((v) => v !== "" && v !== undefined && v !== null);
    if (spec.valueCount > 0 && filled.length < spec.valueCount) return;
    if (spec.valueCount === -1 && filled.length === 0) return;
    column.setFilterValue({ operator, values } satisfies FilterModel);
    onApply();
  }

  return (
    <div className="flex flex-col gap-2.5 p-2.5">
      <div className="flex items-center gap-1.5">
        {onBack && (
          <button type="button" onClick={onBack} className="text-zinc-400 hover:text-zinc-700">
            <ChevronLeft size={14} />
          </button>
        )}
        <span className="text-[12.5px] font-semibold text-zinc-700">{meta.displayName}</span>
      </div>

      <select
        value={operator}
        onChange={(e) => {
          setOperator(e.target.value as FilterOperator);
          setValues([]);
        }}
        className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[13px]"
      >
        {operators.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {spec.valueCount !== 0 && <FilterValueInput type={meta.type} options={meta.options} spec={spec} values={values} onChange={setValues} />}

      <Button size="sm" onClick={apply}>
        {existing ? "Atualizar filtro" : "Aplicar filtro"}
      </Button>
    </div>
  );
}

function FilterValueInput({
  type,
  options,
  spec,
  values,
  onChange,
}: {
  type: "text" | "number" | "date" | "option";
  options?: { label: string; value: string }[];
  spec: OperatorSpec;
  values: (string | number)[];
  onChange: (values: (string | number)[]) => void;
}) {
  if (type === "option") {
    const isSingle = spec.valueCount === 1;
    return (
      <div className="flex max-h-40 flex-col gap-0.5 overflow-auto">
        {(options ?? []).map((opt) => {
          const checked = values.map(String).includes(opt.value);
          return (
            <label key={opt.value} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-zinc-100">
              <input
                type={isSingle ? "radio" : "checkbox"}
                name="filter-option"
                checked={checked}
                onChange={() => {
                  if (isSingle) onChange([opt.value]);
                  else onChange(checked ? values.filter((v) => String(v) !== opt.value) : [...values, opt.value]);
                }}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    );
  }

  const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
  if (spec.valueCount === 2) {
    return (
      <div className="flex items-center gap-2">
        <Input type={inputType} placeholder="De" value={values[0] ?? ""} onChange={(e) => onChange([e.target.value, values[1] ?? ""])} className="h-8 text-[13px]" />
        <span className="text-zinc-400">–</span>
        <Input type={inputType} placeholder="Até" value={values[1] ?? ""} onChange={(e) => onChange([values[0] ?? "", e.target.value])} className="h-8 text-[13px]" />
      </div>
    );
  }

  return (
    <Input
      type={inputType}
      placeholder="Valor..."
      value={values[0] ?? ""}
      onChange={(e) => onChange([e.target.value])}
      className="h-8 text-[13px]"
    />
  );
}
