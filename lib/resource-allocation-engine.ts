import { formatBRL } from "@/lib/format";
import {
  addCents,
  estimatedRoiBps,
  fromCents,
  fromHourHundredths,
  isInformedCents,
  missingMoneyIsNotZero,
  paybackMonthsHundredths,
  scaleCents,
  subtractCents,
} from "@/lib/money";

export type AllocationScenarioKind = "CONSERVADOR" | "BALANCEADO" | "EXPANSAO";
export type AllocationHorizon = "DAYS_30" | "DAYS_60" | "DAYS_90" | "MONTHS_6" | "MONTHS_12";
export type AllocationEligibility = "ELEGIVEL" | "ELEGIVEL_COM_RESSALVAS" | "DADOS_INSUFICIENTES" | "BLOQUEADO";
export type AllocationSourceKind = "OPPORTUNITY" | "PLAN" | "EXPERIMENT" | "DECISION" | "PRIORITY";
export type AllocationEvidenceClass = "SEM_EVIDENCIA" | "HIPOTESE" | "SINAL_INICIAL" | "EVIDENCIA_VALIDADA";
export type AllocationRiskLevel = "BAIXO" | "MODERADO" | "ALTO" | "INDETERMINADO";
export type AllocationReadiness = "PRONTO" | "PARCIAL" | "INSUFICIENTE";

export type AllocationConstraints = {
  capitalAvailableCents: number | null;
  hoursAvailableHundredths: number | null;
  capacityLimit: number | null;
  reserveMinimumCents: number | null;
  maxPerCompanyCents: number | null;
  maxPerInitiativeCents: number | null;
  maxPercentPerInitiative: number | null;
  horizon: AllocationHorizon;
  scenario: AllocationScenarioKind;
  activeInitiativeCount: number;
};

export type AllocationCandidate = {
  id: string;
  companyId: string;
  companyName: string;
  companySegment: string | null;
  sourceKind: AllocationSourceKind;
  sourceId: string;
  title: string;
  description: string | null;
  investmentCents: number | null;
  hoursHundredths: number | null;
  expectedMonthlyReturnCents: number | null;
  paybackMonthsHundredths: number | null;
  impact: number | null;
  urgency: number | null;
  score: number | null;
  evidenceLevel: string | null;
  status: string;
  reversible: boolean;
  dependencyBlocked: boolean;
  blockedReason: string | null;
  hasValidatedEvidence: boolean;
  cashCents: number | null;
  priorityScore: number | null;
};

export type AssessedCandidate = AllocationCandidate & {
  eligibility: AllocationEligibility;
  eligibilityReasons: string[];
  readiness: AllocationReadiness;
  evidenceClass: AllocationEvidenceClass;
  risk: AllocationRiskLevel;
  riskReasons: string[];
  missingData: string[];
  roiBps: number | null;
  resolvedPaybackHundredths: number | null;
  horizonReturnCents: number | null;
  rankScore: number;
  href: string;
};

export type AllocationLine = {
  candidateId: string;
  companyId: string;
  companyName: string;
  sourceKind: AllocationSourceKind;
  sourceId: string;
  title: string;
  allocated: boolean;
  skipReason: string | null;
  eligibility: AllocationEligibility;
  readiness: AllocationReadiness;
  risk: AllocationRiskLevel;
  evidenceClass: AllocationEvidenceClass;
  capitalCents: number | null;
  hoursHundredths: number | null;
  expectedMonthlyReturnCents: number | null;
  paybackMonthsHundredths: number | null;
  roiBps: number | null;
  rationale: string;
  nextAction: string;
  concentration: boolean;
  explanation: AllocationExplanation;
  href: string;
};

export type AllocationExplanation = {
  dataUsed: string[];
  rules: string[];
  constraints: string[];
  tradeoffs: string[];
  missingData: string[];
  risks: string[];
  evidence: string[];
  limitations: string[];
};

export type OpportunityCost = {
  chosenTitle: string;
  skippedTitle: string;
  chosenSummary: string;
  skippedSummary: string;
};

export type AllocationResult = {
  scenario: AllocationScenarioKind;
  horizon: AllocationHorizon;
  horizonMonths: number;
  allocated: AllocationLine[];
  unallocated: AllocationLine[];
  warnings: string[];
  opportunityCosts: OpportunityCost[];
  capitalAvailableCents: number | null;
  capitalAllocatedCents: number | null;
  capitalPreservedCents: number | null;
  hoursAvailableHundredths: number | null;
  hoursAllocatedHundredths: number | null;
  hoursPreservedHundredths: number | null;
  capacityLimit: number | null;
  capacityUsed: number;
  reserveDefined: boolean;
  reserveLabel: string;
  coverage: { eligibleCompanies: number; totalCompanies: number; label: string };
  readiness: AllocationReadiness;
  emptyReason: string | null;
};

export const HORIZON_MONTHS: Record<AllocationHorizon, number> = {
  DAYS_30: 1,
  DAYS_60: 2,
  DAYS_90: 3,
  MONTHS_6: 6,
  MONTHS_12: 12,
};

export const ALLOCATION_SHORTCUTS = [
  { label: "Como eu distribuiria R$ 50 mil?", prompt: "Como eu distribuiria R$ 50 mil?" },
  { label: "Tenho alguma decisão de investimento pendente?", prompt: "Tenho alguma decisão de investimento pendente?" },
  { label: "Onde concentro capital demais?", prompt: "Onde estou concentrando capital demais?" },
  { label: "Qual exige menos capital?", prompt: "Qual oportunidade exige menos capital?" },
  { label: "Onde o tempo é consumido?", prompt: "Onde meu tempo está sendo consumido?" },
  { label: "Evidência mais forte", prompt: "Quais iniciativas têm evidência mais forte?" },
  { label: "Investimentos sem dados", prompt: "Quais investimentos ainda não têm dados suficientes?" },
  { label: "O que adiar?", prompt: "O que eu deveria adiar na alocação de recursos?" },
] as const;

export function aiMayApproveAllocation(): false {
  return false;
}

export function aiMayMoveMoney(): false {
  return false;
}

export function isAllocationQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return /alocar|aloca[cç][aã]o|distribu|decis[aã]o de investimento|capital demais|menos capital|tempo est[aá] sendo consum|investimentos ainda n[aã]o|adiar na aloca|concentra/.test(q);
}

export function horizonMonths(horizon: AllocationHorizon): number {
  return HORIZON_MONTHS[horizon];
}

export function classifyEvidence(candidate: AllocationCandidate): AllocationEvidenceClass {
  if (candidate.hasValidatedEvidence || candidate.evidenceLevel === "VALIDATED_EVIDENCE") {
    return "EVIDENCIA_VALIDADA";
  }
  if (candidate.evidenceLevel === "PARTIAL_EVIDENCE" || candidate.evidenceLevel === "TESTING") {
    return "SINAL_INICIAL";
  }
  if (candidate.evidenceLevel === "HYPOTHESIS") return "HIPOTESE";
  return "SEM_EVIDENCIA";
}

export function assessReadiness(candidate: AllocationCandidate): AllocationReadiness {
  const hasInvestment = isInformedCents(candidate.investmentCents);
  const hasHours = isInformedCents(candidate.hoursHundredths);
  const hasReturn = isInformedCents(candidate.expectedMonthlyReturnCents) || isInformedCents(candidate.paybackMonthsHundredths);
  const checks = [hasInvestment, hasHours, hasReturn];
  const ok = checks.filter(Boolean).length;
  if (ok >= 3 && !candidate.dependencyBlocked && !blockedStatus(candidate)) return "PRONTO";
  if (ok >= 1) return "PARCIAL";
  return "INSUFICIENTE";
}

export function classifyRisk(
  candidate: AllocationCandidate,
  constraints: AllocationConstraints,
  evidenceClass: AllocationEvidenceClass,
): { risk: AllocationRiskLevel; reasons: string[] } {
  if (!isInformedCents(candidate.investmentCents) && !isInformedCents(candidate.hoursHundredths)) {
    return { risk: "INDETERMINADO", reasons: ["Investimento e horas não informados. Risco não pode ser medido."] };
  }
  const reasons: string[] = [];
  let points = 0;
  if (evidenceClass === "SEM_EVIDENCIA" || evidenceClass === "HIPOTESE") {
    points += 2;
    reasons.push("Evidência ainda é hipótese ou está ausente.");
  }
  if (
    isInformedCents(candidate.investmentCents) &&
    isInformedCents(constraints.capitalAvailableCents) &&
    candidate.investmentCents * 2 > constraints.capitalAvailableCents
  ) {
    points += 2;
    reasons.push("Investimento informado é elevado em relação ao capital disponível.");
  }
  if (
    isInformedCents(candidate.investmentCents) &&
    isInformedCents(candidate.cashCents) &&
    candidate.investmentCents > candidate.cashCents
  ) {
    points += 2;
    reasons.push("Investimento informado supera o caixa persistido da empresa.");
  }
  if (candidate.dependencyBlocked) {
    points += 2;
    reasons.push("Há dependência não concluída.");
  }
  const payback = resolvePayback(candidate);
  if (payback != null && payback / 100 > horizonMonths(constraints.horizon)) {
    points += 1;
    reasons.push("Payback informado excede o horizonte.");
  }
  if (!isInformedCents(candidate.expectedMonthlyReturnCents)) {
    points += 1;
    reasons.push("Retorno estimado não informado.");
  }
  if (!candidate.reversible) {
    points += 1;
    reasons.push("Iniciativa pouco reversível.");
  }
  if (points >= 4) return { risk: "ALTO", reasons };
  if (points >= 2) return { risk: "MODERADO", reasons };
  if (!reasons.length) reasons.push("Evidência, prazo e exposição relativa não indicam risco alto.");
  return { risk: "BAIXO", reasons };
}

export function classifyEligibility(
  candidate: AllocationCandidate,
  constraints: AllocationConstraints,
): { eligibility: AllocationEligibility; reasons: string[] } {
  const reasons: string[] = [];
  if (blockedStatus(candidate) || candidate.dependencyBlocked || candidate.blockedReason) {
    return {
      eligibility: "BLOQUEADO",
      reasons: [candidate.blockedReason ?? "Status, dependência ou decisão rejeitada impedem alocação."],
    };
  }
  if (
    isInformedCents(candidate.investmentCents) &&
    isInformedCents(constraints.maxPerInitiativeCents) &&
    candidate.investmentCents > constraints.maxPerInitiativeCents
  ) {
    return {
      eligibility: "BLOQUEADO",
      reasons: ["Investimento informado excede o máximo por iniciativa configurado. Sem financiamento automático."],
    };
  }
  if (
    isInformedCents(candidate.investmentCents) &&
    isInformedCents(constraints.capitalAvailableCents) &&
    isInformedCents(constraints.maxPercentPerInitiative)
  ) {
    const cap = scaleCents(constraints.capitalAvailableCents, constraints.maxPercentPerInitiative, 100);
    if (candidate.investmentCents > cap) {
      return {
        eligibility: "BLOQUEADO",
        reasons: ["Investimento informado excede o percentual máximo por iniciativa."],
      };
    }
  }
  const missing: string[] = [];
  if (missingMoneyIsNotZero(candidate.investmentCents)) missing.push("investimento");
  if (missingMoneyIsNotZero(candidate.hoursHundredths)) missing.push("horas");
  if (missingMoneyIsNotZero(candidate.expectedMonthlyReturnCents)) missing.push("retorno estimado");
  if (!missing.length) {
    reasons.push("Estimativas de capital, tempo e retorno persistidas.");
    return { eligibility: "ELEGIVEL", reasons };
  }
  if (isInformedCents(candidate.investmentCents) || isInformedCents(candidate.hoursHundredths)) {
    reasons.push(`Dado ausente: ${missing.join(", ")}. Ausência não é zero.`);
    return { eligibility: "ELEGIVEL_COM_RESSALVAS", reasons };
  }
  reasons.push("Sem investimento e sem horas informados. Dados insuficientes — não é investimento zero.");
  return { eligibility: "DADOS_INSUFICIENTES", reasons };
}

export function assessCandidate(candidate: AllocationCandidate, constraints: AllocationConstraints): AssessedCandidate {
  const evidenceClass = classifyEvidence(candidate);
  const readiness = assessReadiness(candidate);
  const { eligibility, reasons: eligibilityReasons } = classifyEligibility(candidate, constraints);
  const { risk, reasons: riskReasons } = classifyRisk(candidate, constraints, evidenceClass);
  const missingData: string[] = [];
  if (missingMoneyIsNotZero(candidate.investmentCents)) missingData.push("investimento");
  if (missingMoneyIsNotZero(candidate.hoursHundredths)) missingData.push("horas");
  if (missingMoneyIsNotZero(candidate.expectedMonthlyReturnCents)) missingData.push("retorno estimado");
  if (missingMoneyIsNotZero(candidate.paybackMonthsHundredths) && resolvePayback(candidate) == null) {
    missingData.push("payback");
  }
  const months = horizonMonths(constraints.horizon);
  const horizonReturnCents =
    isInformedCents(candidate.expectedMonthlyReturnCents) ? candidate.expectedMonthlyReturnCents * months : null;
  const roiBps = estimatedRoiBps(horizonReturnCents, candidate.investmentCents);
  const resolvedPayback = resolvePayback(candidate);
  return {
    ...candidate,
    eligibility,
    eligibilityReasons,
    readiness,
    evidenceClass,
    risk,
    riskReasons,
    missingData,
    roiBps,
    resolvedPaybackHundredths: resolvedPayback,
    horizonReturnCents,
    rankScore: rankScore(candidate, constraints, { eligibility, evidenceClass, risk, roiBps, resolvedPayback }),
    href: candidateHref(candidate),
  };
}

export function allocateResources(
  candidates: AllocationCandidate[],
  constraints: AllocationConstraints,
): AllocationResult {
  const assessed = candidates.map((item) => assessCandidate(item, constraints));
  const companyIds = [...new Set(candidates.map((item) => item.companyId))];
  const eligibleCompanies = new Set(
    assessed
      .filter((item) => item.eligibility === "ELEGIVEL" || item.eligibility === "ELEGIVEL_COM_RESSALVAS")
      .map((item) => item.companyId),
  );
  const coverage = {
    eligibleCompanies: eligibleCompanies.size,
    totalCompanies: companyIds.length,
    label:
      companyIds.length === 0
        ? "Nenhuma empresa na carteira."
        : `${eligibleCompanies.size}/${companyIds.length} empresas possuem iniciativas elegíveis.`,
  };

  if (!isInformedCents(constraints.capitalAvailableCents) && !isInformedCents(constraints.hoursAvailableHundredths)) {
    return emptyResult(constraints, assessed, coverage, "Informe os recursos disponíveis para iniciar uma simulação.");
  }
  if (!candidates.length) {
    return emptyResult(constraints, assessed, coverage, "Não há iniciativas elegíveis para alocação.");
  }
  if (assessed.every((item) => item.readiness === "INSUFICIENTE" || item.eligibility === "DADOS_INSUFICIENTES")) {
    return emptyResult(constraints, assessed, coverage, "Complete as estimativas das iniciativas.");
  }

  const ordered = [...assessed].sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    const invA = a.investmentCents ?? Number.MAX_SAFE_INTEGER;
    const invB = b.investmentCents ?? Number.MAX_SAFE_INTEGER;
    if (invA !== invB) return invA - invB;
    return (a.hoursHundredths ?? Number.MAX_SAFE_INTEGER) - (b.hoursHundredths ?? Number.MAX_SAFE_INTEGER);
  });

  let remainingCapital = constraints.capitalAvailableCents;
  let remainingHours = constraints.hoursAvailableHundredths;
  let remainingCapacity =
    constraints.capacityLimit == null
      ? null
      : Math.max(0, constraints.capacityLimit - Math.max(0, constraints.activeInitiativeCount));
  const usedByCompany = new Map<string, number>();
  const allocated: AllocationLine[] = [];
  const unallocated: AllocationLine[] = [];
  const opportunityCosts: OpportunityCost[] = [];
  const warnings: string[] = [];

  if (constraints.reserveMinimumCents == null) {
    warnings.push("Reserva mínima não definida.");
  }
  if (constraints.capacityLimit == null) {
    warnings.push("Capacidade simultânea não definida.");
  }

  for (const item of ordered) {
    const decision = decideAllocation(item, constraints, {
      remainingCapital,
      remainingHours,
      remainingCapacity,
      usedByCompany: usedByCompany.get(item.companyId) ?? 0,
    });
    const line = toLine(item, constraints, decision);
    if (decision.allocate) {
      allocated.push(line);
      if (isInformedCents(item.investmentCents) && remainingCapital != null) {
        remainingCapital = subtractCents(remainingCapital, item.investmentCents);
      }
      if (isInformedCents(item.hoursHundredths) && remainingHours != null) {
        remainingHours = remainingHours - item.hoursHundredths;
      }
      if (remainingCapacity != null) remainingCapacity -= 1;
      if (isInformedCents(item.investmentCents)) {
        usedByCompany.set(item.companyId, (usedByCompany.get(item.companyId) ?? 0) + item.investmentCents);
      }
    } else {
      unallocated.push(line);
      const last = allocated.at(-1);
      if (last && last.allocated && /capital|hora|recurso|dispon/i.test(decision.reason)) {
        opportunityCosts.push({
          chosenTitle: last.title,
          skippedTitle: item.title,
          chosenSummary: tradeoffSummary(last),
          skippedSummary: tradeoffSummary(line),
        });
      }
    }
  }

  const capitalAllocated = allocated.reduce(
    (sum, item) => (isInformedCents(item.capitalCents) ? addCents(sum, item.capitalCents) : sum),
    0,
  );
  const hoursAllocated = allocated.reduce(
    (sum, item) => (isInformedCents(item.hoursHundredths) ? sum + item.hoursHundredths : sum),
    0,
  );
  const capitalPreserved =
    constraints.capitalAvailableCents == null ? null : subtractCents(constraints.capitalAvailableCents, capitalAllocated);
  const hoursPreserved =
    constraints.hoursAvailableHundredths == null ? null : constraints.hoursAvailableHundredths - hoursAllocated;

  if (
    isInformedCents(constraints.capitalAvailableCents) &&
    allocated.some((item) => item.concentration)
  ) {
    warnings.push("CONCENTRAÇÃO ELEVADA: uma iniciativa concentra parcela relevante do capital disponível.");
  }

  return {
    scenario: constraints.scenario,
    horizon: constraints.horizon,
    horizonMonths: horizonMonths(constraints.horizon),
    allocated,
    unallocated,
    warnings,
    opportunityCosts,
    capitalAvailableCents: constraints.capitalAvailableCents,
    capitalAllocatedCents: constraints.capitalAvailableCents == null ? null : capitalAllocated,
    capitalPreservedCents: capitalPreserved,
    hoursAvailableHundredths: constraints.hoursAvailableHundredths,
    hoursAllocatedHundredths: constraints.hoursAvailableHundredths == null ? null : hoursAllocated,
    hoursPreservedHundredths: hoursPreserved,
    capacityLimit: constraints.capacityLimit,
    capacityUsed: constraints.activeInitiativeCount + allocated.length,
    reserveDefined: constraints.reserveMinimumCents != null,
    reserveLabel:
      constraints.reserveMinimumCents == null
        ? "Reserva mínima não definida."
        : `Reserva mínima configurada: ${formatBRL(fromCents(constraints.reserveMinimumCents))}.`,
    coverage,
    readiness: portfolioReadiness(assessed),
    emptyReason: allocated.length || unallocated.length ? null : "Não há iniciativas elegíveis para alocação.",
  };
}

export function compareScenarios(candidates: AllocationCandidate[], base: AllocationConstraints) {
  const scenarios: AllocationScenarioKind[] = ["CONSERVADOR", "BALANCEADO", "EXPANSAO"];
  const results = scenarios.map((scenario) => allocateResources(candidates, { ...base, scenario }));
  return results.map((result) => ({
    scenario: result.scenario,
    capitalAllocatedCents: result.capitalAllocatedCents,
    capitalPreservedCents: result.capitalPreservedCents,
    hoursAllocatedHundredths: result.hoursAllocatedHundredths,
    hoursPreservedHundredths: result.hoursPreservedHundredths,
    initiatives: result.allocated.length,
    highRisk: result.allocated.filter((item) => item.risk === "ALTO").length,
    validatedEvidence: result.allocated.filter((item) => item.evidenceClass === "EVIDENCIA_VALIDADA").length,
    readiness: result.readiness,
  }));
}

export function sensitivityAnalysis(candidates: AllocationCandidate[], constraints: AllocationConstraints) {
  const capital = constraints.capitalAvailableCents;
  const hours = constraints.hoursAvailableHundredths;
  return {
    capitalMinus20: allocateResources(candidates, {
      ...constraints,
      capitalAvailableCents: capital == null ? null : scaleCents(capital, 80, 100),
    }),
    capitalPlus20: allocateResources(candidates, {
      ...constraints,
      capitalAvailableCents: capital == null ? null : scaleCents(capital, 120, 100),
    }),
    hoursMinus20: allocateResources(candidates, {
      ...constraints,
      hoursAvailableHundredths: hours == null ? null : Math.round((hours * 80) / 100),
    }),
    horizon12: allocateResources(candidates, { ...constraints, horizon: "MONTHS_12" }),
  };
}

export function buildAllocationAIContext(input: {
  ownerId: string;
  result: AllocationResult;
  companyIds: string[];
}) {
  const compact = {
    ownerId: input.ownerId,
    scenario: input.result.scenario,
    horizonMonths: input.result.horizonMonths,
    coverage: input.result.coverage.label,
    capital: {
      available: fromCents(input.result.capitalAvailableCents),
      allocated: fromCents(input.result.capitalAllocatedCents),
      preserved: fromCents(input.result.capitalPreservedCents),
    },
    hours: {
      available: fromHourHundredths(input.result.hoursAvailableHundredths),
      allocated: fromHourHundredths(input.result.hoursAllocatedHundredths),
      preserved: fromHourHundredths(input.result.hoursPreservedHundredths),
    },
    allocated: input.result.allocated.slice(0, 5).map((item) => ({
      company: item.companyName,
      title: item.title,
      capital: fromCents(item.capitalCents),
      hours: fromHourHundredths(item.hoursHundredths),
      risk: item.risk,
      evidence: item.evidenceClass,
    })),
    unallocated: input.result.unallocated.slice(0, 4).map((item) => ({
      title: item.title,
      reason: item.skipReason,
    })),
  };
  const serialized = JSON.stringify(compact);
  const max = 2200;
  return {
    ownerId: input.ownerId,
    payload: serialized.length > max ? `${serialized.slice(0, max)}…` : serialized,
    companyIds: input.companyIds.slice(0, 6),
    reduced: serialized.length > max || input.companyIds.length > 6,
    chars: Math.min(serialized.length, max),
  };
}

export function composeAllocationSummary(result: AllocationResult): string {
  if (result.emptyReason) return result.emptyReason;
  if (!result.allocated.length) {
    return [
      "Nenhuma iniciativa foi alocada com os dados atuais.",
      result.unallocated[0]?.skipReason ?? "Revise estimativas e restrições.",
      "A A TEIA não inventa retorno nem consome orçamento só para zerar o caixa.",
    ].join(" ");
  }
  const lines = result.allocated.slice(0, 4).map((item, index) => {
    return [
      `ALOCAÇÃO ${index + 1} — ${item.companyName}`,
      item.title,
      `DADO: capital ${formatBRL(fromCents(item.capitalCents))} · horas ${fromHourHundredths(item.hoursHundredths) ?? "não informado"}`,
      item.expectedMonthlyReturnCents != null
        ? `DADO: retorno mensal estimado informado ${formatBRL(fromCents(item.expectedMonthlyReturnCents))}`
        : "DADO: retorno estimado não informado.",
      `INFERÊNCIA: risco ${item.risk}. Evidência ${item.evidenceClass}. Não é probabilidade de sucesso.`,
      `AÇÃO: ${item.nextAction}`,
    ].join("\n");
  });
  const reserved =
    result.capitalPreservedCents != null
      ? `\n\nCapital preservado: ${formatBRL(fromCents(result.capitalPreservedCents))}. Não é obrigatório alocar 100%.`
      : "";
  return `${lines.join("\n\n")}${reserved}`;
}

export function companyCapitalMap(result: AllocationResult) {
  const map = new Map<string, { companyName: string; capitalCents: number; hoursHundredths: number; count: number }>();
  for (const item of result.allocated) {
    const current = map.get(item.companyId) ?? {
      companyName: item.companyName,
      capitalCents: 0,
      hoursHundredths: 0,
      count: 0,
    };
    current.capitalCents += item.capitalCents ?? 0;
    current.hoursHundredths += item.hoursHundredths ?? 0;
    current.count += 1;
    map.set(item.companyId, current);
  }
  return [...map.entries()].map(([companyId, value]) => ({ companyId, ...value }));
}

function blockedStatus(candidate: AllocationCandidate): boolean {
  return ["ARCHIVED", "REJECTED", "CANCELLED", "ABANDONED", "REFUTED"].includes(candidate.status);
}

function resolvePayback(candidate: AllocationCandidate): number | null {
  if (isInformedCents(candidate.paybackMonthsHundredths)) return candidate.paybackMonthsHundredths;
  return paybackMonthsHundredths(candidate.investmentCents, candidate.expectedMonthlyReturnCents);
}

function rankScore(
  candidate: AllocationCandidate,
  constraints: AllocationConstraints,
  extra: {
    eligibility: AllocationEligibility;
    evidenceClass: AllocationEvidenceClass;
    risk: AllocationRiskLevel;
    roiBps: number | null;
    resolvedPayback: number | null;
  },
): number {
  if (extra.eligibility === "BLOQUEADO" || extra.eligibility === "DADOS_INSUFICIENTES") return -1000;
  let score = (candidate.priorityScore ?? 0) + (candidate.impact ?? 0) * 4 + (candidate.urgency ?? 0) * 3 + (candidate.score ?? 0);
  const evidenceBonus =
    extra.evidenceClass === "EVIDENCIA_VALIDADA" ? 30 : extra.evidenceClass === "SINAL_INICIAL" ? 15 : extra.evidenceClass === "HIPOTESE" ? 0 : -8;
  const riskPenalty = extra.risk === "ALTO" ? 25 : extra.risk === "MODERADO" ? 8 : extra.risk === "INDETERMINADO" ? 12 : 0;
  if (constraints.scenario === "CONSERVADOR") {
    score += evidenceBonus * 1.4 + (candidate.reversible ? 12 : -6) - riskPenalty * 1.5;
    if (isInformedCents(candidate.investmentCents) && isInformedCents(constraints.capitalAvailableCents)) {
      if (candidate.investmentCents * 5 <= constraints.capitalAvailableCents) score += 8;
    }
  } else if (constraints.scenario === "EXPANSAO") {
    score += (candidate.impact ?? 0) * 3 + (candidate.score ?? 0) * 0.4 + evidenceBonus * 0.6 - riskPenalty * 0.4;
    if (extra.roiBps != null) score += Math.min(20, extra.roiBps / 200);
  } else {
    score += evidenceBonus - riskPenalty + (candidate.impact ?? 0);
    if (extra.roiBps != null) score += Math.min(15, extra.roiBps / 250);
  }
  if (extra.resolvedPayback != null && extra.resolvedPayback / 100 <= horizonMonths(constraints.horizon)) {
    score += 12;
  }
  return Math.round(score);
}

function scenarioAllows(item: AssessedCandidate, constraints: AllocationConstraints): string | null {
  if (item.eligibility === "BLOQUEADO") return item.eligibilityReasons[0] ?? "Iniciativa bloqueada.";
  if (item.eligibility === "DADOS_INSUFICIENTES") return "Dados financeiros insuficientes.";
  if (item.resolvedPaybackHundredths != null && item.resolvedPaybackHundredths / 100 > horizonMonths(constraints.horizon)) {
    if (constraints.scenario !== "EXPANSAO" || item.resolvedPaybackHundredths / 100 > horizonMonths(constraints.horizon) * 2) {
      return "Payback incompatível com horizonte.";
    }
  }
  if (constraints.scenario === "CONSERVADOR") {
    if (item.risk === "ALTO" && item.evidenceClass !== "EVIDENCIA_VALIDADA") {
      return "Risco alto e evidência insuficiente.";
    }
    if (item.eligibility === "ELEGIVEL_COM_RESSALVAS" && item.evidenceClass === "SEM_EVIDENCIA") {
      return "Risco alto e evidência insuficiente.";
    }
  }
  if (constraints.scenario === "BALANCEADO" && item.risk === "ALTO" && item.evidenceClass === "SEM_EVIDENCIA") {
    return "Risco alto e evidência insuficiente.";
  }
  return null;
}

function decideAllocation(
  item: AssessedCandidate,
  constraints: AllocationConstraints,
  state: {
    remainingCapital: number | null;
    remainingHours: number | null;
    remainingCapacity: number | null;
    usedByCompany: number;
  },
): { allocate: boolean; reason: string; concentration: boolean } {
  const blocked = scenarioAllows(item, constraints);
  if (blocked) return { allocate: false, reason: blocked, concentration: false };

  if (state.remainingCapacity != null && state.remainingCapacity <= 0) {
    return { allocate: false, reason: "Capacidade esgotada.", concentration: false };
  }

  if (isInformedCents(item.investmentCents) && state.remainingCapital != null) {
    if (item.investmentCents > state.remainingCapital) {
      return { allocate: false, reason: "Investimento maior que o capital ainda disponível.", concentration: false };
    }
    if (
      constraints.reserveMinimumCents != null &&
      subtractCents(state.remainingCapital, item.investmentCents) < constraints.reserveMinimumCents
    ) {
      return { allocate: false, reason: "Alocar esta iniciativa violaria a reserva mínima configurada.", concentration: false };
    }
    if (
      constraints.maxPerCompanyCents != null &&
      state.usedByCompany + item.investmentCents > constraints.maxPerCompanyCents
    ) {
      return { allocate: false, reason: "Excede o máximo por empresa configurado.", concentration: false };
    }
  } else if (!isInformedCents(item.investmentCents) && state.remainingCapital != null) {
    return { allocate: false, reason: "Dados financeiros insuficientes.", concentration: false };
  }

  if (isInformedCents(item.hoursHundredths) && state.remainingHours != null) {
    if (item.hoursHundredths > state.remainingHours) {
      return { allocate: false, reason: "Horas necessárias superam o tempo ainda disponível.", concentration: false };
    }
  } else if (!isInformedCents(item.hoursHundredths) && state.remainingHours != null && !isInformedCents(item.investmentCents)) {
    return { allocate: false, reason: "Horas não informadas. Ausência não é zero horas.", concentration: false };
  }

  const concentration =
    isInformedCents(item.investmentCents) &&
    isInformedCents(constraints.capitalAvailableCents) &&
    item.investmentCents * 2 >= constraints.capitalAvailableCents;
  return { allocate: true, reason: recommendationReason(item, constraints), concentration };
}

function recommendationReason(item: AssessedCandidate, constraints: AllocationConstraints): string {
  const parts = [
    `Cenário ${constraints.scenario}.`,
    item.eligibilityReasons[0],
    `Evidência: ${item.evidenceClass}.`,
    `Risco: ${item.risk}.`,
  ];
  if (item.roiBps != null) {
    parts.push(`ROI estimado no horizonte (modelado): ${(item.roiBps / 100).toFixed(1)}%. Estimativa, não garantia.`);
  }
  return parts.filter(Boolean).join(" ");
}

function toLine(
  item: AssessedCandidate,
  constraints: AllocationConstraints,
  decision: { allocate: boolean; reason: string; concentration: boolean },
): AllocationLine {
  return {
    candidateId: item.id,
    companyId: item.companyId,
    companyName: item.companyName,
    sourceKind: item.sourceKind,
    sourceId: item.sourceId,
    title: item.title,
    allocated: decision.allocate,
    skipReason: decision.allocate ? null : decision.reason,
    eligibility: item.eligibility,
    readiness: item.readiness,
    risk: item.risk,
    evidenceClass: item.evidenceClass,
    capitalCents: decision.allocate ? item.investmentCents : null,
    hoursHundredths: decision.allocate ? item.hoursHundredths : item.hoursHundredths,
    expectedMonthlyReturnCents: item.expectedMonthlyReturnCents,
    paybackMonthsHundredths: item.resolvedPaybackHundredths,
    roiBps: item.roiBps,
    rationale: decision.reason,
    nextAction: decision.allocate
      ? "Revisar proposta e, se fizer sentido, enviar para decisão humana."
      : item.readiness === "INSUFICIENTE"
        ? "Completar estimativas."
        : "Manter fora desta rodada e revisar restrições.",
    concentration: decision.concentration,
    explanation: {
      dataUsed: [
        item.investmentCents != null ? `Investimento informado: ${formatBRL(fromCents(item.investmentCents))}` : "Investimento: não informado",
        item.hoursHundredths != null ? `Horas informadas: ${fromHourHundredths(item.hoursHundredths)}` : "Horas: não informado",
        item.expectedMonthlyReturnCents != null
          ? `Retorno mensal estimado informado: ${formatBRL(fromCents(item.expectedMonthlyReturnCents))}`
          : "Retorno estimado: não informado",
        item.horizonReturnCents != null
          ? `Retorno no horizonte (mensal informado × ${horizonMonths(constraints.horizon)} meses): ${formatBRL(fromCents(item.horizonReturnCents))}. Modelado, não garantido.`
          : "Retorno no horizonte não modelado — falta retorno mensal.",
      ],
      rules: item.eligibilityReasons.concat([`Score determinístico ${item.rankScore}`, `Cenário ${constraints.scenario}`]),
      constraints: [
        constraints.capitalAvailableCents != null
          ? `Capital disponível: ${formatBRL(fromCents(constraints.capitalAvailableCents))}`
          : "Capital disponível não informado",
        constraints.reserveMinimumCents != null
          ? `Reserva mínima: ${formatBRL(fromCents(constraints.reserveMinimumCents))}`
          : "Reserva mínima não definida.",
      ],
      tradeoffs: item.missingData.length
        ? [`Dados ausentes reduzem elegibilidade: ${item.missingData.join(", ")}.`]
        : ["Estimativas persistidas permitem comparar capital e tempo."],
      missingData: item.missingData,
      risks: item.riskReasons,
      evidence: [`Classe ${item.evidenceClass}. Não há probabilidade inventada de sucesso.`],
      limitations: [
        "Retorno estimado não é retorno garantido.",
        "A aprovação não movimenta dinheiro.",
      ],
    },
    href: item.href,
  };
}

function tradeoffSummary(line: AllocationLine): string {
  return [
    formatBRL(fromCents(line.capitalCents ?? line.expectedMonthlyReturnCents)),
    line.hoursHundredths != null ? `${fromHourHundredths(line.hoursHundredths)}h` : "horas não informadas",
    line.paybackMonthsHundredths != null ? `payback estimado ${(line.paybackMonthsHundredths / 100).toFixed(1)} meses` : "payback não informado",
  ].join(" · ");
}

function candidateHref(candidate: AllocationCandidate): string {
  if (candidate.sourceKind === "OPPORTUNITY") return `/empresas/${candidate.companyId}/oportunidades/${candidate.sourceId}`;
  if (candidate.sourceKind === "PLAN") return `/empresas/${candidate.companyId}/execucao/${candidate.sourceId}`;
  if (candidate.sourceKind === "EXPERIMENT") return `/empresas/${candidate.companyId}/experimentos/${candidate.sourceId}`;
  return `/empresas/${candidate.companyId}`;
}

function portfolioReadiness(items: AssessedCandidate[]): AllocationReadiness {
  if (items.some((item) => item.readiness === "PRONTO")) return "PRONTO";
  if (items.some((item) => item.readiness === "PARCIAL")) return "PARCIAL";
  return "INSUFICIENTE";
}

function emptyResult(
  constraints: AllocationConstraints,
  assessed: AssessedCandidate[],
  coverage: AllocationResult["coverage"],
  emptyReason: string,
): AllocationResult {
  return {
    scenario: constraints.scenario,
    horizon: constraints.horizon,
    horizonMonths: horizonMonths(constraints.horizon),
    allocated: [],
    unallocated: assessed.map((item) =>
      toLine(item, constraints, { allocate: false, reason: item.eligibilityReasons[0] ?? emptyReason, concentration: false }),
    ),
    warnings: [
      constraints.reserveMinimumCents == null ? "Reserva mínima não definida." : "",
    ].filter(Boolean),
    opportunityCosts: [],
    capitalAvailableCents: constraints.capitalAvailableCents,
    capitalAllocatedCents: constraints.capitalAvailableCents == null ? null : 0,
    capitalPreservedCents: constraints.capitalAvailableCents,
    hoursAvailableHundredths: constraints.hoursAvailableHundredths,
    hoursAllocatedHundredths: constraints.hoursAvailableHundredths == null ? null : 0,
    hoursPreservedHundredths: constraints.hoursAvailableHundredths,
    capacityLimit: constraints.capacityLimit,
    capacityUsed: constraints.activeInitiativeCount,
    reserveDefined: constraints.reserveMinimumCents != null,
    reserveLabel:
      constraints.reserveMinimumCents == null
        ? "Reserva mínima não definida."
        : `Reserva mínima configurada: ${formatBRL(fromCents(constraints.reserveMinimumCents))}.`,
    coverage,
    readiness: portfolioReadiness(assessed),
    emptyReason,
  };
}
