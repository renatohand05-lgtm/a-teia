import { describe, expect, it } from "vitest";
import { detectQuestionIntent, buildPlaybookSummary } from "@/lib/ai-executive-engine";
import { AUTOMATION_TEMPLATES, evaluateTemplate, parseAutomationPrompt, type CompanyFacts } from "@/lib/automation-rules-engine";
import { rankGlobalPriorities, type PortfolioCompanyInput } from "@/lib/global-priority-engine";
import { isActiveApplicationStatus } from "@/lib/playbook-engine";
import {
  alreadyTestingCopy,
  assertTransition,
  buildAdaptation,
  buildTransferTimeline,
  buildTransversalLearning,
  calculatePlaybookCoverage,
  calculateTransferCompatibility,
  canTransitionApplication,
  compareOriginDestination,
  evidenceStaysLocal,
  knowledgeConnectionType,
  localHypothesis,
  mapResultPolarity,
  mapTransferSignals,
  strategyMultiContextCopy,
  TRANSFER_EMPTY,
} from "@/lib/playbook-transfer-engine";

function company(overrides: Partial<PortfolioCompanyInput> = {}): PortfolioCompanyInput {
  return {
    id: "b",
    name: "Empresa B",
    segment: "Alimentação",
    status: "ACTIVE",
    updatedAt: "2026-09-22",
    diagnosis: null,
    finance: {
      periodLabel: null,
      revenue: null,
      ebitda: null,
      ebitdaPercent: null,
      ebitdaTarget: null,
      cogsPercent: null,
      cogsTarget: null,
      cash: null,
      history: [],
    },
    opportunities: [],
    plans: [],
    experiments: [],
    memories: [],
    evidence: [],
    ...overrides,
  };
}

function facts(overrides: Partial<CompanyFacts> = {}): CompanyFacts {
  return {
    companyId: "b",
    companyName: "Empresa B",
    cogsPercent: null,
    cogsTarget: null,
    ebitda: null,
    ebitdaTarget: null,
    cash: null,
    revenue: null,
    financeUpdatedAt: null,
    overdueTaskCount: 0,
    stalePlanCount: 0,
    experimentStaleCount: 0,
    pendingDecisionDays: null,
    pendingDecisionCount: 0,
    highScoreOpportunityWithoutPlan: 0,
    allocationPendingDays: null,
    financeAgeDays: null,
    ...overrides,
  };
}

describe("Sprint 16 — ciclo de transferência", () => {
  it("não permite pular PROPOSTA para CONCLUIDA", () => {
    expect(canTransitionApplication("PROPOSTA", "CONCLUIDA")).toBe(false);
    expect(() => assertTransition("PROPOSTA", "CONCLUIDA")).toThrow(/ciclo real/);
    expect(canTransitionApplication("PROPOSTA", "REVISADA")).toBe(true);
    expect(canTransitionApplication("EM_TESTE", "MEDIDA")).toBe(true);
  });

  it("score determinístico é compatibilidade, não probabilidade", () => {
    const full = calculateTransferCompatibility({
      sameProblem: true,
      hasDiagnosis: true,
      sameSegment: true,
      kpiAvailable: true,
      hasCapacity: true,
      investmentCompatible: true,
      hasResources: true,
      hasRelatedHistory: true,
    });
    expect(full.score).toBe(79);
    expect(full.partial).toBe(false);
    expect(full.caption).not.toMatch(/probabilidade de sucesso/i);
    expect(full.caption).toMatch(/não chance de sucesso/i);
    expect(full.caption).toMatch(/compatibilidade/i);

    const missing = calculateTransferCompatibility({
      sameProblem: null,
      hasDiagnosis: false,
      sameSegment: null,
      kpiAvailable: null,
      hasCapacity: null,
      investmentCompatible: null,
      hasResources: null,
      hasRelatedHistory: null,
    });
    expect(missing.score).toBe(0);
    expect(missing.partial).toBe(true);
    expect(missing.missing.length).toBeGreaterThan(0);
    expect(missing.caption).toMatch(/falta de dados/);
  });

  it("ausência de dados nunca vira nota positiva", () => {
    const mapped = mapTransferSignals({
      originProblem: "indicação",
      destBottleneck: null,
      destHasDiagnosis: false,
      originSegment: "Oficina",
      destSegment: null,
      playbookKpi: null,
      destTeamSize: null,
      playbookInvestment: null,
      destRevenue: null,
      destHasResources: null,
      destRelatedHistory: false,
    });
    expect(mapped.partial).toBe(true);
    expect(mapped.missing).toContain("Problema semelhante");
    expect(mapped.missing).toContain("KPI disponível");
    expect(mapped.dimensions.find((item) => item.key === "kpi")?.value).toBeNull();
  });

  it("adaptação e hipótese permanecem locais", () => {
    const adaptation = buildAdaptation({
      originalDuration: 30,
      originalInvestment: 2000,
      originalTarget: 20,
      originalChannel: "WhatsApp",
      proposedDuration: 30,
      proposedInvestment: 1200,
      proposedTarget: 12,
      proposedChannel: "WhatsApp + balcão",
    });
    expect(adaptation.original.investimento).toBe("2000");
    expect(adaptation.proposed.investimento).toBe("1200");
    expect(localHypothesis("Programa de indicação", "Empresa B", 30)).toMatch(/hipótese/i);
    expect(alreadyTestingCopy()).toMatch(/já está sendo testado/i);
  });

  it("evidência da origem nunca vira evidência do destino", () => {
    expect(evidenceStaysLocal("a", "b", "b")).toBe(true);
    expect(evidenceStaysLocal("a", "b", "a")).toBe(false);
    expect(mapResultPolarity("VALIDATED")).toBe("POSITIVO");
    expect(mapResultPolarity("REFUTED")).toBe("NEGATIVO");
    expect(mapResultPolarity("INCONCLUSIVE")).toBe("INCONCLUSIVO");
    expect(mapResultPolarity(null)).toBe("INCONCLUSIVO");
  });

  it("cobertura e maturidade medem diversidade, não sucesso", () => {
    const empty = calculatePlaybookCoverage([]);
    expect(empty.maturity).toBe("SEM_MEDICAO");
    expect(empty.caption).not.toMatch(/chance/i);

    const experimental = calculatePlaybookCoverage([
      { destinationCompanyId: "b", destinationSegment: "Alimentação", status: "MEDIDA", classification: "REFUTED", resultingEvidenceId: "e1" },
    ]);
    expect(experimental.maturity).toBe("EXPERIMENTAL");
    expect(experimental.negatives).toBe(1);

    const multi = calculatePlaybookCoverage([
      { destinationCompanyId: "b", destinationSegment: "Alimentação", status: "CONCLUIDA", classification: "VALIDATED", resultingEvidenceId: "e1" },
      { destinationCompanyId: "c", destinationSegment: "Oficina", status: "MEDIDA", classification: "INCONCLUSIVE", resultingEvidenceId: "e2" },
    ]);
    expect(multi.maturity).toBe("MULTICONTEXTO");
    expect(multi.companies).toBe(2);
    expect(multi.segments).toBe(2);
    expect(strategyMultiContextCopy(multi.segments)).toMatch(/múltiplos contextos/);
    expect(strategyMultiContextCopy(1)).toBeNull();
  });

  it("compara origem e destino sem inventar dado", () => {
    const rows = compareOriginDestination({
      origin: { segmento: "Oficina", kpi: "clientes", baseline: 10, meta: 20, resultado: 18, investimento: 500, duracao: 30 },
      destination: { segmento: "Alimentação", kpi: "clientes", baseline: null, meta: 12, resultado: null, investimento: 1200, duracao: 30 },
    });
    expect(rows.find((item) => item.label === "baseline")?.destination).toBe("Sem dados");
    expect(rows.find((item) => item.label === "resultado")?.destination).toBe("Sem dados");
    const learning = buildTransversalLearning({
      originName: "A",
      destinationName: "B",
      origin: { segmento: "Oficina", kpi: "clientes", baseline: 10, meta: 20, resultado: 18, investimento: 500, duracao: 30 },
      destination: { segmento: "Alimentação", kpi: "clientes", baseline: null, meta: 12, resultado: 17, investimento: 1200, duracao: 30 },
      originPolarity: "VALIDATED",
      destinationPolarity: "PARTIALLY_VALIDATED",
    });
    expect(learning.caution).toMatch(/causalidade/);
    expect(learning.worked[0]).toMatch(/origem/);
    expect(learning.changed).toContain("investimento");
  });

  it("timeline só marca etapas reais", () => {
    const empty = buildTransferTimeline({});
    expect(empty.filter((item) => item.done).map((item) => item.key)).toEqual(["selected"]);
    const full = buildTransferTimeline({
      proposedAt: "2026-09-22",
      reviewedAt: "2026-09-22",
      approvedAt: "2026-09-22",
      actionPlanId: "p1",
      experimentId: "x1",
      resultingEvidenceId: "e1",
      resultingMemoryId: "m1",
    });
    expect(full.every((item) => item.done)).toBe(true);
  });

  it("conexão de conhecimento não é parceria comercial", () => {
    expect(knowledgeConnectionType()).toBe("APRENDIZADO_TRANSFERIVEL");
    expect(TRANSFER_EMPTY.evidence).toMatch(/evidência local/i);
    expect(isActiveApplicationStatus("AGUARDANDO_APROVACAO")).toBe(true);
    expect(isActiveApplicationStatus("CONCLUIDA")).toBe(false);
  });

  it("IA entende aplicações e distingue evidência local", () => {
    expect(detectQuestionIntent("Quais playbooks estão sendo testados?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("O que funcionou em mais de uma empresa?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Que aprendizado foi transferido?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Qual aplicação precisa de decisão?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais testes ainda não têm resultado?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Este playbook possui evidência em quantas empresas?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais diferenças existem entre origem e destino?")).toBe("PLAYBOOK");
    const rows = buildPlaybookSummary([
      {
        title: "Indicação",
        family: "INDICACAO",
        status: "VALIDADO",
        originName: "Empresa A",
        originSegment: "Oficina",
        problem: "Aquisição",
        kpi: "clientes",
        applications: [
          { destinationName: "Empresa B", destinationSegment: "Alimentação", status: "AGUARDANDO_APROVACAO", classification: "HYPOTHESIS", hasLocalEvidence: false },
          { destinationName: "Empresa C", destinationSegment: "Oficina", status: "MEDIDA", classification: "EVIDENCE", hasLocalEvidence: true },
        ],
      },
    ]);
    expect(rows.some((item) => item.kind === "DADO" && /aguardando decisão/.test(item.text))).toBe(true);
    expect(rows.some((item) => item.kind === "EVIDENCIA" && /local/.test(item.text))).toBe(true);
    expect(rows.some((item) => /não transfere evidência/i.test(item.text))).toBe(true);
  });

  it("prioridades e alertas só disparam em condição real", () => {
    const idle = rankGlobalPriorities([company()]);
    expect(idle.some((item) => item.factors.includes("playbook_aguardando_decisao"))).toBe(false);
    const waiting = rankGlobalPriorities([
      company({
        playbookTransfers: [{ id: "app1", title: "Indicação", status: "AGUARDANDO_APROVACAO", overdue: false, missingData: false }],
      }),
    ]);
    expect(waiting[0]?.situation).toMatch(/aguardando decisão/);
    expect(waiting[0]?.reason).not.toMatch(/falha/);
  });

  it("automações geram alerta e não movimentam ciclo", () => {
    expect(AUTOMATION_TEMPLATES.some((item) => item.key === "playbook_awaiting_decision")).toBe(true);
    const hit = evaluateTemplate(
      AUTOMATION_TEMPLATES.find((item) => item.key === "playbook_awaiting_result")!,
      facts({ playbookAwaitingResult: 1 }),
    );
    expect(hit?.title).toMatch(/aguardando resultado/i);
    expect(parseAutomationPrompt("Avisar aplicações de playbook aguardando decisão")?.templateKey).toBe("playbook_awaiting_decision");
    expect(parseAutomationPrompt("Experimentos de transferência vencidos")?.templateKey).toBe("playbook_transfer_overdue");
  });
});
