export function showCountBadge(count: number | null | undefined): boolean {
  return typeof count === "number" && count > 0;
}

export function priorityLevelLabel(level: string | null | undefined): string {
  const labels: Record<string, string> = {
    CRITICA: "Crítica",
    ALTA: "Alta",
    MEDIA: "Média",
    BAIXA: "Baixa",
  };
  return level ? (labels[level] ?? level) : "—";
}

export function signalKindLabel(kind: string | null | undefined): string {
  const labels: Record<string, string> = {
    RISK: "Risco",
    OPPORTUNITY: "Oportunidade",
    EXECUTION: "Execução",
    FINANCIAL: "Financeiro",
    DIAGNOSIS: "Diagnóstico",
    EXPERIMENT: "Experimento",
    EVIDENCE: "Evidência",
    DATA_GAP: "Dado ausente",
  };
  return kind ? (labels[kind] ?? kind) : "—";
}

export function coverageLabel(used: number, total: number, noun: string): string {
  if (total <= 0) return "Sem empresas";
  return `${used}/${total} empresas com ${noun}`;
}

export function displayPriorityScore(score: number | null | undefined, hasCompany: boolean): {
  value: number | null;
  caption: string;
} {
  if (!hasCompany || score == null) {
    return { value: null, caption: "Sem dados" };
  }
  return { value: score, caption: "Score de prioridade" };
}

export const SIDEBAR_HREFS = [
  "/cockpit",
  "/empresas",
  "/alocacao",
  "/automacoes",
  "/auditoria",
  "/memoria",
  "/assistente",
] as const;
