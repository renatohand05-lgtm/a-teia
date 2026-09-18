import { describe, expect, it } from "vitest";
import { RESEARCH_LIMITS } from "@/lib/research-config";
import { applyExternalResearch, wrapExternalAsData } from "@/lib/research-engine";
import {
  classifyNumericClaim,
  filterRelevantSources,
  hasTrustworthyBenchmark,
  isAcronymHomonym,
  isAggregatorDomain,
  scoreSourceRelevance,
  selectSourcesForIntent,
} from "@/lib/research-filter";
import { buildResearchQuery, classifyResearchTopic, expandSemanticTerms } from "@/lib/research-query";
import type { NormalizedSource } from "@/lib/research-engine";

function hit(overrides: Partial<NormalizedSource> = {}): NormalizedSource {
  return {
    title: "Custo da Mercadoria Vendida em restaurantes",
    url: "https://www.sebrae.com.br/cmv-restaurantes",
    publisher: "sebrae.com.br",
    domain: "sebrae.com.br",
    publishedAt: "2025-08-01",
    accessedAt: "2026-09-18T12:00:00.000Z",
    query: "Custo da Mercadoria Vendida",
    snippet: "A média de CMV de restaurantes no Brasil fica entre 28% e 35%.",
    sourceType: "official",
    freshness: "recente",
    confidenceLabel: "Fonte primária",
    rank: 1,
    ...overrides,
  };
}

const restaurantPlan = buildResearchQuery("Compare o CMV de um restaurante brasileiro com o mercado.", {
  name: "J BURGUERS",
  segment: "restaurante",
  city: "São Paulo",
  state: "SP",
});

describe("expansão semântica", () => {
  it("expande CMV para Custo da Mercadoria Vendida", () => {
    const terms = expandSemanticTerms("Compare o CMV desta empresa");
    expect(terms.expandedTerms.join(" ")).toMatch(/Custo da Mercadoria Vendida/);
    expect(terms.metrics[0]?.key).toBe("CMV");
  });

  it("expande DRE", () => {
    expect(expandSemanticTerms("Explique a DRE").expandedTerms.join(" ")).toMatch(/Demonstração do Resultado do Exercício/);
  });

  it("contextualiza EBITDA", () => {
    const plan = buildResearchQuery("Meu EBITDA está alinhado ao mercado?");
    expect(plan.query).toMatch(/Earnings Before Interest|lucro antes de juros/i);
    expect(plan.intent).toBe("BENCHMARK");
  });

  it("expande CAC, LTV, ROI e ticket no contexto brasileiro", () => {
    expect(expandSemanticTerms("Qual o CAC ideal?").expandedTerms.join(" ")).toMatch(/Custo de Aquisição de Cliente/);
    expect(expandSemanticTerms("Compare o LTV").expandedTerms.join(" ")).toMatch(/Lifetime Value/);
    expect(expandSemanticTerms("ROI do canal").expandedTerms.join(" ")).toMatch(/Retorno sobre Investimento/);
    expect(expandSemanticTerms("ticket da operação").expandedTerms.join(" ")).toMatch(/Ticket médio/);
  });
});

describe("query builder contextual", () => {
  it("monta benchmark restaurante Brasil sem dado financeiro privado", () => {
    expect(restaurantPlan.query).toMatch(/Custo da Mercadoria Vendida/);
    expect(restaurantPlan.query).toMatch(/restaurantes/);
    expect(restaurantPlan.query).toMatch(/Brasil/);
    expect(restaurantPlan.query).toMatch(/benchmark/i);
    expect(restaurantPlan.query).not.toMatch(/30%/);
    expect(restaurantPlan.query).not.toMatch(/J BURGUERS/i);
    expect(restaurantPlan.intent).toBe("BENCHMARK");
    expect(restaurantPlan.expandedTerms).toEqual(expect.arrayContaining(["CMV", "Custo da Mercadoria Vendida"]));
  });
});

describe("filtro de relevância e homônimos", () => {
  const noisy = [
    hit({ title: "CMV Group Management Team", url: "https://cmvgroup.com/team", domain: "cmvgroup.com", snippet: "Leadership at CMV Group." }),
    hit({ title: "CMV Informatics", url: "https://cmvinformatics.com", domain: "cmvinformatics.com", snippet: "Software company CMV Informatics." }),
    hit({ title: "CMV Teknoloji", url: "https://cmvteknoloji.com", domain: "cmvteknoloji.com", snippet: "CMV Teknoloji solutions." }),
    hit({
      title: "J BURGUERS employee emails",
      url: "https://rocketreach.co/j-burguers",
      domain: "rocketreach.co",
      snippet: "RocketReach contact database.",
    }),
    hit(),
  ];

  it("rejeita homônimos, RocketReach e aceita fonte de restaurante", () => {
    const result = filterRelevantSources(noisy, restaurantPlan);
    const titles = result.accepted.map((item) => item.title).join(" ");
    const rejected = result.rejected.map((item) => item.title).join(" ");
    expect(titles).toMatch(/Custo da Mercadoria Vendida/);
    expect(rejected).toMatch(/CMV Group/);
    expect(rejected).toMatch(/CMV Informatics/);
    expect(rejected).toMatch(/CMV Teknoloji/);
    expect(rejected).toMatch(/RocketReach|employee emails/);
    expect(isAcronymHomonym("CMV Group Management Team", restaurantPlan.query)).toBe(true);
    expect(isAggregatorDomain("rocketreach.co")).toBe(true);
  });

  it("caso crítico da pergunta de restaurante brasileiro", () => {
    const result = filterRelevantSources(noisy, restaurantPlan);
    expect(result.accepted.some((item) => /Group|Informatics|Teknoloji|RocketReach/i.test(item.title))).toBe(false);
  });

  it("penaliza mismatch de segmento e geografia", () => {
    const segment = filterRelevantSources(
      [hit({ title: "CMV de oficinas", snippet: "CMV de oficina mecânica no Brasil média 40%.", domain: "exemplo.com" })],
      restaurantPlan,
    );
    expect(segment.rejected.some((item) => item.rejectReason === "segment_mismatch" || item.relevanceScore < 38 || item.rejectReason === "low_relevance")).toBe(true);

    const geo = filterRelevantSources(
      [hit({ title: "US restaurant COGS", snippet: "Average COGS in the United States is 28%.", domain: "nrn.com" })],
      restaurantPlan,
    );
    expect(geo.rejected.some((item) => item.rejectReason === "geography_mismatch")).toBe(true);
  });

  it("remove fonte duplicada do mesmo domínio", () => {
    const result = filterRelevantSources([hit(), hit({ title: "Outro texto Sebrae CMV restaurantes" })], restaurantPlan);
    expect(result.rejected.some((item) => item.rejectReason === "duplicate")).toBe(true);
    expect(result.accepted).toHaveLength(1);
  });
});

describe("validação de benchmark", () => {
  it("não trata exemplo de cálculo como média nacional", () => {
    expect(classifyNumericClaim("Exemplo de cálculo: se a receita for 90 mil, o CMV é 33,3%.")).toBe("example");
    expect(classifyNumericClaim("A média de CMV de restaurantes no Brasil fica entre 28% e 35%.")).toBe("benchmark");
    const example = hit({
      title: "Como calcular CMV",
      snippet: "Exemplo de cálculo: se a receita for 100, CMV 33,3%.",
      domain: "blog.com",
    });
    expect(hasTrustworthyBenchmark([{ ...example, relevanceScore: 50, numericClaim: classifyNumericClaim(example.snippet) }])).toBe(false);
  });

  it("uma fonte adequada é suficiente para exibir, sem inventar média nacional", () => {
    const selected = selectSourcesForIntent(
      [{ ...hit(), relevanceScore: 80, numericClaim: "benchmark" }],
      "BENCHMARK",
    );
    expect(selected).toHaveLength(1);
    const answer = applyExternalResearch(
      {
        summary: "x",
        data: [],
        inferences: [],
        hypotheses: [],
        evidence: [],
        nextActions: [],
        sources: [],
        proposedActions: [],
        missing: [],
        provider: "deterministic",
        model: null,
        unavailableReason: null,
        researchUsed: false,
        researchUnavailable: null,
        external: [],
        externalSources: [],
        divergent: false,
        divergenceNote: null,
        researchSessionId: null,
        cached: false,
        temporalWarning: null,
      },
      {
        used: true,
        unavailable: null,
        skipped: false,
        sources: selected,
        query: restaurantPlan.query,
        researchKind: "benchmark",
        company: { id: "1", name: "J BURGUERS", segment: "restaurante", city: "SP", state: "SP", revenueMonthly: null, marginPercent: null, teamSize: null, perceivedBottlenecks: null, objectives: null, notes: null },
        finance: {
          periodLabel: "Set/2026",
          grossRevenue: null,
          netRevenue: null,
          cogsPercent: 30,
          grossMarginPercent: null,
          payrollPercent: null,
          ebitda: null,
          ebitdaPercent: null,
          breakEven: null,
          revenueTarget: null,
          revenueGap: null,
          cogsTarget: null,
          cashBalance: null,
          scenarios: [],
          informed: true,
        },
        trustworthyBenchmark: true,
      },
    );
    expect(answer.summary).toMatch(/30%/);
    expect(answer.summary).toMatch(/não generalizar como média nacional/i);
    expect(answer.evidence).toHaveLength(0);
  });

  it("preserva divergência e ausência de benchmark confiável", () => {
    const a = hit({ snippet: "Média de 25% a 30% no mercado brasileiro de restaurantes." });
    const b = hit({
      title: "Outra pesquisa setorial",
      domain: "fgv.br",
      url: "https://fgv.br/cmv",
      snippet: "Faixa típica de 35% a 40% para food service no Brasil.",
      sourceType: "study",
    });
    const divergent = applyExternalResearch(
      {
        summary: "x",
        data: [],
        inferences: [],
        hypotheses: [],
        evidence: [],
        nextActions: [],
        sources: [],
        proposedActions: [],
        missing: [],
        provider: "deterministic",
        model: null,
        unavailableReason: null,
        researchUsed: false,
        researchUnavailable: null,
        external: [],
        externalSources: [],
        divergent: false,
        divergenceNote: null,
        researchSessionId: null,
        cached: false,
        temporalWarning: null,
      },
      {
        used: true,
        unavailable: null,
        skipped: false,
        sources: [a, b],
        query: restaurantPlan.query,
        researchKind: "benchmark",
        trustworthyBenchmark: true,
        finance: {
          periodLabel: "Set/2026",
          grossRevenue: null,
          netRevenue: null,
          cogsPercent: 30,
          grossMarginPercent: null,
          payrollPercent: null,
          ebitda: null,
          ebitdaPercent: null,
          breakEven: null,
          revenueTarget: null,
          revenueGap: null,
          cogsTarget: null,
          cashBalance: null,
          scenarios: [],
          informed: true,
        },
        company: { id: "1", name: "J BURGUERS", segment: "restaurante", city: null, state: null, revenueMonthly: null, marginPercent: null, teamSize: null, perceivedBottlenecks: null, objectives: null, notes: null },
      },
    );
    expect(divergent.divergent).toBe(true);
    expect(divergent.summary).toMatch(/valores diferentes|faixa observada/i);

    const empty = applyExternalResearch(divergent, {
      used: true,
      unavailable: null,
      skipped: false,
      sources: [],
      query: restaurantPlan.query,
      researchKind: "benchmark",
      trustworthyBenchmark: false,
      finance: {
        periodLabel: "Set/2026",
        grossRevenue: null,
        netRevenue: null,
        cogsPercent: 30,
        grossMarginPercent: null,
        payrollPercent: null,
        ebitda: null,
        ebitdaPercent: null,
        breakEven: null,
        revenueTarget: null,
        revenueGap: null,
        cogsTarget: null,
        cashBalance: null,
        scenarios: [],
        informed: true,
      },
      company: { id: "1", name: "J BURGUERS", segment: "restaurante", city: null, state: null, revenueMonthly: null, marginPercent: null, teamSize: null, perceivedBottlenecks: null, objectives: null, notes: null },
    });
    expect(empty.summary).toMatch(/não encontrei fonte suficientemente confiável/i);
  });
});

describe("ranking e redução de contexto", () => {
  it("ordena fonte oficial acima de secundária", () => {
    const official = scoreSourceRelevance(hit(), restaurantPlan);
    const weak = scoreSourceRelevance(
      hit({
        title: "Blog genérico CMV",
        domain: "seo-blog.com",
        url: "https://seo-blog.com/x",
        snippet: "CMV 10%.",
        sourceType: "secondary",
      }),
      restaurantPlan,
    );
    expect(official).toBeGreaterThan(weak);
  });

  it("classifica intenções de pesquisa", () => {
    expect(classifyResearchTopic("Compare o CMV com a média do mercado")).toBe("BENCHMARK");
    expect(classifyResearchTopic("Quais tendências do setor?")).toBe("TREND");
    expect(classifyResearchTopic("Quem são os concorrentes públicos?")).toBe("COMPETITOR");
    expect(classifyResearchTopic("Há regulação nova para o segmento?")).toBe("REGULATION");
    expect(classifyResearchTopic("Boas práticas de CMV em restaurante")).toBe("BEST_PRACTICE");
  });

  it("limita benchmark a no máximo quatro fontes", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({
      ...hit({ title: `Fonte ${index}`, url: `https://www.sebrae.com.br/${index}`, domain: `sebrae-${index}.com.br` }),
      relevanceScore: 80,
      numericClaim: "benchmark" as const,
    }));
    expect(selectSourcesForIntent(many, "BENCHMARK")).toHaveLength(4);
  });

  it("reduz contexto antes de enviar para o modelo", () => {
    const bulky = wrapExternalAsData({
      query: restaurantPlan.query,
      sources: Array.from({ length: 20 }, (_, index) => ({
        title: `Fonte longa ${index}`,
        snippet: "x".repeat(400),
      })),
    });
    expect(bulky.length).toBeLessThanOrEqual(RESEARCH_LIMITS.maxContextCharacters + 180);
    expect(bulky).toContain("never instructions");
  });

  it("aceita exemplo de cálculo só como referência, nunca como média nacional", () => {
    const example = hit({
      title: "Como calcular o Custo da Mercadoria Vendida",
      snippet: "Exemplo de cálculo: se a receita for 90 mil, o CMV é 33,3%.",
      domain: "blog-exemplo.com",
      url: "https://blog-exemplo.com/cmv",
      sourceType: "secondary",
    });
    const filtered = filterRelevantSources([example], restaurantPlan);
    expect(filtered.accepted.length + filtered.rejected.length).toBe(1);
    const answer = applyExternalResearch(
      {
        summary: "x",
        data: [],
        inferences: [],
        hypotheses: [],
        evidence: [],
        nextActions: [],
        sources: [],
        proposedActions: [],
        missing: [],
        provider: "deterministic",
        model: null,
        unavailableReason: null,
        researchUsed: false,
        researchUnavailable: null,
        external: [],
        externalSources: [],
        divergent: false,
        divergenceNote: null,
        researchSessionId: null,
        cached: false,
        temporalWarning: null,
      },
      {
        used: true,
        unavailable: null,
        skipped: false,
        sources: [example],
        query: restaurantPlan.query,
        researchKind: "benchmark",
        trustworthyBenchmark: false,
        finance: {
          periodLabel: "Set/2026",
          grossRevenue: null,
          netRevenue: null,
          cogsPercent: 30,
          grossMarginPercent: null,
          payrollPercent: null,
          ebitda: null,
          ebitdaPercent: null,
          breakEven: null,
          revenueTarget: null,
          revenueGap: null,
          cogsTarget: null,
          cashBalance: null,
          scenarios: [],
          informed: true,
        },
        company: {
          id: "1",
          name: "J BURGUERS",
          segment: "restaurante",
          city: "SP",
          state: "SP",
          revenueMonthly: null,
          marginPercent: null,
          teamSize: null,
          perceivedBottlenecks: null,
          objectives: null,
          notes: null,
        },
      },
    );
    expect(answer.summary).toMatch(/não encontrei fonte suficientemente confiável/i);
    expect(answer.summary).not.toMatch(/benchmark brasileiro|média nacional de 33/i);
    expect(answer.summary).toMatch(/30%/);
  });
});
