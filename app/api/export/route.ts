import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean);
  const processes = await db.process.findMany({
    where: { userId: user.id, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      numeroCnj: true,
      tribunal: true,
      advogado: true,
      classe: true,
      parteAdversa: true,
      valorCausa: true,
      proximaAudiencia: true,
      lastEventName: true,
      lastEventAt: true,
      lastCheckedAt: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const worksheet = XLSX.utils.json_to_sheet(
    processes.map((p) => ({
      "Número do processo": p.numeroCnj,
      Tribunal: p.tribunal,
      Advogado: p.advogado,
      "Classe/Assunto": p.classe,
      "Parte adversa": p.parteAdversa,
      "Valor da causa": p.valorCausa ? Number(p.valorCausa) : null,
      "Próxima audiência": p.proximaAudiencia,
      "Última movimentação": p.lastEventName,
      "Data da movimentação": p.lastEventAt,
      "Última verificação": p.lastCheckedAt,
      Status: p.status,
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");
  const content = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="processos-atualizados.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
