import "server-only";

import {
  AllocationHorizon,
  AllocationScenarioKind,
  AllocationStatus,
  AuditSource,
  DecisionStatus,
  ExperimentClassification,
  ExperimentStatus,
  OpportunityStatus,
  Prisma,
} from "@prisma/client";
import { isClosedTaskStatus } from "@/lib/execution";
import { toNumber } from "@/lib/format";
import { centsToDecimalString, hoursToHundredths, toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  allocateResources,
  compareScenarios,
  composeAllocationSummary,
  companyCapitalMap,
  sensitivityAnalysis,
  buildAllocationAIContext,
  type AllocationCandidate,
  type AllocationConstraints,
  type AllocationResult,
} from "@/lib/resource-allocation-engine";
import { writeAudit } from "@/services/auditService";
import { createExecutionPlanFromOpportunity } from "@/services/executionService";
import { loadPortfolioBundle } from "@/services/portfolioService";

const OPEN_OPPORTUNITY = [
  OpportunityStatus.DRAFT,
  OpportunityStatus.ACTIVE,
  OpportunityStatus.IN_PROGRESS,
  OpportunityStatus.VALIDATED,
];

export type BudgetInput = {
  capitalAvailable?: number | null;
  hoursAvailable?: number | null;
  capacityLimit?: number | null;
  reserveMinimum?: number | null;
  maxPerCompany?: number | null;
  maxPerInitiative?: number | null;
  maxPercentPerInitiative?: number | null;
  horizon?: AllocationHorizon;
  scenario?: AllocationScenarioKind;
};

export type AllocationWorkspace = {
  budget: BudgetInput;
  result: AllocationResult | null;
  comparison: ReturnType<typeof compareScenarios> | null;
  sensitivity: ReturnType<typeof sensitivityAnalysis> | null;
  proposals: Array<{
    id: string;
    version: number;
    status: AllocationStatus;
    scenario: AllocationScenarioKind;
    updatedAt: string;
    decisionId: string | null;
  }>;
  latest: {
    id: string;
    version: number;
    status: AllocationStatus;
    updatedAt: string;
    decisionId: string | null;
    actionPlanId: string | null;
  } | null;
  summary: AllocationCockpitSummary;
  coverage: string;
  companies: Array<{ id: string; name: string }>;
};

export type AllocationCockpitSummary = {
  capitalAvailable: number | null;
  capitalProposed: number | null;
  capitalPreserved: number | null;
  hoursAvailable: number | null;
  hoursProposed: number | null;
  capacityUsed: number | null;
  capacityLimit: number | null;
  pendingDecisions: number;
  readiness: AllocationResult["readiness"] | null;
  status: AllocationStatus | null;
};

function decimalFromCents(cents: number | null | undefined): Prisma.Decimal | null {
  if (cents == null) return null;
  return new Prisma.Decimal(centsToDecimalString(cents));
}

function decimalFromHours(hundredths: number | null | undefined): Prisma.Decimal | null {
  if (hundredths == null) return null;
  return new Prisma.Decimal((hundredths / 100).toFixed(2));
}

function constraintsFromBudget(budget: BudgetInput, activeInitiativeCount: number): AllocationConstraints {
  return {
    capitalAvailableCents: toCents(budget.capitalAvailable ?? null),
    hoursAvailableHundredths: hoursToHundredths(budget.hoursAvailable ?? null),
    capacityLimit: budget.capacityLimit ?? null,
    reserveMinimumCents: toCents(budget.reserveMinimum ?? null),
    maxPerCompanyCents: toCents(budget.maxPerCompany ?? null),
    maxPerInitiativeCents: toCents(budget.maxPerInitiative ?? null),
    maxPercentPerInitiative: budget.maxPercentPerInitiative ?? null,
    horizon: budget.horizon ?? "DAYS_90",
    scenario: budget.scenario ?? "BALANCEADO",
    activeInitiativeCount,
  };
}

export async function loadAllocationCandidates(ownerId: string): Promise<{
  candidates: AllocationCandidate[];
  activeInitiativeCount: number;
  companies: Array<{ id: string; name: string }>;
}> {
  const companies = await prisma.company.findMany({
    where: { ownerId, status: "ACTIVE" },
    select: { id: true, name: true, segment: true },
  });
  const ids = companies.map((item) => item.id);
  if (!ids.length) return { candidates: [], activeInitiativeCount: 0, companies: [] };

  const [opportunities, plans, experiments, decisions, portfolio] = await Promise.all([
    prisma.opportunity.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      select: {
        id: true,
        companyId: true,
        title: true,
        description: true,
        investment: true,
        estimatedHours: true,
        expectedReturn: true,
        paybackMonths: true,
        expectedImpact: true,
        urgency: true,
        score: true,
        evidenceLevel: true,
        status: true,
        evidence: { select: { classification: true }, take: 4 },
      },
    }),
    prisma.actionPlan.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      select: {
        id: true,
        companyId: true,
        title: true,
        summary: true,
        decision: { select: { opportunityId: true, status: true } },
        tasks: { select: { status: true } },
      },
    }),
    prisma.experiment.findMany({
      where: { companyId: { in: ids }, company: { ownerId } },
      select: {
        id: true,
        companyId: true,
        opportunityId: true,
        title: true,
        hypothesis: true,
        investment: true,
        status: true,
        classification: true,
        evidence: { select: { classification: true }, take: 4 },
      },
    }),
    prisma.decision.findMany({
      where: {
        OR: [{ createdById: ownerId }, { company: { ownerId } }],
        status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
      },
      select: { id: true, companyId: true, opportunityId: true, title: true, status: true, rationale: true },
    }),
    loadPortfolioBundle(ownerId),
  ]);

  const companyById = new Map(companies.map((item) => [item.id, item]));
  const cashByCompany = new Map(portfolio.inputs.map((item) => [item.id, toCents(item.finance.cash)]));
  const priorityByOpportunity = new Map<string, number>();
  for (const item of portfolio.priorities) {
    const source = item.sourceRefs.find((ref) => ref.startsWith("opportunity:"));
    if (source) priorityByOpportunity.set(source.slice("opportunity:".length), item.score);
  }

  const candidates: AllocationCandidate[] = [];
  const seen = new Set<string>();

  for (const row of opportunities) {
    const company = companyById.get(row.companyId);
    if (!company) continue;
    const blocked =
      row.status === OpportunityStatus.ARCHIVED || row.status === OpportunityStatus.REJECTED
        ? "Oportunidade arquivada ou rejeitada."
        : null;
    const key = `OPPORTUNITY:${row.id}`;
    seen.add(key);
    candidates.push({
      id: key,
      companyId: company.id,
      companyName: company.name,
      companySegment: company.segment,
      sourceKind: "OPPORTUNITY",
      sourceId: row.id,
      title: row.title,
      description: row.description,
      investmentCents: toCents(toNumber(row.investment)),
      hoursHundredths: hoursToHundredths(toNumber(row.estimatedHours)),
      expectedMonthlyReturnCents: toCents(toNumber(row.expectedReturn)),
      paybackMonthsHundredths: hoursToHundredths(toNumber(row.paybackMonths)),
      impact: row.expectedImpact,
      urgency: row.urgency,
      score: row.score,
      evidenceLevel: row.evidenceLevel,
      status: row.status,
      reversible: true,
      dependencyBlocked: false,
      blockedReason: blocked,
      hasValidatedEvidence: row.evidence.some((item) => item.classification === ExperimentClassification.VALIDATED),
      cashCents: cashByCompany.get(company.id) ?? null,
      priorityScore: priorityByOpportunity.get(row.id) ?? null,
    });
  }

  for (const row of experiments) {
    if (!row.companyId) continue;
    const company = companyById.get(row.companyId);
    if (!company) continue;
    if (row.opportunityId && seen.has(`OPPORTUNITY:${row.opportunityId}`)) continue;
    const blocked =
      row.status === ExperimentStatus.ABANDONED ||
      row.status === ExperimentStatus.CANCELLED ||
      row.classification === ExperimentClassification.REFUTED
        ? "Experimento incompatível, abandonado ou refutado."
        : null;
    const key = `EXPERIMENT:${row.id}`;
    seen.add(key);
    candidates.push({
      id: key,
      companyId: company.id,
      companyName: company.name,
      companySegment: company.segment,
      sourceKind: "EXPERIMENT",
      sourceId: row.id,
      title: row.title,
      description: row.hypothesis,
      investmentCents: toCents(toNumber(row.investment)),
      hoursHundredths: null,
      expectedMonthlyReturnCents: null,
      paybackMonthsHundredths: null,
      impact: null,
      urgency: row.status === ExperimentStatus.COMPLETED ? 4 : 2,
      score: null,
      evidenceLevel: row.evidence.some((item) => item.classification === ExperimentClassification.VALIDATED)
        ? "VALIDATED_EVIDENCE"
        : "TESTING",
      status: row.classification ?? row.status,
      reversible: row.status !== ExperimentStatus.COMPLETED,
      dependencyBlocked: false,
      blockedReason: blocked,
      hasValidatedEvidence: row.evidence.some((item) => item.classification === ExperimentClassification.VALIDATED),
      cashCents: cashByCompany.get(company.id) ?? null,
      priorityScore: null,
    });
  }

  for (const row of plans) {
    if (!row.companyId) continue;
    const company = companyById.get(row.companyId);
    if (!company) continue;
    if (row.decision?.opportunityId && seen.has(`OPPORTUNITY:${row.decision.opportunityId}`)) continue;
    const key = `PLAN:${row.id}`;
    seen.add(key);
    candidates.push({
      id: key,
      companyId: company.id,
      companyName: company.name,
      companySegment: company.segment,
      sourceKind: "PLAN",
      sourceId: row.id,
      title: row.title,
      description: row.summary,
      investmentCents: null,
      hoursHundredths: null,
      expectedMonthlyReturnCents: null,
      paybackMonthsHundredths: null,
      impact: null,
      urgency: 3,
      score: null,
      evidenceLevel: null,
      status: row.decision?.status ?? "ACTIVE",
      reversible: true,
      dependencyBlocked: false,
      blockedReason: null,
      hasValidatedEvidence: false,
      cashCents: cashByCompany.get(company.id) ?? null,
      priorityScore: null,
    });
  }

  for (const row of decisions) {
    if (row.opportunityId && seen.has(`OPPORTUNITY:${row.opportunityId}`)) continue;
    if (!row.companyId) continue;
    const company = companyById.get(row.companyId);
    if (!company) continue;
    const key = `DECISION:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      id: key,
      companyId: company.id,
      companyName: company.name,
      companySegment: company.segment,
      sourceKind: "DECISION",
      sourceId: row.id,
      title: row.title,
      description: row.rationale,
      investmentCents: null,
      hoursHundredths: null,
      expectedMonthlyReturnCents: null,
      paybackMonthsHundredths: null,
      impact: null,
      urgency: 3,
      score: null,
      evidenceLevel: null,
      status: row.status,
      reversible: true,
      dependencyBlocked: false,
      blockedReason: null,
      hasValidatedEvidence: false,
      cashCents: cashByCompany.get(company.id) ?? null,
      priorityScore: null,
    });
  }

  const activePlans = plans.filter((plan) => plan.tasks.some((task) => !isClosedTaskStatus(task.status))).length;
  const activeExperiments = experiments.filter(
    (item) => item.status === ExperimentStatus.READY || item.status === ExperimentStatus.RUNNING,
  ).length;

  return {
    candidates: candidates.filter((item) => {
      if (item.sourceKind !== "OPPORTUNITY") return true;
      return OPEN_OPPORTUNITY.some((status) => status === item.status) || Boolean(item.blockedReason);
    }),
    activeInitiativeCount: activePlans + activeExperiments,
    companies: companies.map((item) => ({ id: item.id, name: item.name })),
  };
}

export async function getBudget(ownerId: string): Promise<BudgetInput> {
  const row = await prisma.resourceBudget.findUnique({ where: { ownerId } });
  if (!row) {
    return { horizon: "DAYS_90", scenario: "BALANCEADO" };
  }
  return {
    capitalAvailable: toNumber(row.capitalAvailable),
    hoursAvailable: toNumber(row.hoursAvailable),
    capacityLimit: row.capacityLimit,
    reserveMinimum: toNumber(row.reserveMinimum),
    maxPerCompany: toNumber(row.maxPerCompany),
    maxPerInitiative: toNumber(row.maxPerInitiative),
    maxPercentPerInitiative: toNumber(row.maxPercentPerInitiative),
    horizon: row.horizon,
    scenario: "BALANCEADO",
  };
}

export async function saveBudget(ownerId: string, input: BudgetInput) {
  const data = {
    capitalAvailable: input.capitalAvailable ?? null,
    hoursAvailable: input.hoursAvailable ?? null,
    capacityLimit: input.capacityLimit ?? null,
    reserveMinimum: input.reserveMinimum ?? null,
    maxPerCompany: input.maxPerCompany ?? null,
    maxPerInitiative: input.maxPerInitiative ?? null,
    maxPercentPerInitiative: input.maxPercentPerInitiative ?? null,
    horizon: input.horizon ?? "DAYS_90",
  };
  await prisma.resourceBudget.upsert({
    where: { ownerId },
    update: data,
    create: { ownerId, ...data },
  });
}

export async function simulateAllocation(ownerId: string, input: BudgetInput) {
  await assertOwner(ownerId);
  await saveBudget(ownerId, input);
  const { candidates, activeInitiativeCount, companies } = await loadAllocationCandidates(ownerId);
  const constraints = constraintsFromBudget(input, activeInitiativeCount);
  const result = allocateResources(candidates, constraints);
  const comparison = compareScenarios(candidates, constraints);
  const sensitivity = sensitivityAnalysis(candidates, constraints);
  const latest = await prisma.allocationProposal.findFirst({
    where: { ownerId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  const proposal = await prisma.allocationProposal.create({
    data: {
      ownerId,
      version,
      status: AllocationStatus.SIMULATION,
      scenario: constraints.scenario,
      horizon: constraints.horizon,
      capitalAvailable: decimalFromCents(result.capitalAvailableCents),
      hoursAvailable: decimalFromHours(result.hoursAvailableHundredths),
      capacityLimit: constraints.capacityLimit,
      reserveMinimum: decimalFromCents(constraints.reserveMinimumCents),
      maxPerCompany: decimalFromCents(constraints.maxPerCompanyCents),
      maxPerInitiative: decimalFromCents(constraints.maxPerInitiativeCents),
      maxPercentPerInitiative: constraints.maxPercentPerInitiative ?? null,
      capitalAllocated: decimalFromCents(result.capitalAllocatedCents),
      capitalPreserved: decimalFromCents(result.capitalPreservedCents),
      hoursAllocated: decimalFromHours(result.hoursAllocatedHundredths),
      hoursPreserved: decimalFromHours(result.hoursPreservedHundredths),
      snapshot: result as unknown as Prisma.InputJsonValue,
      items: {
        create: [...result.allocated, ...result.unallocated].map((item) => ({
          companyId: companies.some((company) => company.id === item.companyId) ? item.companyId : null,
          sourceKind: item.sourceKind,
          sourceId: item.sourceId,
          title: item.title,
          allocated: item.allocated,
          skipReason: item.skipReason,
          eligibility: item.eligibility,
          readiness: item.readiness,
          risk: item.risk,
          evidenceClass: item.evidenceClass,
          capital: decimalFromCents(item.capitalCents),
          hours: decimalFromHours(item.hoursHundredths),
          expectedReturn: decimalFromCents(item.expectedMonthlyReturnCents),
          paybackMonths: decimalFromHours(item.paybackMonthsHundredths),
          estimatedRoiBps: item.roiBps,
          rationale: item.rationale,
          explanation: item.explanation as unknown as Prisma.InputJsonValue,
        })),
      },
    },
  });
  await writeAudit({
    actorId: ownerId,
    action: version > 1 ? "allocation.recalculated" : "allocation.simulated",
    entity: "AllocationProposal",
    entityId: proposal.id,
    newValue: { version, scenario: constraints.scenario, allocated: result.allocated.length },
    origin: AuditSource.USER,
  });
  return { proposalId: proposal.id, version, result, comparison, sensitivity };
}

async function ownedProposal(ownerId: string, proposalId: string) {
  const proposal = await prisma.allocationProposal.findFirst({
    where: { id: proposalId, ownerId },
    include: { items: true, decision: true },
  });
  if (!proposal) throw new Error("Proposta de alocação não encontrada.");
  return proposal;
}

function requireFresh(proposal: { updatedAt: Date }, expectedUpdatedAt?: string) {
  if (expectedUpdatedAt && proposal.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new Error("A proposta foi atualizada em outra sessão. Recarregue e tente de novo.");
  }
}

export async function reviewAllocationProposal(input: {
  ownerId: string;
  proposalId: string;
  expectedUpdatedAt?: string;
}) {
  const proposal = await ownedProposal(input.ownerId, input.proposalId);
  requireFresh(proposal, input.expectedUpdatedAt);
  if (proposal.status === AllocationStatus.APPROVED) {
    throw new Error("Decisão aprovada não é alterada por nova revisão.");
  }
  const updated = await prisma.allocationProposal.update({
    where: { id: proposal.id },
    data: { status: AllocationStatus.PROPOSAL },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: proposal.status === AllocationStatus.SIMULATION ? "allocation.proposal_created" : "allocation.proposal_reviewed",
    entity: "AllocationProposal",
    entityId: proposal.id,
    previousValue: { status: proposal.status },
    newValue: { status: updated.status },
    origin: AuditSource.USER,
  });
  return updated;
}

export async function sendAllocationToDecision(input: {
  ownerId: string;
  proposalId: string;
  expectedUpdatedAt?: string;
}) {
  const proposal = await ownedProposal(input.ownerId, input.proposalId);
  requireFresh(proposal, input.expectedUpdatedAt);
  if (proposal.status === AllocationStatus.APPROVED) {
    throw new Error("Decisão aprovada não é substituída por nova simulação.");
  }
  const snapshot = proposal.snapshot as unknown as AllocationResult;
  const first = snapshot.allocated?.[0];
  if (first?.companyId) {
    const company = await prisma.company.findFirst({ where: { id: first.companyId, ownerId: input.ownerId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }
  const decision = await prisma.decision.create({
    data: {
      createdById: input.ownerId,
      companyId: first?.companyId ?? null,
      opportunityId: first?.sourceKind === "OPPORTUNITY" ? first.sourceId : null,
      title: `Alocação de recursos — ${proposal.scenario} — v${proposal.version}`,
      rationale: composeAllocationSummary(snapshot),
      origin: AuditSource.USER,
      requiresHumanApproval: true,
      status: DecisionStatus.PENDING_HUMAN_APPROVAL,
    },
  });
  const updated = await prisma.allocationProposal.update({
    where: { id: proposal.id },
    data: { status: AllocationStatus.SENT_TO_DECISION, decisionId: decision.id },
  });
  await writeAudit({
    actorId: input.ownerId,
    action: "allocation.sent_to_decision",
    entity: "AllocationProposal",
    entityId: proposal.id,
    newValue: { decisionId: decision.id, status: updated.status },
    origin: AuditSource.USER,
  });
  return { proposal: updated, decisionId: decision.id };
}

export async function syncAllocationFromDecision(input: {
  actorId: string;
  decisionId: string;
  status: "APPROVED" | "REJECTED";
}) {
  const proposal = await prisma.allocationProposal.findFirst({
    where: { decisionId: input.decisionId, ownerId: input.actorId },
  });
  if (!proposal) return null;
  const next = input.status === "APPROVED" ? AllocationStatus.APPROVED : AllocationStatus.REJECTED;
  const updated = await prisma.allocationProposal.update({
    where: { id: proposal.id },
    data: { status: next },
  });
  await writeAudit({
    actorId: input.actorId,
    action: input.status === "APPROVED" ? "allocation.approved" : "allocation.rejected",
    entity: "AllocationProposal",
    entityId: proposal.id,
    previousValue: { status: proposal.status },
    newValue: { status: updated.status },
    origin: AuditSource.USER,
  });
  return updated;
}

export async function createPlanFromApprovedAllocation(input: { ownerId: string; proposalId: string }) {
  const proposal = await ownedProposal(input.ownerId, input.proposalId);
  if (proposal.status !== AllocationStatus.APPROVED) {
    throw new Error("Só é possível criar plano após aprovação humana.");
  }
  const snapshot = proposal.snapshot as unknown as AllocationResult;
  const first = snapshot.allocated.find((item) => item.sourceKind === "OPPORTUNITY");
  if (!first) throw new Error("Não há oportunidade alocada para gerar plano.");
  const company = await prisma.company.findFirst({ where: { id: first.companyId, ownerId: input.ownerId } });
  if (!company) throw new Error("Empresa não encontrada.");
  const plan = await createExecutionPlanFromOpportunity(input.ownerId, first.companyId, {
    companyId: first.companyId,
    opportunityId: first.sourceId,
    title: `Executar alocação: ${first.title}`.slice(0, 160),
    summary: first.rationale,
    goal30: "Revisar premissas e iniciar a primeira etapa da iniciativa aprovada.",
    goal60: "Avançar a execução e medir os indicadores já persistidos.",
    goal90: "Consolidar resultado e registrar evidência. Sem afirmar sucesso sem validação.",
  });
  await prisma.allocationProposal.update({
    where: { id: proposal.id },
    data: { actionPlanId: plan.id },
  });
  return plan;
}

export async function getAllocationWorkspace(ownerId: string): Promise<AllocationWorkspace> {
  const [budget, loaded, proposals, pendingDecisions] = await Promise.all([
    getBudget(ownerId),
    loadAllocationCandidates(ownerId),
    prisma.allocationProposal.findMany({
      where: { ownerId },
      orderBy: { version: "desc" },
      take: 8,
      select: {
        id: true,
        version: true,
        status: true,
        scenario: true,
        updatedAt: true,
        decisionId: true,
        actionPlanId: true,
        snapshot: true,
      },
    }),
    prisma.decision.count({
      where: {
        OR: [{ createdById: ownerId }, { company: { ownerId } }],
        status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
      },
    }),
  ]);
  const latestRow = proposals[0] ?? null;
  const latestResult = latestRow ? (latestRow.snapshot as unknown as AllocationResult) : null;
  const constraints = constraintsFromBudget(budget, loaded.activeInitiativeCount);
  const live =
    latestResult ??
    (budget.capitalAvailable != null || budget.hoursAvailable != null
      ? allocateResources(loaded.candidates, constraints)
      : null);
  const comparison = live ? compareScenarios(loaded.candidates, constraints) : null;
  const sensitivity = live ? sensitivityAnalysis(loaded.candidates, constraints) : null;
  return {
    budget,
    result: live,
    comparison,
    sensitivity,
    proposals: proposals.map((item) => ({
      id: item.id,
      version: item.version,
      status: item.status,
      scenario: item.scenario,
      updatedAt: item.updatedAt.toISOString(),
      decisionId: item.decisionId,
    })),
    latest: latestRow
      ? {
          id: latestRow.id,
          version: latestRow.version,
          status: latestRow.status,
          updatedAt: latestRow.updatedAt.toISOString(),
          decisionId: latestRow.decisionId,
          actionPlanId: latestRow.actionPlanId,
        }
      : null,
    summary: {
      capitalAvailable: budget.capitalAvailable ?? null,
      capitalProposed: live?.capitalAllocatedCents != null ? Number((live.capitalAllocatedCents / 100).toFixed(2)) : null,
      capitalPreserved: live?.capitalPreservedCents != null ? Number((live.capitalPreservedCents / 100).toFixed(2)) : null,
      hoursAvailable: budget.hoursAvailable ?? null,
      hoursProposed: live?.hoursAllocatedHundredths != null ? Number((live.hoursAllocatedHundredths / 100).toFixed(2)) : null,
      capacityUsed: live?.capacityUsed ?? loaded.activeInitiativeCount,
      capacityLimit: budget.capacityLimit ?? null,
      pendingDecisions,
      readiness: live?.readiness ?? null,
      status: latestRow?.status ?? null,
    },
    coverage: live?.coverage.label ?? `${loaded.companies.length} empresas na carteira.`,
    companies: loaded.companies,
  };
}

export async function getAllocationCockpitSummary(ownerId: string): Promise<AllocationCockpitSummary> {
  const [budget, latest, pendingDecisions] = await Promise.all([
    getBudget(ownerId),
    prisma.allocationProposal.findFirst({
      where: { ownerId },
      orderBy: { version: "desc" },
      select: { status: true, snapshot: true },
    }),
    prisma.decision.count({
      where: {
        OR: [{ createdById: ownerId }, { company: { ownerId } }],
        status: { in: [DecisionStatus.PENDING_HUMAN_APPROVAL, DecisionStatus.DEFERRED] },
      },
    }),
  ]);
  const live = latest ? (latest.snapshot as unknown as AllocationResult) : null;
  return {
    capitalAvailable: budget.capitalAvailable ?? null,
    capitalProposed: live?.capitalAllocatedCents != null ? Number((live.capitalAllocatedCents / 100).toFixed(2)) : null,
    capitalPreserved: live?.capitalPreservedCents != null ? Number((live.capitalPreservedCents / 100).toFixed(2)) : null,
    hoursAvailable: budget.hoursAvailable ?? null,
    hoursProposed: live?.hoursAllocatedHundredths != null ? Number((live.hoursAllocatedHundredths / 100).toFixed(2)) : null,
    capacityUsed: live?.capacityUsed ?? null,
    capacityLimit: budget.capacityLimit ?? null,
    pendingDecisions,
    readiness: live?.readiness ?? null,
    status: latest?.status ?? null,
  };
}

export async function getAllocationAIBundle(ownerId: string) {
  const workspace = await getAllocationWorkspace(ownerId);
  if (!workspace.result) {
    return {
      summary: "Informe os recursos disponíveis para iniciar uma simulação.",
      context: buildAllocationAIContext({
        ownerId,
        result: allocateResources([], {
          capitalAvailableCents: null,
          hoursAvailableHundredths: null,
          capacityLimit: null,
          reserveMinimumCents: null,
          maxPerCompanyCents: null,
          maxPerInitiativeCents: null,
          maxPercentPerInitiative: null,
          horizon: "DAYS_90",
          scenario: "BALANCEADO",
          activeInitiativeCount: 0,
        }),
        companyIds: workspace.companies.map((item) => item.id),
      }),
    };
  }
  return {
    summary: composeAllocationSummary(workspace.result),
    context: buildAllocationAIContext({
      ownerId,
      result: workspace.result,
      companyIds: workspace.companies.map((item) => item.id),
    }),
    map: companyCapitalMap(workspace.result),
  };
}

async function assertOwner(ownerId: string) {
  const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!user) throw new Error("Usuário não encontrado.");
}

export async function assertOwnedAllocationIds(ownerId: string, input: { companyId?: string; opportunityId?: string }) {
  if (input.companyId) {
    const company = await prisma.company.findFirst({ where: { id: input.companyId, ownerId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }
  if (input.opportunityId) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, company: { ownerId } },
    });
    if (!opportunity) throw new Error("Oportunidade não encontrada.");
  }
}
