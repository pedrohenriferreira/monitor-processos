export type ProcessRow = {
  id: string;
  numeroCnj: string;
  tribunal: string;
  createdAt: string;
  advogado: string | null;
  classe: string | null;
  parteAdversa: string | null;
  valorCausa: number | null;
  proximaAudiencia: string | null;
  lastEventName: string | null;
  lastEventAt: string | null;
  lastCheckedAt: string | null;
  status: "PENDING" | "OK" | "NEW_EVENT" | "NOT_FOUND" | "ERROR";
};
