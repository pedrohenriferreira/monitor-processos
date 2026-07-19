import type { RowData } from "@tanstack/react-table";

export type FilterFieldType = "text" | "number" | "date" | "option";

export type FilterOperator =
  | "contains"
  | "doesNotContain"
  | "isEmpty"
  | "isNotEmpty"
  | "is"
  | "isGreaterThan"
  | "isLessThan"
  | "isBefore"
  | "isAfter"
  | "isBetween"
  | "isAnyOf"
  | "isNoneOf";

export type FilterModel = { operator: FilterOperator; values: (string | number)[] };

export type FilterOption = { label: string; value: string };

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    displayName: string;
    type: FilterFieldType;
    options?: FilterOption[];
  }
}

export type OperatorSpec = { value: FilterOperator; label: string; valueCount: 0 | 1 | 2 | -1 };

// -1 means "one or more" (multi-select), matching the user-facing operator names below.
export const OPERATORS_BY_TYPE: Record<FilterFieldType, OperatorSpec[]> = {
  text: [
    { value: "contains", label: "contém", valueCount: 1 },
    { value: "doesNotContain", label: "não contém", valueCount: 1 },
    { value: "isEmpty", label: "está vazio", valueCount: 0 },
    { value: "isNotEmpty", label: "não está vazio", valueCount: 0 },
  ],
  number: [
    { value: "is", label: "é igual a", valueCount: 1 },
    { value: "isGreaterThan", label: "é maior que", valueCount: 1 },
    { value: "isLessThan", label: "é menor que", valueCount: 1 },
    { value: "isBetween", label: "está entre", valueCount: 2 },
  ],
  date: [
    { value: "is", label: "é", valueCount: 1 },
    { value: "isBefore", label: "é antes de", valueCount: 1 },
    { value: "isAfter", label: "é depois de", valueCount: 1 },
    { value: "isBetween", label: "está entre", valueCount: 2 },
  ],
  option: [
    { value: "is", label: "é", valueCount: 1 },
    { value: "isAnyOf", label: "é qualquer um de", valueCount: -1 },
    { value: "isNoneOf", label: "não é nenhum de", valueCount: -1 },
    { value: "isEmpty", label: "está vazio", valueCount: 0 },
  ],
};

function isBlank(raw: unknown) {
  return raw === null || raw === undefined || raw === "";
}

function startOfDay(value: string | number) {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Single generic interpreter shared by every filterable column — each column only supplies
// its type (via meta) and a raw-value getter; this function owns all operator semantics.
export function applyFilter(type: FilterFieldType, raw: unknown, filter?: FilterModel): boolean {
  if (!filter || !filter.operator) return true;
  const { operator, values } = filter;

  if (operator === "isEmpty") return isBlank(raw);
  if (operator === "isNotEmpty") return !isBlank(raw);
  if (isBlank(raw)) return false;

  switch (type) {
    case "text": {
      const text = String(raw).toLowerCase();
      const q = String(values[0] ?? "").toLowerCase();
      if (!q) return true;
      return operator === "doesNotContain" ? !text.includes(q) : text.includes(q);
    }
    case "number": {
      const n = Number(raw);
      const a = Number(values[0]);
      if (Number.isNaN(n)) return false;
      if (operator === "isGreaterThan") return n > a;
      if (operator === "isLessThan") return n < a;
      if (operator === "isBetween") return n >= Math.min(a, Number(values[1] ?? a)) && n <= Math.max(a, Number(values[1] ?? a));
      return n === a;
    }
    case "date": {
      const d = startOfDay(String(raw));
      if (operator === "isBefore") return d < startOfDay(String(values[0]));
      if (operator === "isAfter") return d > startOfDay(String(values[0]));
      if (operator === "isBetween") {
        const from = startOfDay(String(values[0]));
        const to = startOfDay(String(values[1] ?? values[0]));
        return d >= Math.min(from, to) && d <= Math.max(from, to);
      }
      return d === startOfDay(String(values[0]));
    }
    case "option": {
      const v = String(raw);
      const selected = values.map(String);
      if (operator === "isAnyOf") return selected.includes(v);
      if (operator === "isNoneOf") return !selected.includes(v);
      return selected[0] === v;
    }
    default:
      return true;
  }
}

export function formatFilterLabel(meta: { displayName: string; type: FilterFieldType; options?: FilterOption[] }, filter?: FilterModel): string {
  if (!filter) return meta.displayName;
  const spec = OPERATORS_BY_TYPE[meta.type].find((o) => o.value === filter.operator);
  if (!spec) return meta.displayName;
  if (spec.valueCount === 0) return `${meta.displayName} ${spec.label}`;
  if (meta.type === "option") {
    const labels = filter.values.map((v) => meta.options?.find((o) => o.value === v)?.label ?? String(v));
    return `${meta.displayName}: ${labels.join(", ")}`;
  }
  if (spec.valueCount === 2) return `${meta.displayName} ${spec.label} ${filter.values[0]} e ${filter.values[1]}`;
  return `${meta.displayName} ${spec.label} "${filter.values[0]}"`;
}
