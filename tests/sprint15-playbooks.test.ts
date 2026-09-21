import { describe, expect, it } from "vitest";
import { detectQuestionIntent } from "@/lib/ai-executive-engine";
import { prepareConnectionMap, mapShowsOnlyPersisted, shouldPreferList } from "@/lib/connection-map";
import {
  aiCannotValidatePlaybook,
  alreadyEvaluatingCopy,
  applicationIdempotencyKey,
  calculatePlaybookCompatibility,
  displayCompatibilityScore,
  draftPlaybookFromLearning,
  evidenceDoesNotTransfer,
  externalSourceIsNotPlaybookEvidence,
  filterPlaybooks,
  humanMustConfirmApplication,
  isActiveApplicationStatus,
  paginateItems,
  playbookEligibilityFromMemory,
  playbookEligibilityFromStrategy,
  playbookNeverBornValidated,
  relatedPlaybooksForConnection,
  transferClassification,
} from "@/lib/playbook-engine";
import { FUTURE_NAV, INTELLIGENCE_NAV } from "@/types";

describe("Sprint 15 — playbooks e reutilização", () => {
  it("playbook nasce rascunho e IA não valida", () => {
    expect(playbookNeverBornValidated()).toBe("RASCUNHO");
    expect(aiCannotValidatePlaybook()).toBe(true);
    const draft = draftPlaybookFromLearning({
      title: "Programa de indicação",
      family: "INDICACAO",
      problem: "Baixa aquisição",
      lesson: "+18 clientes",
      originCompanyName: "Oficina Centro",
      originSegment: "Oficina",
      kpi: "novos clientes",
      baseline: 10,
      target: 20,
      measuredResult: 18,
      investment: 500,
      limitations: "30 dias, uma unidade",
      conditions: "carteira de motoristas",
      audience: "motoristas",
      durationDays: 30,
    });
    expect(draft.status).toBe("RASCUNHO");
    expect(draft.description).toMatch(/pode ser testado/i);
    expect(draft.description).not.toMatch(/Funciona em restaurantes/i);
  });

  it("elegibilidade exige memória aprovada e evidência", () => {
    expect(playbookEligibilityFromMemory({ status: "PROPOSED", evidenceId: "e1" }).eligible).toBe(false);
    expect(playbookEligibilityFromMemory({ status: "APPROVED", evidenceId: null, measuredResult: null }).eligible).toBe(false);
    expect(playbookEligibilityFromMemory({ status: "APPROVED", evidenceId: "e1", measuredResult: 18 }).eligible).toBe(true);
  });

  it("estratégia validada sem resultado medido não vira playbook", () => {
    expect(playbookEligibilityFromStrategy({ status: "APROVADA", evidenceCount: 2 }).eligible).toBe(false);
    expect(playbookEligibilityFromStrategy({ status: "VALIDADA", evidenceCount: 0, measuredResult: null }).eligible).toBe(false);
    expect(playbookEligibilityFromStrategy({ status: "VALIDADA", evidenceCount: 1, measuredResult: 18 }).eligible).toBe(true);
  });

  it("evidência de A não transfere para B e aplicação permanece hipótese", () => {
    expect(evidenceDoesNotTransfer("a", "b")).toBe(true);
    expect(transferClassification()).toEqual({ origin: "EVIDENCIA", destination: "HIPOTESE" });
    expect(humanMustConfirmApplication()).toBe(true);
    expect(externalSourceIsNotPlaybookEvidence()).toEqual({ origin: "FONTE_EXTERNA", evidence: false });
  });

  it("score de compatibilidade é parcial sem dados e não é chance de sucesso", () => {
    const result = calculatePlaybookCompatibility({
      playbook: {
        originCompanyId: "a",
        originSegment: "Oficina",
        family: "INDICACAO",
        problem: "aquisição",
        audience: null,
        primaryKpi: null,
        observedInvestment: null,
        requiredConditions: null,
        contrarySignals: null,
      },
      company: {
        id: "b",
        name: "J BURGUERS",
        segment: "Alimentação",
        bottleneck: null,
        hasDiagnosis: false,
        teamSize: null,
        revenueMonthly: null,
        objectives: null,
        evidenceCount: 0,
      },
    });
    expect(result.partial).toBe(true);
    expect(result.factorsMissing.length).toBeGreaterThan(0);
    expect(result.caption).toMatch(/compatibilidade/i);
    expect(result.caption).not.toMatch(/probabilidade de sucesso/i);
    expect(displayCompatibilityScore(result.score, result.partial).caption).toMatch(/teste/i);
  });

  it("idempotência e aplicação ativa", () => {
    expect(applicationIdempotencyKey("p1", "c1")).toBe("p1:c1");
    expect(isActiveApplicationStatus("CONFIRMADA")).toBe(true);
    expect(isActiveApplicationStatus("REJEITADA")).toBe(false);
    expect(alreadyEvaluatingCopy()).toMatch(/já está sendo avaliado/i);
  });

  it("filtros e paginação não inventam linhas", () => {
    const rows = [
      { originCompanyId: "a", originSegment: "Oficina", family: "INDICACAO", primaryKpi: "leads", status: "VALIDADO", confidence: 80, observedResult: 18, createdAt: "2026-09-21" },
    ];
    expect(filterPlaybooks(rows, { companyId: "a", family: "INDICACAO" })).toHaveLength(1);
    expect(filterPlaybooks(rows, { status: "RASCUNHO" })).toHaveLength(0);
    expect(paginateItems(Array.from({ length: 45 }, (_, index) => index), 2, 20).items).toHaveLength(20);
    expect(paginateItems(Array.from({ length: 45 }, (_, index) => index), 2, 20).pages).toBe(3);
  });

  it("playbooks relacionados à conexão marcam possível aplicação", () => {
    const related = relatedPlaybooksForConnection({
      fromSegment: "Oficina",
      toSegment: "Estacionamento",
      type: "PARCEIRO",
      playbooks: [
        { id: "pb1", title: "Programa de parceria local", family: "PARCERIA", originSegment: "Oficina", testedCompanyIds: [], destinationId: "b" },
      ],
    });
    expect(related[0]?.label).toBe("Possível aplicação");
  });

  it("IA consulta playbooks e não valida", () => {
    expect(detectQuestionIntent("Existe algum playbook para este problema?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("O que já funcionou em outra empresa?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais playbooks possuem evidência?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Quais empresas podem se conectar?")).toBe("CONNECTION");
    expect(aiCannotValidatePlaybook()).toBe(true);
  });

  it("mapa endurece carteiras grandes e não inventa ligações", () => {
    const companies = Array.from({ length: 100 }, (_, index) => ({ id: `c${index}`, name: `Empresa ${index}`, segment: index % 2 ? "Oficina" : "Alimentação" }));
    const connections = [{ id: "e1", fromId: "c0", toId: "c1", status: "SUGERIDA", score: 20, scorePartial: true }];
    const prepared = prepareConnectionMap({ companies, connections, hideLowRelevance: true, maxNodes: 24 });
    expect(prepared.shownCompanies).toBeLessThanOrEqual(24);
    expect(prepared.truncated).toBe(true);
    expect(shouldPreferList(100)).toBe(true);
    expect(mapShowsOnlyPersisted(prepared.edges.map((item) => item.id), ["e1"])).toBe(true);
    const tiny = prepareConnectionMap({ companies: companies.slice(0, 1), connections: [] });
    expect(tiny.edges).toEqual([]);
    expect(tiny.shownCompanies).toBe(1);
  });

  it("navegação inclui Playbooks na inteligência", () => {
    expect(FUTURE_NAV).toEqual([]);
    expect(INTELLIGENCE_NAV.map((item) => item.href)).toEqual(["/memoria", "/conexoes", "/estrategias", "/playbooks", "/assistente"]);
  });
});
