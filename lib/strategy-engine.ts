import {
  CONNECTION_CLASS_LABELS,
  CONNECTION_TYPE_LABELS,
  type ConnectionOriginClass,
  type ConnectionType,
} from "@/lib/connection-engine";

export const STRATEGY_STATUSES = [
  "RASCUNHO",
  "PROPOSTA",
  "APROVADA",
  "EM_TESTE",
  "VALIDADA",
  "REJEITADA",
  "ARQUIVADA",
] as const;

export type StrategyLifecycle = (typeof STRATEGY_STATUSES)[number];

export const STRATEGY_STATUS_LABELS: Record<StrategyLifecycle, string> = {
  RASCUNHO: "Rascunho",
  PROPOSTA: "Proposta",
  APROVADA: "Aprovada",
  EM_TESTE: "Em teste",
  VALIDADA: "Validada",
  REJEITADA: "Rejeitada",
  ARQUIVADA: "Arquivada",
};

export const STRATEGY_EFFORT_LABELS = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
  INDETERMINADO: "Indeterminado",
} as const;

export const STRATEGY_RISK_LABELS = {
  BAIXO: "Baixo",
  MODERADO: "Moderado",
  ALTO: "Alto",
  INDETERMINADO: "Indeterminado",
} as const;

export function strategyStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return STRATEGY_STATUS_LABELS[status as StrategyLifecycle] ?? status;
}

export type StrategyDraftInput = {
  fromName: string;
  toName: string;
  type: ConnectionType | string;
  mechanism: string | null;
  hypothesis: string | null;
  limitations: string | null;
  classification: ConnectionOriginClass | string;
};

export function draftStrategyFromConnection(input: StrategyDraftInput): {
  title: string;
  problem: string;
  hypothesis: string;
  mechanism: string;
  audience: string;
  valueProposition: string;
  primaryKpi: string;
  recommendationOrigin: ConnectionOriginClass;
  limitations: string;
} {
  const typeLabel = CONNECTION_TYPE_LABELS[input.type as ConnectionType] ?? input.type;
  return {
    title: `${typeLabel} entre ${input.fromName} e ${input.toName}`.slice(0, 160),
    problem: `Há um sinal de ${String(typeLabel).toLowerCase()} entre as operações, ainda não testado em ${input.toName}.`,
    hypothesis:
      input.hypothesis?.trim() ||
      `Se ${input.fromName} e ${input.toName} testarem ${input.mechanism ?? "esta relação"}, um KPI mensurável deve se mover. Isso permanece hipótese.`,
    mechanism: input.mechanism?.trim() || String(typeLabel).toLowerCase(),
    audience: `Clientes ou operação de ${input.toName}, a partir de sinal observado em ${input.fromName}.`,
    valueProposition: `Gerar valor conjunto sem tratar similaridade como evidência.`,
    primaryKpi: "Indicador a definir no teste",
    recommendationOrigin: (input.classification as ConnectionOriginClass) || "HIPOTESE",
    limitations:
      input.limitations?.trim() ||
      "Aprendizado da origem não é resultado esperado no destino. Fonte externa, se houver, não é evidência interna.",
  };
}

export function strategyConversionReview(input: {
  problem: string | null;
  hypothesis: string | null;
  primaryKpi: string | null;
  estimatedInvestment: number | null;
  risk: string | null;
  evidenceCount: number;
  missing: string[];
}): {
  problem: string;
  hypothesis: string;
  kpi: string;
  investment: string;
  risk: string;
  evidence: string;
  missing: string[];
  canConfirm: boolean;
} {
  const missing = [...input.missing];
  if (!input.problem?.trim()) missing.push("problema");
  if (!input.hypothesis?.trim()) missing.push("hipótese");
  if (!input.primaryKpi?.trim() || /a definir/i.test(input.primaryKpi)) missing.push("KPI principal");
  return {
    problem: input.problem?.trim() || "Não informado",
    hypothesis: input.hypothesis?.trim() || "Não informado",
    kpi: input.primaryKpi?.trim() || "Não informado",
    investment: input.estimatedInvestment == null ? "Sem dados" : String(input.estimatedInvestment),
    risk: input.risk ? STRATEGY_RISK_LABELS[input.risk as keyof typeof STRATEGY_RISK_LABELS] ?? input.risk : "Indeterminado",
    evidence: input.evidenceCount > 0 ? `${input.evidenceCount} evidência(s) relacionadas na origem — não transferidas automaticamente.` : "Nenhuma evidência interna no destino.",
    missing: [...new Set(missing)],
    canConfirm: Boolean(input.problem?.trim() && input.hypothesis?.trim()),
  };
}

export function strategyClassificationCopy(origin: string | null | undefined): string {
  return `${CONNECTION_CLASS_LABELS[(origin as ConnectionOriginClass) ?? "HIPOTESE"] ?? origin}. Isso não valida o destino.`;
}

export const STRATEGY_EMPTY = {
  title: "Nenhuma estratégia criada.",
  body: "Estratégia nasce de uma conexão analisada. Nada entra em execução sem confirmação humana.",
};
