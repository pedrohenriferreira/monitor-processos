// Tabela oficial CNJ (Resolução 65/2008, Anexo V) que mapeia o código de 2 dígitos do
// tribunal (campo "TR" do número único) para a UF, usada pelos segmentos de Justiça
// organizados por estado (Eleitoral, Estadual e Militar Estadual).
const UF_BY_TR: Record<string, string> = {
  "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce", "07": "df",
  "08": "es", "09": "go", "10": "ma", "11": "mt", "12": "ms", "13": "mg", "14": "pa",
  "15": "pb", "16": "pr", "17": "pe", "18": "pi", "19": "rj", "20": "rn", "21": "rs",
  "22": "ro", "23": "rr", "24": "sc", "25": "se", "26": "sp", "27": "to",
};

const TJM_UF = new Set(["mg", "rs", "sp"]);

// Deriva o alias do índice da API pública do DataJud (ex.: "trt13", "tjsp") a partir do
// próprio número CNJ do processo (NNNNNNN-DD.AAAA.J.TR.OOOO), em vez de depender do texto
// livre da coluna "Tribunal" da planilha — que costuma trazer a vara/órgão julgador, não o
// código do tribunal, e por isso batia num índice inexistente na DataJud.
export function tribunalAliasFromCnj(numeroCnj: string): string | null {
  const digits = numeroCnj.replace(/\D/g, "");
  if (digits.length !== 20) return null;

  const segmento = digits[13];
  const tr = digits.slice(14, 16);
  const trNumber = Number(tr);

  switch (segmento) {
    case "1": return "stf";
    case "3": return "stj";
    case "4": return trNumber >= 1 && trNumber <= 6 ? `trf${trNumber}` : null;
    case "5": return trNumber >= 1 && trNumber <= 24 ? `trt${trNumber}` : null;
    case "6": { const uf = UF_BY_TR[tr]; return uf ? `tre-${uf === "df" ? "dft" : uf}` : null; }
    case "7": return "stm";
    case "8": { const uf = UF_BY_TR[tr]; return uf ? (uf === "df" ? "tjdft" : `tj${uf}`) : null; }
    case "9": { const uf = UF_BY_TR[tr]; return uf && TJM_UF.has(uf) ? `tjm${uf}` : null; }
    default: return null;
  }
}
