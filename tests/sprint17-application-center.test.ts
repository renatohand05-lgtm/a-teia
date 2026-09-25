import { describe, expect, it } from "vitest";
import { detectQuestionIntent } from "@/lib/ai-executive-engine";
import { AUTOMATION_TEMPLATES, evaluateTemplate, type CompanyFacts } from "@/lib/automation-rules-engine";
import { auditActionLabel } from "@/lib/audit-ui";
import {
  APPLICATION_EMPTY,
  APPLICATION_PAGE_SIZE,
  applicationCenterKpis,
  applicationDaysLeft,
  applicationStatusLabel,
  buildOperationalTimeline,
  coverageFromApplications,
  displayCenterKpi,
  evidenceSummaryLabel,
  experimentSummaryLabel,
  filterApplicationRows,
  getApplicationNextAction,
  matchesPlaybookLibraryFilter,
  memoryStateLabel,
  neverCallProgressSuccess,
  operationalProgress,
  pageHref,
  resultSummaryLabel,
  sortApplicationRows,
  type ApplicationListRow,
} from "@/lib/application-center";
import { PRIMARY_ASSISTANT_SHORTCUTS } from "@/lib/assistant-ui";
import { INTELLIGENCE_NAV } from "@/types";

function row(overrides: Partial<ApplicationListRow> = {}): ApplicationListRow {
  return {
    id: "app1",
    playbookId: "pb1",
    playbookTitle: "Programa de indicação",
    originCompanyId: "a",
    originCompanyName: "Empresa A",
    destinationCompanyId: "b",
    destinationName: "Empresa B",
    destinationSegment: "Alimentação",
    compatibilityScore: 74,
    scorePartial: true,
    status: "EM_TESTE",
    kpi: "novos clientes",
    horizonDays: 30,
    experimentId: "x1",
    experimentStarted: true,
    experimentStartedAt: new Date().toISOString(),
    hasResult: false,
    hasLocalEvidence: false,
    classification: "HYPOTHESIS",
    experimentClassification: null,
    resultingMemoryId: null,
    memoryStatus: null,
    decisionId: "d1",
    actionPlanId: "p1",
    ownerName: "Renato",
    updatedAt: "2026-09-25T12:00:00.000Z",
    createdAt: "2026-09-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("Sprint 17 — central de aplicações", () => {
  it("mapeia status do domínio sem criar estado novo", () => {
    expect(applicationStatusLabel("PROPOSTA")).toBe("Proposta");
    expect(applicationStatusLabel("AGUARDANDO_APROVACAO")).toBe("Aguardando aprovação");
    expect(applicationStatusLabel("EM_TESTE")).toBe("Em experimento");
    expect(applicationStatusLabel("MEDIDA")).toBe("Resultado registrado");
    expect(applicationStatusLabel("CONCLUIDA")).toBe("Concluída");
  });

  it("próxima ação é determinística", () => {
    expect(getApplicationNextAction({ status: "PROPOSTA", scorePartial: true }).label).toBe("Completar dados");
    expect(getApplicationNextAction({ status: "PROPOSTA", kpi: "clientes" }).label).toBe("Revisar compatibilidade");
    expect(getApplicationNextAction({ status: "REVISADA", kpi: "clientes" }).label).toBe("Enviar para decisão");
    expect(getApplicationNextAction({ status: "AGUARDANDO_APROVACAO" }).label).toBe("Aprovar teste");
    expect(getApplicationNextAction({ status: "APROVADA" }).label).toBe("Criar plano");
    expect(getApplicationNextAction({ status: "CONFIRMADA", actionPlanId: "p1" }).label).toBe("Criar experimento");
    expect(getApplicationNextAction({ status: "PLANEJADA", experimentId: "x1" }).label).toBe("Iniciar experimento");
    expect(getApplicationNextAction({ status: "EM_TESTE", experimentId: "x1", experimentStarted: true }).label).toBe("Registrar resultado");
    expect(getApplicationNextAction({ status: "MEDIDA", resultingEvidenceId: "e1" }).label).toBe("Avaliar evidência");
    expect(getApplicationNextAction({ status: "MEDIDA", resultingEvidenceId: "e1", resultingMemoryId: "m1", memoryStatus: "PROPOSED" }).label).toBe("Revisar memória");
    expect(getApplicationNextAction({ status: "MEDIDA", resultingEvidenceId: "e1", resultingMemoryId: "m1", memoryStatus: "APPROVED" }).label).toBe("Concluir aplicação");
    expect(getApplicationNextAction({ status: "CONCLUIDA" }).label).toBe("Concluído");
  });

  it("filtra, busca e pagina sem inventar linha", () => {
    const rows = [
      row(),
      row({ id: "app2", destinationName: "Empresa C", destinationCompanyId: "c", status: "CONCLUIDA", playbookTitle: "Parceria local", kpi: "ticket" }),
    ];
    expect(filterApplicationRows(rows, { q: "indicação" })).toHaveLength(1);
    expect(filterApplicationRows(rows, { status: "CONCLUIDA" })).toHaveLength(1);
    expect(filterApplicationRows(rows, { destinationId: "c" })).toHaveLength(1);
    expect(filterApplicationRows(rows, { evidence: "local" })).toHaveLength(0);
    expect(sortApplicationRows(rows, "compat_desc")[0]?.compatibilityScore).toBe(74);
  });

  it("KPIs usam zero real e Sem dados sem cobertura", () => {
    expect(displayCenterKpi(0, true)).toBe("0");
    expect(displayCenterKpi(null, false)).toBe("Sem dados");
    const kpis = applicationCenterKpis([row(), row({ status: "AGUARDANDO_APROVACAO", id: "app2" })], true);
    expect(kpis.awaitingDecision).toBe(1);
    expect(kpis.inExperiment).toBe(1);
  });

  it("timeline e progresso usam etapas reais e não falam em sucesso", () => {
    const empty = buildOperationalTimeline({});
    expect(empty.filter((item) => item.done)).toEqual([]);
    const steps = buildOperationalTimeline({
      proposedAt: "2026-09-22",
      scored: true,
      reviewedAt: "2026-09-22",
      decisionId: "d1",
      approved: true,
      actionPlanId: "p1",
      experimentId: "x1",
      experimentStarted: true,
    });
    const progress = operationalProgress(steps);
    expect(progress.done).toBe(7);
    expect(progress.total).toBe(12);
    expect(progress.caption).toBe("7 de 12 etapas concluídas");
    expect(neverCallProgressSuccess(progress.caption)).toBe(true);
  });

  it("prazo, memória e empty states", () => {
    expect(applicationDaysLeft(null)).toBe("Sem dados");
    expect(memoryStateLabel(null)).toBe(APPLICATION_EMPTY.memory);
    expect(memoryStateLabel("PROPOSED")).toBe("Memória proposta");
    expect(memoryStateLabel("APPROVED", true)).toBe("Memória aprovada");
    expect(APPLICATION_EMPTY.list).toMatch(/Nenhum playbook está sendo testado/);
  });

  it("navegação, IA, alertas e automações apontam para a central", () => {
    expect(INTELLIGENCE_NAV.map((item) => item.href)).toEqual([
      "/memoria",
      "/conexoes",
      "/estrategias",
      "/playbooks",
      "/aplicacoes",
      "/assistente",
    ]);
    expect(detectQuestionIntent("Quais aplicações aguardam decisão?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais playbooks foram testados em mais de uma empresa?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais aplicações têm dados insuficientes?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("O que mudou entre origem e destino?")).toBe("PLAYBOOK");
    expect(AUTOMATION_TEMPLATES.some((item) => item.key === "playbook_awaiting_decision")).toBe(true);
    const hit = evaluateTemplate(
      AUTOMATION_TEMPLATES.find((item) => item.key === "playbook_awaiting_decision")!,
      {
        companyId: "b",
        companyName: "B",
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
        playbookAwaitingDecision: 1,
      } satisfies CompanyFacts,
    );
    expect(hit?.href).toBe("/aplicacoes?status=AGUARDANDO_APROVACAO");
    expect(detectQuestionIntent("Quais playbooks estão em teste?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais resultados estão pendentes?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Que aprendizado foi transferido?")).toBe("PLAYBOOK");
    expect(PRIMARY_ASSISTANT_SHORTCUTS.some((item) => item.prompt.includes("aprendizado foi transferido"))).toBe(true);
    expect(auditActionLabel("playbook.application.created")).toMatch(/cria/i);
    expect(auditActionLabel("playbook.application.result.recorded")).toMatch(/resultado/i);
  });

  it("paginação e URL preservam filtros", () => {
    expect(APPLICATION_PAGE_SIZE).toBe(20);
    expect(pageHref("/aplicacoes", "status=EM_TESTE&q=indicação", 2)).toBe("/aplicacoes?status=EM_TESTE&q=indicação&pagina=2");
    const many = Array.from({ length: 21 }, (_, index) => row({ id: `app${index}`, playbookTitle: `Playbook ${index}` }));
    expect(filterApplicationRows(many, { q: "Playbook 1" }).length).toBeGreaterThan(0);
  });

  it("resumo de experimento, resultado e evidência não inventa sucesso", () => {
    expect(experimentSummaryLabel(row({ experimentId: null }))).toBe("Sem dados");
    expect(experimentSummaryLabel(row())).toBe("Em andamento");
    expect(resultSummaryLabel(row())).toBe("Pendente");
    expect(resultSummaryLabel(row({ hasResult: true, experimentClassification: "VALIDATED" }))).toBe("Positivo");
    expect(evidenceSummaryLabel(row())).toBe("Nenhuma");
    expect(evidenceSummaryLabel(row({ hasLocalEvidence: true }))).toBe("Local no destino");
    expect(sortApplicationRows([row(), row({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" })], "antigas")[0]?.id).toBe("old");
    expect(sortApplicationRows([row({ status: "CONCLUIDA" }), row({ status: "AGUARDANDO_APROVACAO", id: "wait" })], "acao")[0]?.id).toBe("wait");
  });

  it("cobertura, maturidade e filtros da biblioteca não criam chance de sucesso", () => {
    const coverage = coverageFromApplications([
      { destinationCompanyId: "b", destinationSegment: "Alimentação", status: "MEDIDA", classification: "VALIDATED", resultingEvidenceId: "e1" },
      { destinationCompanyId: "c", destinationSegment: "Oficina", status: "CONCLUIDA", classification: "REFUTED", resultingEvidenceId: "e2" },
    ]);
    expect(coverage.measured).toBe(2);
    expect(coverage.companies).toBe(2);
    expect(coverage.segments).toBe(2);
    expect(coverage.maturity).toBe("MULTICONTEXTO");
    expect(coverage.caption).toMatch(/não é chance de sucesso/);
    expect(matchesPlaybookLibraryFilter({ applicationCount: 0, testedCompanies: 0, testedSegments: 0 }, { applications: "com" })).toBe(false);
    expect(matchesPlaybookLibraryFilter({ applicationCount: 3, testedCompanies: 2, testedSegments: 2 }, { companies: "2+", segments: "2+" })).toBe(true);
  });
});
