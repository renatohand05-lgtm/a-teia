import {
  EVIDENCE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  PRIORITY_WEIGHTS,
} from "@/lib/opportunity-score";

export const DISPLAY_ORIGIN_LABELS: Record<string, string> = {
  SUGGESTED: "Diagnóstico 360°",
  MANUAL: "Manual",
};

export const SCORE_FACTORS = [
  { key: "severity", label: "Severidade", weight: PRIORITY_WEIGHTS.severity },
  { key: "impact", label: "Impacto", weight: PRIORITY_WEIGHTS.impact },
  { key: "urgency", label: "Urgência", weight: PRIORITY_WEIGHTS.urgency },
  { key: "confidence", label: "Confiança", weight: PRIORITY_WEIGHTS.confidence },
  { key: "speed", label: "Velocidade", weight: PRIORITY_WEIGHTS.speed },
  { key: "ease", label: "Facilidade", weight: PRIORITY_WEIGHTS.ease },
] as const;

export const OPPORTUNITY_HELP = {
  score:
    "Score 0–100 a partir de severidade, impacto, urgência, confiança, velocidade de payback e facilidade. Pesos fixos do motor. Score alto ranqueia a hipótese — não aprova e não manda executar agora.",
  payback:
    "Payback = investimento estimado ÷ retorno mensal esperado. Sem os dois números, não calculamos. Ausência nunca vira 0 meses.",
  evidence:
    "Oportunidade começa como hipótese. Evidência só sobe com experimento medido. Pesquisa externa e memória não viram evidência operacional sozinhas.",
  priority:
    "A faixa (alta/média/baixa) descreve o ranking. A prioridade operacional é o próximo passo real: testar, decidir ou executar — não o número isolado.",
} as const;

export type OpportunityNextAction = {
  label: string;
  kind: "experiment" | "plan" | "execution" | "activate" | "review";
  href?: string;
};

export type OpportunityActionInput = {
  id: string;
  status: string;
  evidenceLevel: string;
  queuedForPlan: boolean;
  experimentCount: number;
};

export function displayOrigin(origin: string | null | undefined): string {
  if (!origin) return "—";
  return DISPLAY_ORIGIN_LABELS[origin] ?? "—";
}

export function displayEvidence(level: string | null | undefined): string {
  if (!level) return EVIDENCE_LABELS.HYPOTHESIS;
  return EVIDENCE_LABELS[level] ?? EVIDENCE_LABELS.HYPOTHESIS;
}

export function displayOpportunityStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return OPPORTUNITY_STATUS_LABELS[status] ?? "—";
}

export function displayPaybackMonths(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "Não calculado";
  const rounded = Number.isInteger(months) ? String(months) : months.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${rounded} ${months === 1 ? "mês" : "meses"}`;
}

export function scoreBadgeLabel(partial: boolean): string {
  return partial ? "Score parcial" : "Score";
}

export function scorePartialNote(partial: boolean): string | null {
  return partial ? "Alguns dados ainda não estão disponíveis." : null;
}

export function whyThisScore(score: number): string {
  return `Por que esta oportunidade tem score ${score}?`;
}

export function isHypothesis(evidenceLevel: string | null | undefined): boolean {
  return !evidenceLevel || evidenceLevel === "HYPOTHESIS";
}

export function opportunityNextAction(item: OpportunityActionInput, companyId: string): OpportunityNextAction {
  const base = `/empresas/${companyId}`;
  if (item.status === "ARCHIVED" || item.status === "REJECTED") {
    return { label: "Revisar oportunidade", kind: "review", href: `${base}/oportunidades/${item.id}` };
  }
  if (item.status === "DRAFT") {
    return { label: "Ativar", kind: "activate" };
  }
  if (item.status === "IN_PROGRESS") {
    return { label: "Continuar execução", kind: "execution", href: `${base}/execucao` };
  }
  if (item.queuedForPlan) {
    return {
      label: "Criar plano",
      kind: "plan",
      href: `${base}/execucao/novo?opportunityId=${item.id}`,
    };
  }
  if (isHypothesis(item.evidenceLevel) && item.experimentCount === 0) {
    return {
      label: "Criar experimento",
      kind: "experiment",
      href: `${base}/experimentos/novo?opportunityId=${item.id}`,
    };
  }
  if (item.experimentCount > 0 && item.evidenceLevel === "TESTING") {
    return { label: "Continuar execução", kind: "execution", href: `${base}/experimentos` };
  }
  return {
    label: "Criar plano",
    kind: "plan",
    href: `${base}/execucao/novo?opportunityId=${item.id}`,
  };
}
