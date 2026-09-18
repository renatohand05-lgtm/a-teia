import "server-only";

import { AIActionStatus, AIActionType, AuditSource, Prisma } from "@prisma/client";
import { DIAGNOSTIC_DIMENSIONS, type DiagnosticDimensionKey } from "@/lib/diagnostic";
import { isAllowedProposedAction, type ProposedAction } from "@/lib/ai-executive-engine";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";
import { createExecutionPlanFromOpportunity } from "@/services/executionService";
import { createExperiment } from "@/services/experimentService";
import { createManualOpportunity } from "@/services/opportunityService";

function dimensionKey(value: unknown): DiagnosticDimensionKey {
  const keys = DIAGNOSTIC_DIMENSIONS.map((item) => item.key) as DiagnosticDimensionKey[];
  return keys.includes(value as DiagnosticDimensionKey) ? (value as DiagnosticDimensionKey) : "operations";
}

export async function persistProposedActions(input: {
  userId: string;
  companyId: string;
  conversationId: string;
  messageId: string;
  actions: ProposedAction[];
}): Promise<ProposedAction[]> {
  const company = await prisma.company.findFirst({ where: { id: input.companyId, ownerId: input.userId } });
  if (!company) throw new Error("Empresa não encontrada.");

  const stored: ProposedAction[] = [];
  for (const action of input.actions) {
    if (!isAllowedProposedAction(action.type)) continue;
    const row = await prisma.aIActionProposal.create({
      data: {
        conversationId: input.conversationId,
        messageId: input.messageId,
        companyId: input.companyId,
        createdById: input.userId,
        type: action.type as AIActionType,
        title: action.title,
        rationale: action.rationale,
        payload: action.payload as Prisma.InputJsonValue,
        status: AIActionStatus.PENDING,
      },
    });
    stored.push({ ...action, id: row.id });
    await writeAudit({
      actorId: input.userId,
      action: "ai.action.proposed",
      entity: "AIActionProposal",
      entityId: row.id,
      newValue: { type: row.type, companyId: input.companyId },
      origin: AuditSource.AI,
    });
  }
  return stored;
}

export async function confirmProposedAction(ownerId: string, proposalId: string): Promise<{ href: string; title: string }> {
  const proposal = await prisma.aIActionProposal.findFirst({
    where: { id: proposalId, createdById: ownerId, company: { ownerId } },
  });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== AIActionStatus.PENDING) throw new Error("Esta proposta já foi decidida.");
  if (!isAllowedProposedAction(proposal.type)) throw new Error("Ação não permitida.");

  const payload = (proposal.payload ?? {}) as Record<string, unknown>;
  let resultEntity = "";
  let resultId = "";
  let href = `/empresas/${proposal.companyId}`;

  if (proposal.type === AIActionType.CREATE_OPPORTUNITY) {
    const created = await createManualOpportunity(ownerId, proposal.companyId, {
      title: String(payload.title ?? proposal.title),
      problemStatement: String(payload.problemStatement ?? "Problema registrado a partir da análise executiva."),
      hypothesis: String(payload.hypothesis ?? "Hipótese a ser testada."),
      sourceDimension: dimensionKey(payload.sourceDimension),
      expectedImpact: Number(payload.expectedImpact ?? 3),
      urgency: Number(payload.urgency ?? 3),
      effort: Number(payload.effort ?? 3),
      confidence: Number(payload.confidence ?? 3),
    });
    resultEntity = "Opportunity";
    resultId = created.id;
    href = `/empresas/${proposal.companyId}/oportunidades/${created.id}`;
  }

  if (proposal.type === AIActionType.CREATE_PLAN) {
    const opportunityId = String(payload.opportunityId ?? "");
    if (!opportunityId) throw new Error("A proposta de plano exige uma oportunidade persistida.");
    const created = await createExecutionPlanFromOpportunity(ownerId, proposal.companyId, {
      companyId: proposal.companyId,
      opportunityId,
      title: String(payload.title ?? proposal.title),
      summary: String(payload.summary ?? proposal.rationale),
      goal30: String(payload.goal30 ?? "Mapear causa, dono e indicador nas primeiras 4 semanas."),
      goal60: String(payload.goal60 ?? "Executar o ajuste principal e começar a medição."),
      goal90: String(payload.goal90 ?? "Revisar o resultado medido e decidir continuidade."),
    });
    resultEntity = "ActionPlan";
    resultId = created.id;
    href = `/empresas/${proposal.companyId}/execucao/${created.id}`;
  }

  if (proposal.type === AIActionType.CREATE_EXPERIMENT) {
    const created = await createExperiment(ownerId, {
      companyId: proposal.companyId,
      opportunityId: typeof payload.opportunityId === "string" ? payload.opportunityId : undefined,
      title: String(payload.title ?? proposal.title),
      hypothesis: String(payload.hypothesis ?? "Hipótese a ser testada com medição."),
      kpi: String(payload.kpi ?? "Indicador principal"),
      direction: payload.direction === "LOWER_IS_BETTER" ? "LOWER_IS_BETTER" : "HIGHER_IS_BETTER",
    });
    resultEntity = "Experiment";
    resultId = created.id;
    href = `/empresas/${proposal.companyId}/experimentos/${created.id}`;
  }

  await prisma.aIActionProposal.update({
    where: { id: proposal.id },
    data: {
      status: AIActionStatus.CONFIRMED,
      confirmedAt: new Date(),
      resultEntity,
      resultId,
    },
  });

  await writeAudit({
    actorId: ownerId,
    action: "ai.action.confirmed",
    entity: "AIActionProposal",
    entityId: proposal.id,
    newValue: { type: proposal.type, resultEntity, resultId },
    origin: AuditSource.USER,
  });

  return { href, title: proposal.title };
}

export async function rejectProposedAction(ownerId: string, proposalId: string) {
  const proposal = await prisma.aIActionProposal.findFirst({
    where: { id: proposalId, createdById: ownerId, company: { ownerId } },
  });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== AIActionStatus.PENDING) throw new Error("Esta proposta já foi decidida.");
  await prisma.aIActionProposal.update({
    where: { id: proposal.id },
    data: { status: AIActionStatus.REJECTED },
  });
}
