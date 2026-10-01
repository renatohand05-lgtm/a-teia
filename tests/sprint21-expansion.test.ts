import { describe, expect, it } from "vitest";
import { detectQuestionIntent } from "@/lib/ai-executive-engine";
import { displaySegment, isAlimentacaoTypo, persistableSegment } from "@/lib/company-ux";
import { isOperationalDecision, isUnequivocalTestOrphanDecision } from "@/lib/decision-reason";
import {
  buildPortfolioCompleteness,
  composeCompletenessAnswer,
  composeExpansionAnswer,
  expansionEmptyState,
  isCompletenessQuestion,
  isExpansionQuestion,
  portfolioIntelligenceAnswer,
  portfolioScaleCaption,
  rankExpansionOpportunities,
} from "@/lib/expansion-engine";
import type { PortfolioCompanyInput } from "@/lib/global-priority-engine";

function company(overrides: Partial<PortfolioCompanyInput> = {}): PortfolioCompanyInput {
  return {
    id: "a",
    name: "J BURGUERS",
    segment: "Alimentação",
    status: "ACTIVE",
    updatedAt: "2026-10-01T00:00:00.000Z",
    diagnosis: null,
    finance: {
      periodLabel: "Set/2026",
      revenue: 600000,
      ebitda: 170490,
      ebitdaPercent: 31.57,
      ebitdaTarget: 204750,
      cogsPercent: 30,
      cogsTarget: 28,
      cash: null,
      history: [],
    },
    opportunities: [],
    plans: [],
    experiments: [],
    memories: [],
    evidence: [],
    playbookTransfers: [],
    ...overrides,
  };
}

describe("Sprint 21 — portfólio e expansão", () => {
  it("uma empresa não vira portfólio de muitas", () => {
    expect(portfolioScaleCaption(1)).toMatch(/uma empresa/i);
    expect(portfolioScaleCaption(3)).toMatch(/3 empresas/);
    const rows = buildPortfolioCompleteness([company()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.diagnosis).toBe("NÃO");
    expect(rows[0]?.finance).toBe("SIM");
    expect(rows[0]?.memory).toBe("NÃO");
  });

  it("expansão com uma empresa não inventa destino", () => {
    const board = rankExpansionOpportunities({
      sources: [
        {
          id: "pb-1",
          kind: "PLAYBOOK",
          title: "Indicação",
          originCompanyId: "a",
          originCompanyName: "J BURGUERS",
          originSegment: "Alimentação",
          validated: true,
        },
      ],
      companies: [company()],
    });
    expect(board.candidates).toEqual([]);
    expect(board.emptyBody).toMatch(/Evidência da origem não transfere/);
  });

  it("expansão entre empresas é hipótese e não copia evidência", () => {
    const board = rankExpansionOpportunities({
      sources: [
        {
          id: "pb-1",
          kind: "PLAYBOOK",
          title: "Indicação",
          originCompanyId: "a",
          originCompanyName: "J BURGUERS",
          originSegment: "Alimentação",
          validated: true,
        },
      ],
      companies: [
        company(),
        company({
          id: "b",
          name: "Burger Centro",
          diagnosis: { overallScore: 70, bottleneck: "CMV", createdAt: "2026-09-01T00:00:00.000Z" },
        }),
      ],
    });
    expect(board.candidates).toHaveLength(1);
    expect(board.candidates[0]?.destinationCompanyId).toBe("b");
    expect(board.candidates[0]?.classification).toBe("HIPOTESE");
    expect(board.candidates[0]?.reasons.join(" ")).toMatch(/permanece na origem/);
    expect(board.candidates[0]?.score).toBeLessThanOrEqual(100);
  });

  it("não sugere destino que já testa o mesmo playbook", () => {
    const board = rankExpansionOpportunities({
      sources: [
        {
          id: "pb-1",
          kind: "PLAYBOOK",
          title: "Indicação",
          originCompanyId: "a",
          originCompanyName: "J BURGUERS",
          originSegment: "Alimentação",
          validated: true,
        },
      ],
      companies: [company(), company({ id: "b", name: "Burger Centro" })],
      existingApplications: [{ sourceId: "pb-1", destinationCompanyId: "b" }],
    });
    expect(board.candidates).toEqual([]);
  });

  it("fonte não validada não entra no motor de expansão", () => {
    expect(expansionEmptyState({ companyCount: 2, validatedSources: 0 }).title).toMatch(/validado/i);
    const board = rankExpansionOpportunities({
      sources: [
        {
          id: "pb-1",
          kind: "PLAYBOOK",
          title: "Rascunho",
          originCompanyId: "a",
          originCompanyName: "J BURGUERS",
          originSegment: "Alimentação",
          validated: false,
        },
      ],
      companies: [company(), company({ id: "b", name: "Burger Centro" })],
    });
    expect(board.candidates).toEqual([]);
  });

  it("corrige typo de segmento na apresentação", () => {
    expect(displaySegment("ALIMENTAÇÃP")).toBe("Alimentação");
  });

  it("órfã sem empresa e sem alocação não é decisão operacional", () => {
    expect(isOperationalDecision({ companyId: null, hasAllocationProposal: false })).toBe(false);
  });

  it("só cancela órfã inequívoca de teste pendente", () => {
    expect(
      isUnequivocalTestOrphanDecision({
        title: "Aprovar plano-piloto",
        companyId: null,
        opportunityId: null,
        hasAllocationProposal: false,
        status: "PENDING_HUMAN_APPROVAL",
      }),
    ).toBe(true);
    expect(
      isUnequivocalTestOrphanDecision({
        title: "Aprovar plano-piloto",
        companyId: null,
        status: "APPROVED",
      }),
    ).toBe(false);
    expect(
      isUnequivocalTestOrphanDecision({
        title: "Aprovar plano-piloto",
        companyId: "emp-1",
        status: "PENDING_HUMAN_APPROVAL",
      }),
    ).toBe(false);
  });

  it("persiste typo ALIMENTAÇÃP como Alimentação", () => {
    expect(isAlimentacaoTypo("ALIMENTAÇÃP")).toBe(true);
    expect(persistableSegment("ALIMENTAÇÃP")).toBe("Alimentação");
    expect(persistableSegment("Padaria")).toBe("Padaria");
  });

  it("perguntas de expansão e completude não inventam destino", () => {
    expect(detectQuestionIntent("Há destino para expansão?")).toBe("PLAYBOOK");
    expect(detectQuestionIntent("Onde testar este aprendizado?")).toBe("PLAYBOOK");
    expect(isExpansionQuestion("Há destino para expansão?")).toBe(true);
    expect(isCompletenessQuestion("Onde faltam dados?")).toBe(true);
    const completeness = buildPortfolioCompleteness([company()]);
    const expansion = rankExpansionOpportunities({ sources: [], companies: [company()] });
    expect(composeCompletenessAnswer(completeness)).toMatch(/uma empresa/i);
    expect(composeCompletenessAnswer(completeness)).toMatch(/Diagnóstico 360°/);
    expect(composeExpansionAnswer(expansion)).toMatch(/não transfere/i);
    expect(
      portfolioIntelligenceAnswer({
        question: "Há destino para expansão?",
        completeness,
        expansion,
        fallback: "fallback",
      }),
    ).not.toBe("fallback");
  });
});
