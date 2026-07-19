export interface Movimento { codigo: number; nome: string; dataHora: string; complementosTabelados?: { nome: string; descricao: string }[]; }

export async function consultarProcesso(numeroProcesso: string, tribunal: string): Promise<Movimento[]> {
  const key = process.env.DATAJUD_API_KEY;
  if (!key) throw new Error("DATAJUD_API_KEY não configurada.");
  const response = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.toLowerCase()}/_search`, { method: "POST", headers: { Authorization: `APIKey ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: { match: { numeroProcesso: numeroProcesso.replace(/\D/g, "") } }, size: 1 }) });
  if (!response.ok) throw new Error(`DataJud ${response.status}: ${await response.text()}`);
  const data = await response.json(); const moves = data?.hits?.hits?.[0]?._source?.movimentos as Movimento[] | undefined;
  return moves ? [...moves].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()) : [];
}

export function isNewerMovement(movement: Movimento, current: string | null) { return !current || new Date(movement.dataHora).getTime() > new Date(current).getTime(); }
