"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, LoaderCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";
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

const POLL_INTERVAL_MS = 1000;
const MAX_REJECTED_SHOWN = 50;

type Preview = {
  importId: string;
  headers: string[];
  mapping: Partial<Record<FieldKey, string>>;
  rowsSample: Record<string, unknown>[];
  totalRows: number;
  filename: string;
};

type RejectedDetail = { rowNumber: number; reason: string };

type Progress = {
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  processedRows: number;
  importedRows: number;
  rejectedRows: number;
  rejectedDetails: RejectedDetail[] | null;
  errorMessage: string | null;
};

export default function Content() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview>();
  const [editing, setEditing] = useState<Set<FieldKey>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importId, setImportId] = useState<string>();
  const [progress, setProgress] = useState<Progress>();

  // Enquanto a importação estiver em processamento, consulta o status a cada segundo
  // para atualizar a barra de progresso — mesmo padrão de polling usado na conexão do Telegram.
  useEffect(() => {
    if (!importId || progress?.status !== "PROCESSING") return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/import/${importId}`);
        if (!response.ok) return;
        setProgress(await response.json());
      } catch {
        // instabilidade de rede pontual — tenta de novo no próximo tick
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [importId, progress?.status]);

  async function previewFile(file: File) {
    setLoading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/import/preview", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível ler a planilha.");
        return;
      }
      setPreview(data);
      setEditing(new Set());
    } catch {
      toast.error("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: preview.importId, mapping: preview.mapping }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Importação não concluída.");
        return;
      }
      setImportId(data.importId);
      setProgress({
        status: "PROCESSING",
        totalRows: preview.totalRows,
        processedRows: 0,
        importedRows: data.importedRows,
        rejectedRows: data.rejectedRows,
        rejectedDetails: null,
        errorMessage: null,
      });
      setPreview(undefined);
    } catch {
      toast.error("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function resetImport() {
    setPreview(undefined);
    setImportId(undefined);
    setProgress(undefined);
    setError("");
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

  if (progress) {
    // O denominador é importedRows (quantas linhas realmente entram na escrita), não totalRows —
    // linhas rejeitadas na validação nunca chegam a ser processadas, então usar totalRows faria a
    // barra travar antes de 100% sempre que houver alguma linha rejeitada.
    const toProcess = progress.importedRows;
    const percent = toProcess ? Math.min(100, Math.round((progress.processedRows / toProcess) * 100)) : 100;

    if (progress.status === "PROCESSING") {
      return (
        <div className="mx-auto max-w-[420px] py-14 text-center">
          <LoaderCircle className="mx-auto animate-spin text-accent" size={28} />
          <h2 className="mb-1.5 mt-4 text-lg font-semibold">Importando processos...</h2>
          <p className="mb-5 text-[13.5px] text-zinc-500">
            {progress.processedRows} de {toProcess} processados
          </p>
          <div className="mx-auto h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>
      );
    }

    const rejectedList = progress.rejectedDetails ?? [];
    return (
      <div className="mx-auto max-w-[560px] py-10 text-center">
        {progress.status === "COMPLETED" ? (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
            <CheckCircle2 size={28} />
          </div>
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
            <AlertTriangle size={28} />
          </div>
        )}
        <h2 className="mb-1.5 mt-4 text-lg font-semibold">
          {progress.status === "COMPLETED" ? "Importação concluída!" : "A importação parou no meio"}
        </h2>
        <p className="mb-5 text-[13.5px] text-zinc-500">
          {progress.status === "COMPLETED"
            ? `${progress.importedRows} de ${progress.totalRows} processos foram adicionados e já estão sendo monitorados.`
            : `${progress.processedRows} de ${progress.totalRows} processos chegaram a ser salvos antes da falha. ${progress.errorMessage ?? "Tente novamente em instantes."}`}
        </p>

        {rejectedList.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-[13px]">
            <div className="mb-2 font-semibold text-amber-800">
              {rejectedList.length} {rejectedList.length === 1 ? "linha não foi importada" : "linhas não foram importadas"}
            </div>
            <ul className="max-h-48 space-y-1 overflow-auto text-amber-700">
              {rejectedList.slice(0, MAX_REJECTED_SHOWN).map((item) => (
                <li key={item.rowNumber}>
                  Linha {item.rowNumber}: {item.reason}
                </li>
              ))}
            </ul>
            {rejectedList.length > MAX_REJECTED_SHOWN && (
              <div className="mt-2 text-amber-600">+{rejectedList.length - MAX_REJECTED_SHOWN} outras linhas</div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-2.5">
          {progress.status === "FAILED" && (
            <Button variant="outline" onClick={resetImport}>
              Tentar novamente
            </Button>
          )}
          <Button onClick={() => router.push("/dashboard")}>Ver processos</Button>
        </div>
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
            <div className="mt-0.5 text-[12.5px] text-zinc-500">{preview.totalRows} processos detectados</div>
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
            {preview.rowsSample.slice(0, 5).map((row, index) => (
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
