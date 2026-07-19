"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, LoaderCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

type FieldKey = "numeroCnj" | "tribunal" | "advogado" | "classe" | "parteAdversa" | "valorCausa" | "proximaAudiencia";

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "numeroCnj", label: "Número do Processo", required: true },
  { key: "tribunal", label: "Tribunal", required: true },
  { key: "advogado", label: "Advogado" },
  { key: "classe", label: "Classe/Assunto" },
  { key: "parteAdversa", label: "Parte Adversa" },
  { key: "valorCausa", label: "Valor da Causa" },
  { key: "proximaAudiencia", label: "Próxima Audiência" },
];

type Preview = { headers: string[]; mapping: Partial<Record<FieldKey, string>>; rows: Record<string, unknown>[]; filename: string };

export default function Content() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview>();
  const [editing, setEditing] = useState<Set<FieldKey>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState<{ imported: number } | null>(null);

  async function previewFile(file: File) {
    setLoading(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Não foi possível ler a planilha.");
    setPreview(data);
    setEditing(new Set());
  }

  async function confirm() {
    if (!preview) return;
    setLoading(true);
    const response = await fetch("/api/import/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Importação não concluída.");
    setDone({ imported: data.imported });
    setPreview(undefined);
  }

  function updateMapping(field: FieldKey, value: string) {
    if (!preview) return;
    setPreview({ ...preview, mapping: { ...preview.mapping, [field]: value || undefined } });
  }

  function toggleEdit(field: FieldKey) {
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[420px] py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
          <CheckCircle2 size={28} />
        </div>
        <h2 className="mb-1.5 mt-4 text-lg font-semibold">Importação concluída!</h2>
        <p className="mb-5 text-[13.5px] text-zinc-500">{done.imported} processos foram adicionados e já estão sendo monitorados.</p>
        <Button onClick={() => router.push("/dashboard")}>Ver processos</Button>
      </div>
    );
  }

  if (!preview) {
    return (
      <div>
        <h1 className="mb-1 text-[22px] font-semibold">Importar Planilha</h1>
        <p className="mb-5 text-[13px] text-zinc-500">Envie sua planilha de processos para começar o monitoramento automático.</p>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) previewFile(file);
          }}
          className={`mb-5 max-w-[560px] cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${dragOver ? "border-accent bg-accent/5" : "border-zinc-300 bg-zinc-50"}`}
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <UploadCloud size={20} />
          </div>
          <div className="mt-3.5 text-[15px] font-semibold">{loading ? "Lendo planilha..." : "Arraste sua planilha aqui"}</div>
          <div className="mt-1 text-[13px] text-zinc-500">ou clique para selecionar um arquivo (.xlsx)</div>
          <Button variant="outline" size="sm" className="mt-4" disabled={loading} onClick={(e) => e.stopPropagation()}>
            {loading && <LoaderCircle className="animate-spin" size={15} />}
            Selecionar arquivo
          </Button>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={loading}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) previewFile(file); }}
          />
        </div>
        <div className="max-w-[560px] rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-[13px] text-zinc-500">
          Colunas esperadas: <strong className="text-zinc-700">Número do Processo</strong>, <strong className="text-zinc-700">Tribunal</strong>. Advogado, Classe/Assunto, Parte Adversa, Valor da Causa e Próxima Audiência são opcionais e mapeados automaticamente quando presentes.
        </div>
        {error && <p className="mt-4 max-w-[560px] rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  const canConfirm = Boolean(preview.mapping.numeroCnj && preview.mapping.tribunal);

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold">Importar Planilha</h1>
      <p className="mb-5 text-[13px] text-zinc-500">Confirme o mapeamento de colunas antes de importar.</p>

      <div className="mb-4 flex max-w-[680px] items-center justify-between rounded-xl border border-zinc-200 p-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-zinc-400" />
          <div>
            <div className="text-sm font-semibold">{preview.filename}</div>
            <div className="mt-0.5 text-[12.5px] text-zinc-500">{preview.rows.length} processos detectados</div>
          </div>
        </div>
        <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
          {canConfirm ? "Pronto para importar" : "Confirme os campos obrigatórios"}
        </span>
      </div>

      <div className="mb-5 flex max-w-[680px] flex-col gap-2 text-[13px]">
        {FIELDS.map((field) => {
          const value = preview.mapping[field.key];
          const isEditing = editing.has(field.key) || (field.required && !value);
          return (
            <div key={field.key} className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <span className="w-52 shrink-0 text-zinc-600">
                    {field.label}
                    {field.required && <span className="text-red-600"> *</span>}
                  </span>
                  <select
                    className="w-56 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[13px]"
                    value={value ?? ""}
                    onChange={(e) => updateMapping(field.key, e.target.value)}
                  >
                    <option value="">Não mapeado</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <CheckCircle2 size={12} />
                  </span>
                  <span>
                    {field.label} → coluna &quot;{value}&quot;
                  </span>
                  <button className="text-xs text-accent hover:underline" onClick={() => toggleEdit(field.key)}>
                    trocar
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-5 max-w-[680px] overflow-auto rounded-xl border border-zinc-200">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {preview.headers.slice(0, 5).map((header) => (
                <th key={header} className="px-3 py-2 text-left font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 5).map((row, index) => (
              <tr key={index} className="border-b border-zinc-100 last:border-0">
                {preview.headers.slice(0, 5).map((header) => (
                  <td key={header} className="max-w-48 truncate px-3 py-2">{String(row[header] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mb-4 max-w-[680px] rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2.5">
        <Button variant="outline" onClick={() => setPreview(undefined)}>Cancelar</Button>
        <Button disabled={loading || !canConfirm} onClick={confirm}>
          {loading && <LoaderCircle className="animate-spin" size={16} />}
          Confirmar Importação
        </Button>
      </div>
    </div>
  );
}
