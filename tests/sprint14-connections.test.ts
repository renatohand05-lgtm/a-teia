import { describe, expect, it } from "vitest";
import { detectQuestionIntent } from "@/lib/ai-executive-engine";
import { webStatusCopy } from "@/lib/assistant-ui";
import {
  aiCannotValidateConnection,
  calculateConnectionScore,
  connectionDiscoveryKey,
  discoverPairConnections,
  discoverPortfolioConnections,
  displayConnectionScore,
  evidenceDoesNotTransfer,
  externalSourceIsNotEvidence,
  filterConnections,
  humanMustConfirmOpportunity,
  mapShowsOnlyPersisted,
  transferredMemoryClassification,
  type ConnectionCompanySignal,
} from "@/lib/connection-engine";
import { draftStrategyFromConnection, strategyConversionReview } from "@/lib/strategy-engine";
import { FUTURE_NAV, INTELLIGENCE_NAV } from "@/types";

function company(overrides: Partial<ConnectionCompanySignal> & Pick<ConnectionCompanySignal, "id" | "name">): ConnectionCompanySignal {
  return {
    segment: null,
    bottlenecks: null,
    objectives: null,
    notes: null,
    revenueMonthly: null,
    marginPercent: null,
    hasDiagnosis: false,
    diagnosisBottleneck: null,
    hasFinance: false,
    evidenceCount: 0,
    validatedEvidenceCount: 0,
    memories: [],
    ...overrides,
  };
}

describe("Sprint 14 — motor de conexões", () => {
  it("score é determinístico e parcial sem dados suficientes", () => {
    const from = company({ id: "a", name: "Oficina Centro", segment: "Oficina" });
    const to = company({ id: "b", name: "J BURGUERS", segment: "Alimentação" });
    const first = calculateConnectionScore({ from, to, type: "INDICACAO" });
    const second = calculateConnectionScore({ from, to, type: "INDICACAO" });
    expect(first.score).toBe(second.score);
    expect(first.partial).toBe(true);
    expect(first.missing.length).toBeGreaterThan(0);
    expect(displayConnectionScore(first.score, first.partial).caption).toMatch(/parcial|análise/i);
  });

  it("conexão sem diagnóstico nem financeiro permanece hipótese e não inventa evidência", () => {
    const from = company({ id: "a", name: "Oficina Centro", segment: "Oficina" });
    const to = company({ id: "b", name: "J BURGUERS", segment: "Alimentação" });
    const found = discoverPairConnections(from, to);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((item) => item.classification === "HIPOTESE")).toBe(true);
    expect(found.every((item) => item.hypothesis.toLowerCase().includes("possível") || item.hypothesis.toLowerCase().includes("hipótese") || item.hypothesis.toLowerCase().includes("pode"))).toBe(true);
  });

  it("sugere indicação entre oficina e alimentação", () => {
    const found = discoverPairConnections(
      company({ id: "a", name: "Oficina Centro", segment: "Oficina", hasDiagnosis: true, diagnosisBottleneck: "aquisição" }),
      company({ id: "b", name: "J BURGUERS", segment: "Alimentação", hasFinance: true, revenueMonthly: 60000 }),
    );
    expect(found.some((item) => item.type === "INDICACAO")).toBe(true);
    expect(found.map((item) => item.discoveryKey)).toContain(connectionDiscoveryKey("a", "b", "INDICACAO"));
  });

  it("memória validada em A vira hipótese transferível em B", () => {
    const from = company({
      id: "a",
      name: "Oficina Centro",
      segment: "Oficina",
      memories: [
        {
          id: "m1",
          companyId: "a",
          title: "Indicação de frota",
          validated: true,
          approved: true,
          segment: "Oficina",
          kpi: "recorrencia",
          limitations: "Uma unidade.",
        },
      ],
    });
    const to = company({ id: "b", name: "J BURGUERS", segment: "Alimentação" });
    const found = discoverPairConnections(from, to);
    const transfer = found.find((item) => item.type === "APRENDIZADO_TRANSFERIVEL");
    expect(transfer).toBeTruthy();
    expect(transfer?.classification).toBe("HIPOTESE");
    expect(transferredMemoryClassification()).toBe("HIPOTESE");
    expect(evidenceDoesNotTransfer("a", "b")).toBe(true);
    expect(transfer?.hypothesis).toMatch(/permanece hipótese/i);
  });

  it("fonte externa não é evidência interna", () => {
    expect(externalSourceIsNotEvidence()).toEqual({ origin: "FONTE_EXTERNA", evidence: false });
  });

  it("IA não valida conexão automaticamente", () => {
    expect(aiCannotValidateConnection()).toBe(true);
    expect(detectQuestionIntent("Quais empresas podem se conectar?")).toBe("CONNECTION");
    expect(detectQuestionIntent("Quais conexões ainda são apenas hipótese?")).toBe("CONNECTION");
  });

  it("mapa só usa ids persistidos", () => {
    expect(mapShowsOnlyPersisted(["c1"], ["c1", "c2"])).toBe(true);
    expect(mapShowsOnlyPersisted(["ghost"], ["c1"])).toBe(false);
  });

  it("filtros de lista respeitam empresa, tipo, status e score", () => {
    const rows = [
      {
        fromId: "a",
        toId: "b",
        type: "INDICACAO",
        status: "SUGERIDA",
        classification: "HIPOTESE",
        score: 62,
        fromSegment: "Oficina",
        toSegment: "Alimentação",
        createdAt: "2026-09-21",
      },
    ];
    expect(filterConnections(rows, { companyId: "a", type: "INDICACAO", minScore: 50 })).toHaveLength(1);
    expect(filterConnections(rows, { companyId: "z" })).toHaveLength(0);
    expect(filterConnections(rows, { status: "VALIDADA" })).toHaveLength(0);
  });

  it("estratégia nasce da conexão e conversão exige confirmação", () => {
    const draft = draftStrategyFromConnection({
      fromName: "Oficina Centro",
      toName: "J BURGUERS",
      type: "INDICACAO",
      mechanism: "benefício para motoristas",
      hypothesis: "Possível conexão de indicação.",
      limitations: "Não comprovado no destino.",
      classification: "HIPOTESE",
    });
    expect(draft.hypothesis).toMatch(/hipótese|Possível/i);
    const review = strategyConversionReview({
      problem: draft.problem,
      hypothesis: draft.hypothesis,
      primaryKpi: draft.primaryKpi,
      estimatedInvestment: null,
      risk: "INDETERMINADO",
      evidenceCount: 0,
      missing: [],
    });
    expect(review.canConfirm).toBe(true);
    expect(review.investment).toBe("Sem dados");
    expect(humanMustConfirmOpportunity()).toBe(true);
  });

  it("portfólio sem segundo negócio não inventa pares", () => {
    expect(discoverPortfolioConnections([company({ id: "a", name: "Só uma", segment: "Oficina" })])).toEqual([]);
  });

  it("navegação tira Conexões e Estratégias do em breve", () => {
    expect(FUTURE_NAV).toEqual([]);
    expect(INTELLIGENCE_NAV.map((item) => item.href)).toEqual(["/memoria", "/conexoes", "/estrategias", "/assistente"]);
  });

  it("pesquisa externa distingue configurado, disponível e falha", () => {
    expect(webStatusCopy(true, true, false)).toMatch(/opcional/);
    expect(webStatusCopy(true, true, true)).toMatch(/última consulta falhou/i);
    expect(webStatusCopy(false, false)).toMatch(/não configurada/i);
  });
});
