import "server-only";

import { periodLabel } from "@/lib/period";
import {
  type ExecutiveContext,
  type ExecutiveEvidence,
} from "@/lib/ai-executive-engine";
import { getCompany } from "@/services/companyService";
import { getLatestDiagnosis } from "@/services/diagnosisService";
import { listExecutionPlans } from "@/services/executionService";
import { listExperiments } from "@/services/experimentService";
import { getFinancialMiniSummary } from "@/services/financialService";
import { listCompanyMemories } from "@/services/memoryService";
import { getOnboarding } from "@/services/onboardingService";
import { listOwnerConnections } from "@/services/connectionService";
import { listOwnerPlaybooksForAi } from "@/services/playbookService";
import { listOpportunities } from "@/services/opportunityService";

export async function getExecutiveContext(ownerId: string, companyId: string): Promise<ExecutiveContext> {
  const company = await getCompany(ownerId, companyId);
  if (!company) {
    throw new Error("Empresa não encontrada.");
  }

  const [diagnosis, opportunities, plans, finance, experiments, memories, onboarding, connections, playbooks] = await Promise.all([
    getLatestDiagnosis(ownerId, companyId),
    listOpportunities(ownerId, companyId, { status: "ALL" }),
    listExecutionPlans(ownerId, companyId),
    getFinancialMiniSummary(ownerId, companyId),
    listExperiments(ownerId, companyId),
    listCompanyMemories(ownerId, companyId, { status: "APPROVED" }),
    getOnboarding(ownerId, companyId),
    listOwnerConnections(ownerId, { companyId }),
    listOwnerPlaybooksForAi(ownerId, companyId),
  ]);

  const evidence: ExecutiveEvidence[] = experiments.flatMap((item) =>
    item.evidence.map((entry) => ({
      title: entry.title,
      classification: entry.classification,
      experimentTitle: item.title,
    })),
  );

  const planByOpportunity = new Set(plans.map((plan) => plan.opportunityId).filter(Boolean));

  return {
    company: {
      id: company.id,
      name: company.name,
      segment: company.segment,
      revenueMonthly: company.revenueMonthly,
      marginPercent: company.marginPercent,
      teamSize: company.teamSize,
      city: onboarding?.city ?? null,
      state: onboarding?.state ?? null,
      perceivedBottlenecks: company.perceivedBottlenecks,
      objectives: company.objectives,
      notes: company.notes ? company.notes.slice(0, 400) : null,
    },
    diagnosis: diagnosis
      ? {
          overallScore: diagnosis.overallScore,
          maturity: diagnosis.maturity,
          bottleneck: diagnosis.bottleneck,
          dimensions: diagnosis.dimensions.map((item) => ({ name: item.name, score: item.score })),
          createdAt: diagnosis.createdAt,
        }
      : null,
    opportunities: opportunities.slice(0, 8).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      priorityScore: item.priorityScore,
      evidenceLevel: item.evidenceLevel,
      impact: item.expectedImpact,
      urgency: item.urgency,
      hypothesis: item.hypothesis,
      sourceDimension: item.sourceDimension,
      hasPlan: planByOpportunity.has(item.id),
    })),
    plans: plans.slice(0, 6).map((plan) => ({
      title: plan.title,
      progress: plan.progress,
      overdueCount: plan.overdueCount,
      opportunityTitle: plan.opportunityTitle,
      tasks: plan.tasks.slice(0, 8).map((task) => ({
        title: task.title,
        status: task.status,
        overdue: task.overdue,
        dueAt: task.dueAt,
      })),
    })),
    finance: finance
      ? {
          periodLabel: periodLabel(finance.period),
          grossRevenue: finance.dre.grossRevenue,
          netRevenue: finance.dre.netRevenue,
          cogsPercent: finance.ratios.cogsPercent,
          grossMarginPercent: finance.ratios.grossMarginPercent,
          payrollPercent: finance.ratios.payrollPercent,
          ebitda: finance.dre.ebitda,
          ebitdaPercent: finance.ratios.ebitdaPercent,
          breakEven: finance.breakEven.value,
          revenueTarget: finance.goals.revenueTarget,
          revenueGap: finance.comparisons.revenue.difference,
          cogsTarget: finance.goals.cogsPercentTarget,
          cashBalance: finance.cashMonth.hasMovements ? finance.cashMonth.operatingBalance : null,
          scenarios: finance.scenarios.map((item) => ({
            label: item.label,
            revenue: item.dre.grossRevenue,
            ebitda: item.dre.ebitda,
          })),
          informed: Boolean(finance.dre.informed.grossRevenue || finance.dre.informed.cogs || finance.goals.revenueTarget != null),
        }
      : null,
    experiments: experiments.slice(0, 6).map((item) => ({
      title: item.title,
      status: item.status,
      hypothesis: item.hypothesis,
      classification: item.classification,
      kpi: item.kpi,
      baseline: item.baseline,
      target: item.target,
      finalValue: item.finalValue,
      measurements: item.measurements.slice(-3).map((entry) => ({
        value: entry.measuredValue,
        recordedAt: entry.recordedAt,
      })),
      evidenceTitles: item.evidence.map((entry) => entry.title),
    })),
    evidence: evidence.slice(0, 8),
    memories: memories.slice(0, 6).map((item) => ({
      title: item.title,
      lesson: item.lesson,
      origin: item.origin,
      companyName: item.companyName,
      experimentTitle: item.experimentTitle,
      confidence: item.confidence,
      limitations: item.limitations,
      validated: item.validated,
      transferabilityLabel: null,
    })),
    connections: connections.slice(0, 8).map((item) => ({
      fromName: item.fromName,
      toName: item.toName,
      type: item.type,
      status: item.status,
      classification: item.classification,
      score: item.score,
      scorePartial: item.scorePartial,
      hypothesis: item.hypothesis,
    })),
    playbooks: playbooks.map((item) => ({
      title: item.title,
      family: item.family,
      status: item.status,
      originName: item.originCompany.name,
      originSegment: item.originSegment,
      problem: item.problem,
      kpi: item.primaryKpi,
    })),
  };
}
