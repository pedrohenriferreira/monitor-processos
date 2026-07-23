import { tribunalAliasFromCnj } from "./tribunal";

export interface Movimento { codigo: number; nome: string; dataHora: string; complementosTabelados?: { nome: string; descricao: string }[]; }

export async function consultarProcesso(numeroProcesso: string, tribunal: string): Promise<Movimento[]> {
  const key = process.env.DATAJUD_API_KEY;
  if (!key) throw new Error("DATAJUD_API_KEY não configurada.");
  // O número CNJ já embute o tribunal correto (dígitos 14-16, padrão Resolução 65/2008) —
  // é uma fonte muito mais confiável que a coluna "Tribunal" da planilha, que em geral traz
  // a vara/órgão julgador em texto livre e não bate com o alias exigido pela DataJud.
  const alias = tribunalAliasFromCnj(numeroProcesso) ?? tribunal.toLowerCase();
  const response = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`, { method: "POST", headers: { Authorization: `APIKey ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: { match: { numeroProcesso: numeroProcesso.replace(/\D/g, "") } }, size: 1 }) });
  if (!response.ok) throw new Error(`DataJud ${response.status}: ${await response.text()}`);
  const data = await response.json(); const moves = data?.hits?.hits?.[0]?._source?.movimentos as Movimento[] | undefined;
  return moves ? [...moves].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()) : [];
}

export function isNewerMovement(movement: Movimento, current: string | null) { return !current || new Date(movement.dataHora).getTime() > new Date(current).getTime(); }
