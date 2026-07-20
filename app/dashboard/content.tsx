"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ExpandedState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronRight, Download, FileUp, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Badge, STATUS_BADGE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency, formatDate, formatDateOnly } from "@/lib/utils";
import { loadColumnOrder, saveColumnOrder } from "@/lib/table-prefs";
import { ColumnsMenu } from "@/components/dashboard/columns-menu";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { applyFilter, type FilterFieldType, type FilterModel } from "@/components/dashboard/table-filters";
import { ProcessDetailSheet } from "@/components/dashboard/process-detail-sheet";
import type { ProcessRow } from "@/components/dashboard/process-types";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];

type FilterField = { type: FilterFieldType; displayName: string; getRaw: (p: ProcessRow) => unknown; options?: { label: string; value: string }[] };

// Mesmo número CNJ pode aparecer em mais de um tribunal quando o processo sobe de instância
// (ex.: tjsp -> stj) — é o mesmo processo, não uma duplicata. Agrupamos por numeroCnj e
// mostramos a instância mais antiga como linha principal, com as demais como "filhas" expansíveis.
type ProcessGroupRow = ProcessRow & { subRows?: ProcessRow[] };

function groupByProcesso(processes: ProcessRow[]): ProcessGroupRow[] {
  const byNumero = new Map<string, ProcessRow[]>();
  for (const p of processes) {
    const list = byNumero.get(p.numeroCnj);
    if (list) list.push(p);
    else byNumero.set(p.numeroCnj, [p]);
  }
  const groups: ProcessGroupRow[] = [];
  for (const list of byNumero.values()) {
    if (list.length === 1) {
      groups.push(list[0]);
      continue;
    }
    const [primary, ...rest] = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    groups.push({ ...primary, subRows: rest });
  }
  return groups;
}

export default function Content({ processes: initial, userId }: { processes: ProcessRow[]; userId: string }) {
  const [processes, setProcesses] = useState(initial);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    advogado: false,
    classe: false,
    parteAdversa: false,
    valorCausa: false,
    proximaAudiencia: false,
  });
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [detailRow, setDetailRow] = useState<ProcessRow | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const groupedProcesses = useMemo(() => groupByProcesso(processes), [processes]);

  // Column order is a per-device UI preference — persists across logout/reload/close since it
  // lives in localStorage, not the session. Loaded after mount to avoid an SSR/client mismatch.
  useEffect(() => {
    const saved = loadColumnOrder(userId);
    if (saved?.length) setColumnOrder(saved);
  }, [userId]);

  useEffect(() => {
    if (columnOrder.length) saveColumnOrder(userId, columnOrder);
  }, [columnOrder, userId]);

  const removeRows = useCallback(async (ids: string[]) => {
    if (!window.confirm(`Remover ${ids.length} processo(s)? Esta ação não pode ser desfeita.`)) return;
    const response = await fetch("/api/processes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    if (!response.ok) { toast.error("Não foi possível remover os processos."); return; }
    setProcesses((prev) => prev.filter((p) => !ids.includes(p.id)));
    setRowSelection({});
    toast.success(`${ids.length} processo(s) removido(s).`);
  }, []);

  // Counts back which optional columns are offered at all — only "mapped"/populated ones.
  const columnCounts = useMemo(
    () => ({
      numeroCnj: processes.length,
      tribunal: processes.length,
      ultimoAndamento: processes.filter((p) => p.lastEventName).length,
      classe: processes.filter((p) => p.classe).length,
      parteAdversa: processes.filter((p) => p.parteAdversa).length,
      advogado: processes.filter((p) => p.advogado).length,
      valorCausa: processes.filter((p) => p.valorCausa != null).length,
      proximaAudiencia: processes.filter((p) => p.proximaAudiencia).length,
    }),
    [processes]
  );

  const tribunalOptions = useMemo(
    () => Array.from(new Set(processes.map((p) => p.tribunal))).sort().map((t) => ({ label: t.toUpperCase(), value: t })),
    [processes]
  );

  // Each filterable column declares its type + how to read a comparable raw value from a row —
  // the generic applyFilter() interpreter (table-filters.ts) owns all operator semantics.
  const filterFields = useMemo<Record<string, FilterField>>(
    () => ({
      numeroCnj: { type: "text", displayName: "Número", getRaw: (p) => p.numeroCnj },
      tribunal: { type: "option", displayName: "Tribunal", getRaw: (p) => p.tribunal, options: tribunalOptions },
      ultimoAndamento: { type: "text", displayName: "Último Andamento", getRaw: (p) => p.lastEventName ?? "" },
      classe: { type: "text", displayName: "Classe/Assunto", getRaw: (p) => p.classe ?? "" },
      parteAdversa: { type: "text", displayName: "Parte Adversa", getRaw: (p) => p.parteAdversa ?? "" },
      advogado: { type: "text", displayName: "Advogado", getRaw: (p) => p.advogado ?? "" },
      valorCausa: { type: "number", displayName: "Valor da Causa", getRaw: (p) => p.valorCausa },
      proximaAudiencia: { type: "date", displayName: "Próxima Audiência", getRaw: (p) => p.proximaAudiencia },
    }),
    [tribunalOptions]
  );

  const makeFilterFn = useCallback(
    (id: string) => (row: { original: ProcessGroupRow }, _columnId: string, filterValue: FilterModel) => {
      const field = filterFields[id];
      return applyFilter(field.type, field.getRaw(row.original), filterValue);
    },
    [filterFields]
  );

  const columns = useMemo<ColumnDef<ProcessGroupRow>[]>(() => {
    const cols: ColumnDef<ProcessGroupRow>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={(e) => e.stopPropagation()} />
        ),
        enableHiding: false,
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: "numeroCnj",
        header: "Número",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5" style={{ paddingLeft: row.depth * 20 }}>
            {row.depth > 0 && <span className="text-zinc-300">└</span>}
            {row.getCanExpand() && (
              <button
                className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-800"
                onClick={(e) => { e.stopPropagation(); row.getToggleExpandedHandler()(); }}
              >
                <ChevronRight size={13} className={cn("transition-transform", row.getIsExpanded() && "rotate-90")} />
              </button>
            )}
            <span className={cn("font-mono text-xs", row.depth > 0 && "text-zinc-400")}>{row.original.numeroCnj}</span>
            {row.getCanExpand() && !row.getIsExpanded() && (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-500">
                +{row.subRows.length} instância{row.subRows.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
        ),
        filterFn: makeFilterFn("numeroCnj"),
        meta: filterFields.numeroCnj,
      },
      {
        accessorKey: "tribunal",
        header: "Tribunal",
        cell: ({ row }) => <Badge variant="tribunal" className="uppercase">{row.original.tribunal}</Badge>,
        filterFn: makeFilterFn("tribunal"),
        meta: filterFields.tribunal,
      },
      {
        id: "ultimoAndamento",
        accessorFn: (row) => row.lastEventAt ?? "",
        header: "Último Andamento",
        filterFn: makeFilterFn("ultimoAndamento"),
        meta: filterFields.ultimoAndamento,
        cell: ({ row }) => {
          const status = STATUS_BADGE[row.original.status];
          return (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={status.variant}>{status.label}</Badge>
                <span className="text-[12.5px]">{row.original.lastEventName ?? "Ainda não consultado"}</span>
              </div>
              <span className="text-[11.5px] text-zinc-400">{formatDate(row.original.lastEventAt)}</span>
            </div>
          );
        },
      },
    ];

    if (columnCounts.classe > 0) {
      cols.push({ accessorKey: "classe", header: "Classe/Assunto", filterFn: makeFilterFn("classe"), meta: filterFields.classe, cell: ({ row }) => row.original.classe || "—" });
    }
    if (columnCounts.parteAdversa > 0) {
      cols.push({ accessorKey: "parteAdversa", header: "Parte Adversa", filterFn: makeFilterFn("parteAdversa"), meta: filterFields.parteAdversa, cell: ({ row }) => row.original.parteAdversa || "—" });
    }
    if (columnCounts.advogado > 0) {
      cols.push({ accessorKey: "advogado", header: "Advogado", filterFn: makeFilterFn("advogado"), meta: filterFields.advogado, cell: ({ row }) => row.original.advogado || "—" });
    }
    if (columnCounts.valorCausa > 0) {
      cols.push({ accessorKey: "valorCausa", header: "Valor da Causa", filterFn: makeFilterFn("valorCausa"), meta: filterFields.valorCausa, cell: ({ row }) => formatCurrency(row.original.valorCausa) });
    }
    if (columnCounts.proximaAudiencia > 0) {
      cols.push({
        accessorKey: "proximaAudiencia",
        header: "Próxima Audiência",
        filterFn: makeFilterFn("proximaAudiencia"),
        meta: filterFields.proximaAudiencia,
        cell: ({ row }) => <span className="text-zinc-500">{formatDateOnly(row.original.proximaAudiencia)}</span>,
      });
    }

    cols.push({
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1 text-xs">
          <button className="px-2 py-1 text-zinc-600 hover:underline" onClick={(e) => { e.stopPropagation(); setDetailRow(row.original); }}>Ver</button>
          <button className="px-2 py-1 text-red-700 hover:underline" onClick={(e) => { e.stopPropagation(); removeRows([row.original.id]); }}>Remover</button>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: false,
    });

    return cols;
  }, [removeRows, columnCounts, filterFields, makeFilterFn]);

  const filterableIds = useMemo(
    () => ["numeroCnj", "tribunal", "ultimoAndamento", "classe", "parteAdversa", "advogado", "valorCausa", "proximaAudiencia"].filter((id) => columnCounts[id as keyof typeof columnCounts] > 0),
    [columnCounts]
  );

  const table = useReactTable({
    data: groupedProcesses,
    columns,
    state: { sorting, columnFilters, rowSelection, columnVisibility, columnOrder, pagination, expanded },
    initialState: { columnPinning: { left: ["select", "numeroCnj"], right: ["actions"] } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getRowId: (row) => row.id,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    filterFromLeafRows: true,
  });

  const centerIds = table.getCenterLeafColumns().map((c) => c.id);

  function handleColumnDrop(targetId: string) {
    if (!draggedColumnId || draggedColumnId === targetId) return;
    const from = centerIds.indexOf(draggedColumnId);
    const to = centerIds.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...centerIds];
    next.splice(from, 1);
    next.splice(to, 0, draggedColumnId);
    setColumnOrder(next);
    setDraggedColumnId(null);
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold">Processos Monitorados</h1>
          <p className="text-[13px] text-zinc-500">{groupedProcesses.length} processos • atualizado automaticamente</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar table={table} filterableIds={filterableIds} />
          <ColumnsMenu table={table} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/import"><FileUp size={15} />Importar</Link>
          </Button>
          <Button size="sm" onClick={() => { window.location.href = "/api/export"; }}>
            <Download size={15} />Exportar
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-100 px-3.5 py-2 text-[13px]">
          <span>{selectedIds.length} selecionado(s)</span>
          <div className="flex gap-3.5">
            <button className="font-medium hover:underline" onClick={() => { window.location.href = `/api/export?ids=${selectedIds.join(",")}`; }}>
              Exportar selecionados
            </button>
            <button className="font-medium text-red-700 hover:underline" onClick={() => removeRows(selectedIds)}>
              Remover
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const pinned = header.column.getIsPinned();
                const draggable = !pinned;
                const isActions = header.column.id === "actions";
                return (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    draggable={draggable}
                    onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = "move"; setDraggedColumnId(header.column.id); } : undefined}
                    onDragOver={draggable ? (e) => e.preventDefault() : undefined}
                    onDrop={draggable ? (e) => { e.preventDefault(); handleColumnDrop(header.column.id); } : undefined}
                    onDragEnd={draggable ? () => setDraggedColumnId(null) : undefined}
                    className={cn(header.column.getCanSort() && "cursor-pointer select-none", draggable && "cursor-grab active:cursor-grabbing", isActions && "text-right")}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {draggable && <GripVertical size={12} className="shrink-0 text-zinc-300" />}
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ArrowUp size={12} />}
                        {header.column.getIsSorted() === "desc" && <ArrowDown size={12} />}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn("cursor-pointer hover:bg-zinc-50", row.depth > 0 && "bg-zinc-50/60")}
                onClick={() => (row.getCanExpand() ? row.getToggleExpandedHandler()() : setDetailRow(row.original))}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-11 text-center text-zinc-400">
                Nenhum processo encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-zinc-500">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            Mostrando {table.getRowModel().rows.filter((row) => row.depth === 0).length} de {totalRows} processos
          </span>
          <label className="flex items-center gap-1.5">
            <span>Itens por página</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-[13px]"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Próxima
          </Button>
        </div>
      </div>

      <ProcessDetailSheet process={detailRow} onOpenChange={(open) => !open && setDetailRow(null)} />
    </div>
  );
}
