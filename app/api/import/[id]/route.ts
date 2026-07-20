import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const importRecord = await db.import.findFirst({
    where: { id, userId: user.id },
    select: {
      status: true,
      filename: true,
      totalRows: true,
      processedRows: true,
      importedRows: true,
      rejectedRows: true,
      rejectedDetails: true,
      errorMessage: true,
    },
  });
  if (!importRecord) return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
  return NextResponse.json(importRecord);
}
