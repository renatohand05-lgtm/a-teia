import { canCompareCompanies, type PortfolioCompanyInput } from "@/lib/global-priority-engine";

export type CompletenessFlag = "SIM" | "NÃO";

export type PortfolioCompletenessRow = {
  companyId: string;
  companyName: string;
  cadastro: CompletenessFlag;
  diagnosis: CompletenessFlag;
  finance: CompletenessFlag;
  opportunity: CompletenessFlag;
  plan: CompletenessFlag;
  experiment: CompletenessFlag;
  evidence: CompletenessFlag;
  memory: CompletenessFlag;
  application: CompletenessFlag;
};

export type ExpansionSource = {
  id: string;
  kind: "PLAYBOOK" | "MEMORY";
  title: string;
  originCompanyId: string;
  originCompanyName: string;
  originSegment: string | null;
  validated: boolean;
};

export type ExpansionCandidate = {
  sourceId: string;
  sourceTitle: string;
  sourceKind: ExpansionSource["kind"];
  originCompanyId: string;
  originCompanyName: string;
  destinationCompanyId: string;
  destinationCompanyName: string;
  sameSegment: boolean;
  readiness: "ready" | "partial" | "insufficient";
  score: number;
  reasons: string[];
  missing: string[];
  classification: "HIPOTESE";
  nextAction: string;
  href: string;
};

export type ExpansionBoard = {
  scale: string;
  emptyTitle: string;
  emptyBody: string;
  candidates: ExpansionCandidate[];
};

function flag(value: boolean): CompletenessFlag {
  return value ? "SIM" : "NÃO";
}

export function portfolioScaleCaption(activeCount: number): string {
  if (activeCount <= 0) return "Carteira vazia. Nada a consolidar.";
  if (activeCount === 1) return "Leitura de uma empresa. Não generalize este resultado para um portfólio.";
  return `${activeCount} empresas ativas. O consolidado soma só o que foi informado.`;
}

export function buildPortfolioCompleteness(companies: PortfolioCompanyInput[]): PortfolioCompletenessRow[] {
  return companies
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({
      companyId: item.id,
      companyName: item.name,
      cadastro: "SIM",
      diagnosis: flag(Boolean(item.diagnosis)),
      finance: flag(item.finance.revenue != null || item.finance.ebitda != null),
      opportunity: flag(item.opportunities.length > 0),
      plan: flag(item.plans.length > 0),
      experiment: flag(item.experiments.length > 0),
      evidence: flag(item.experiments.some((row) => row.evidenceCount > 0) || item.evidence.length > 0),
      memory: flag(item.memories.some((row) => row.validated)),
      application: flag((item.playbookTransfers ?? []).length > 0),
    }));
}

function destinationReadiness(company: PortfolioCompanyInput): {
  readiness: ExpansionCandidate["readiness"];
  missing: string[];
} {
  const missing: string[] = [];
  if (!company.diagnosis) missing.push("Diagnóstico 360°");
  if (company.finance.revenue == null && company.finance.ebitda == null) missing.push("Financeiro");
  if (missing.length === 0) return { readiness: "ready", missing };
  if (missing.length === 1) return { readiness: "partial", missing };
  return { readiness: "insufficient", missing };
}

export function expansionEmptyState(input: { companyCount: number; validatedSources: number }): { title: string; body: string } {
  if (input.companyCount <= 0) {
    return {
      title: "Carteira vazia",
      body: "Cadastre a primeira empresa para montar o portfólio.",
    };
  }
  if (input.companyCount === 1) {
    return {
      title: "Sem destino para expansão",
      body: "Cadastre outra empresa para testar um aprendizado. Evidência da origem não transfere.",
    };
  }
  if (input.validatedSources === 0) {
    return {
      title: "Nenhum aprendizado validado para testar",
      body: "Playbook validado ou memória aprovada é o ponto de partida. Hipótese da origem continua hipótese no destino.",
    };
  }
  return {
    title: "Nenhum destino elegível agora",
    body: "Os destinos possíveis já estão em teste, são a origem, ou faltam dados mínimos.",
  };
}

export function rankExpansionOpportunities(input: {
  sources: ExpansionSource[];
  companies: PortfolioCompanyInput[];
  existingApplications?: Array<{ sourceId: string; destinationCompanyId: string }>;
}): ExpansionBoard {
  const active = input.companies.filter((item) => item.status === "ACTIVE");
  const validated = input.sources.filter((item) => item.validated);
  const occupied = new Set((input.existingApplications ?? []).map((item) => `${item.sourceId}:${item.destinationCompanyId}`));
  const empty = expansionEmptyState({ companyCount: active.length, validatedSources: validated.length });
  const candidates: ExpansionCandidate[] = [];

  for (const source of validated) {
    for (const destination of active) {
      if (destination.id === source.originCompanyId) continue;
      if (occupied.has(`${source.id}:${destination.id}`)) continue;
      const compare = canCompareCompanies(
        { segment: source.originSegment },
        { segment: destination.segment },
        "expansão",
      );
      const fit = destinationReadiness(destination);
      let score = 40;
      const reasons: string[] = ["Classificação: HIPÓTESE no destino. Evidência da origem permanece na origem."];
      if (compare.valid) {
        score += 25;
        reasons.push(compare.reason);
      } else {
        score += 5;
        reasons.push(compare.reason);
      }
      if (fit.readiness === "ready") score += 20;
      else if (fit.readiness === "partial") score += 8;
      else score -= 10;
      candidates.push({
        sourceId: source.id,
        sourceTitle: source.title,
        sourceKind: source.kind,
        originCompanyId: source.originCompanyId,
        originCompanyName: source.originCompanyName,
        destinationCompanyId: destination.id,
        destinationCompanyName: destination.name,
        sameSegment: compare.valid,
        readiness: fit.readiness,
        score: Math.max(0, Math.min(100, score)),
        reasons,
        missing: fit.missing,
        classification: "HIPOTESE",
        nextAction: "Revisar compatibilidade antes de aprovar o teste.",
        href: `/empresas/${destination.id}/aplicacoes`,
      });
    }
  }

  candidates.sort((left, right) => right.score - left.score || left.destinationCompanyName.localeCompare(right.destinationCompanyName));
  return {
    scale: portfolioScaleCaption(active.length),
    emptyTitle: empty.title,
    emptyBody: empty.body,
    candidates: candidates.slice(0, 5),
  };
}

const COMPLETENESS_GAPS: Array<{ key: keyof Omit<PortfolioCompletenessRow, "companyId" | "companyName">; label: string }> = [
  { key: "diagnosis", label: "Diagnóstico 360°" },
  { key: "finance", label: "Financeiro" },
  { key: "opportunity", label: "Oportunidade" },
  { key: "plan", label: "Plano" },
  { key: "experiment", label: "Experimento" },
  { key: "evidence", label: "Evidência" },
  { key: "memory", label: "Memória" },
  { key: "application", label: "Aplicação" },
];

export function completenessGaps(row: PortfolioCompletenessRow): string[] {
  return COMPLETENESS_GAPS.filter((item) => row[item.key] === "NÃO").map((item) => item.label);
}

export function isCompletenessQuestion(question: string): boolean {
  return /faltam dados|completude|ciclo 360|matriz de (completude|cobertura)/i.test(question);
}

export function isExpansionQuestion(question: string): boolean {
  return /expans[aã]o|onde testar .{0,40}aprend|destino .{0,24}(teste|expans)|empresa .{0,24}(pronta|eleg[ií]vel)/i.test(question);
}

export function composeCompletenessAnswer(rows: PortfolioCompletenessRow[]): string {
  if (!rows.length) return "Carteira vazia. Nada a consolidar.";
  const lines = rows.map((row) => {
    const missing = completenessGaps(row);
    return missing.length
      ? `${row.companyName}: falta ${missing.join(", ")}.`
      : `${row.companyName}: ciclo informado.`;
  });
  if (rows.length === 1) {
    return `${portfolioScaleCaption(1)} ${lines[0]} Não inventar 360°, oportunidade ou memória.`;
  }
  return `${portfolioScaleCaption(rows.length)} ${lines.join(" ")}`;
}

export function composeExpansionAnswer(board: ExpansionBoard): string {
  if (!board.candidates.length) {
    return `${board.scale} ${board.emptyTitle}. ${board.emptyBody}`;
  }
  const lines = board.candidates.map(
    (item) =>
      `${item.sourceTitle} → ${item.destinationCompanyName} (${item.score}/100, HIPÓTESE). Evidência permanece na origem.`,
  );
  return `${board.scale} ${lines.join(" ")} Score mede aderência ao teste, não probabilidade de sucesso.`;
}

export function portfolioIntelligenceAnswer(input: {
  question: string;
  completeness: PortfolioCompletenessRow[];
  expansion: ExpansionBoard;
  fallback: string;
}): string {
  if (isExpansionQuestion(input.question)) return composeExpansionAnswer(input.expansion);
  if (isCompletenessQuestion(input.question)) return composeCompletenessAnswer(input.completeness);
  return input.fallback;
}
