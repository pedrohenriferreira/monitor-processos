import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { detectMapping } from "@/lib/processes";

export const runtime = "nodejs";

const PREVIEW_SAMPLE_SIZE = 10;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size > 5_000_000) {
    return NextResponse.json({ error: "Envie um arquivo .xlsx de até 5 MB." }, { status: 400 });
  }

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) throw new Error("Planilha vazia.");
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
    if (!rows.length || rows.length > 2000) throw new Error("A planilha deve conter entre 1 e 2.000 linhas.");
    const headers = Object.keys(rows[0]);

    // As linhas completas ficam guardadas no servidor (rawRows) em vez de irem e voltarem
    // pelo cliente — o navegador só precisa de uma amostra pra exibir a pré-visualização.
    const importRecord = await db.import.create({
      data: { userId: user.id, filename: file.name, totalRows: rows.length, rawRows: rows as unknown as Prisma.InputJsonValue, status: "PREVIEW" },
    });

    return NextResponse.json({
      importId: importRecord.id,
      headers,
      mapping: detectMapping(headers),
      rowsSample: rows.slice(0, PREVIEW_SAMPLE_SIZE),
      totalRows: rows.length,
      filename: file.name,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Arquivo inválido." }, { status: 400 });
  }
}
