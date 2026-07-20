export const PROCESS_COLUMNS = {
  numeroCnj: ["numero", "numero processo", "número", "número processo", "processo", "cnj"],
  tribunal: ["tribunal", "tribunal codigo", "tribunal código", "foro"],
  advogado: ["advogado", "responsavel", "responsável", "procurador"],
  classe: ["classe", "assunto", "classe assunto", "classe/assunto"],
  parteAdversa: ["parte adversa", "parte contraria", "parte contrária", "reu", "réu", "requerido"],
  valorCausa: ["valor da causa", "valor causa", "valor"],
  proximaAudiencia: ["proxima audiencia", "próxima audiência", "audiencia", "audiência", "data da audiencia", "data audiencia"],
} as const;

export type ImportRow = {
  numeroCnj: string;
  tribunal: string;
  advogado: string | null;
  classe: string | null;
  parteAdversa: string | null;
  valorCausa: number | null;
  proximaAudiencia: string | null;
  rowNumber: number;
};
export type ColumnMapping = {
  numeroCnj: string;
  tribunal: string;
  advogado?: string;
  classe?: string;
  parteAdversa?: string;
  valorCausa?: string;
  proximaAudiencia?: string;
};

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeCnj(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 20 ? digits : null;
}

export function normalizeTribunal(value: unknown) {
  const tribunal = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^[a-z0-9]+$/.test(tribunal) ? tribunal : null;
}

export function normalizeCurrency(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  const normalized = hasComma ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const [, d, m, yRaw] = brMatch;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function detectMapping(headers: string[]): Partial<ColumnMapping> {
  const normalized = headers.map(normalizeHeader);
  const find = (choices: readonly string[]) => headers[normalized.findIndex((header) => choices.includes(header))];
  return {
    numeroCnj: find(PROCESS_COLUMNS.numeroCnj),
    tribunal: find(PROCESS_COLUMNS.tribunal),
    advogado: find(PROCESS_COLUMNS.advogado),
    classe: find(PROCESS_COLUMNS.classe),
    parteAdversa: find(PROCESS_COLUMNS.parteAdversa),
    valorCausa: find(PROCESS_COLUMNS.valorCausa),
    proximaAudiencia: find(PROCESS_COLUMNS.proximaAudiencia),
  };
}

function isBlankRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

export function validateRows(rows: Record<string, unknown>[], mapping: ColumnMapping) {
  const valid: ImportRow[] = [];
  const rejected: { rowNumber: number; reason: string }[] = [];
  rows.forEach((row, index) => {
    // Linha completamente em branco (comum no fim de planilhas exportadas de outros sistemas) —
    // ignora silenciosamente, não é um processo nem um erro.
    if (isBlankRow(row)) return;
    const numeroCnj = normalizeCnj(row[mapping.numeroCnj]);
    const tribunal = normalizeTribunal(row[mapping.tribunal]);
    if (!numeroCnj || !tribunal) {
      rejected.push({ rowNumber: index + 2, reason: !numeroCnj ? "Número CNJ deve ter 20 dígitos." : "Tribunal inválido." });
      return;
    }
    valid.push({
      numeroCnj,
      tribunal,
      advogado: mapping.advogado ? String(row[mapping.advogado] ?? "").trim() || null : null,
      classe: mapping.classe ? String(row[mapping.classe] ?? "").trim() || null : null,
      parteAdversa: mapping.parteAdversa ? String(row[mapping.parteAdversa] ?? "").trim() || null : null,
      valorCausa: mapping.valorCausa ? normalizeCurrency(row[mapping.valorCausa]) : null,
      proximaAudiencia: mapping.proximaAudiencia ? normalizeDate(row[mapping.proximaAudiencia]) : null,
      rowNumber: index + 2,
    });
  });
  return { valid, rejected };
}
