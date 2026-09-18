import { describe, expect, it } from "vitest";
import {
  classifyExternalClaim,
  extractSemanticPercents,
  synthesizeBenchmark,
  validateBenchmarkClaim,
} from "@/lib/research-claims";
import { applyExternalResearch } from "@/lib/research-engine";
import { filterRelevantSources, selectSourcesForIntent } from "@/lib/research-filter";
import { buildResearchQuery } from "@/lib/research-query";
import type { NormalizedSource } from "@/lib/research-engine";
import type { ExecutiveAnswer } from "@/lib/ai-executive-engine";

function source(overrides: Partial<NormalizedSource> = {}): NormalizedSource {
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

const plan = buildResearchQuery("Compare o CMV desta empresa com a média do mercado brasileiro. Pesquise na web e mostre as fontes utilizadas.", {
  name: "J BURGUERS",
  segment: "ALIMENTAÇÃO",
  city: null,
  state: null,
});

function emptyAnswer(): ExecutiveAnswer {
  return {
    summary: "x",
    data: [{ kind: "DADO", text: "CMV: 30%.", source: "Financeiro" }],
    inferences: [],
    hypotheses: [],
    evidence: [],
    nextActions: ["J BURGUERS ainda não tem diagnóstico persistido."],
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
  };
}

const finance = {
  periodLabel: "Set/2026",
  grossRevenue: 100000,
  netRevenue: 90000,
  cogsPercent: 30,
  grossMarginPercent: 70,
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
};

const company = {
  id: "1",
  name: "J BURGUERS",
  segment: "restaurante",
  city: null,
  state: null,
  revenueMonthly: null,
  marginPercent: null,
  teamSize: null,
  perceivedBottlenecks: null,
  objectives: null,
  notes: null,
};

describe("extração semântica e claims", () => {
  it("não trata 'multiplique por 100' como benchmark 100%", () => {
    const percents = extractSemanticPercents("Para obter o CMV, multiplique por 100 o resultado da divisão.");
    expect(percents.every((item) => item.ignoredReason === "multiplier" || item.value !== 100 || item.ignoredReason)).toBe(true);
    expect(classifyExternalClaim("Fórmula: (CMV/receita) * 100")).toBe("FORMULA");
  });

  it("classifica exemplo e calculadora fora de benchmark", () => {
    expect(classifyExternalClaim("Em nosso exemplo, estoque inicial 18 mil e CMV 33,3%.")).toBe("EXAMPLE");
    expect(classifyExternalClaim("Calculadora de CMV: se a receita for 90 mil, CMV 33,3%.")).toBe("EXAMPLE");
  });

  it("aceita faixa setorial como referência, não média nacional", () => {
    expect(classifyExternalClaim("CMV saudável entre 28% e 32% para restaurantes.")).toBe("REFERENCE");
    const validation = validateBenchmarkClaim(
      source({ snippet: "CMV saudável entre 28% e 32% para restaurantes.", sourceType: "secondary", domain: "setorfood.com" }),
      plan,
    );
    expect(validation.nationalEligible).toBe(false);
    expect(validation.claimType).toBe("REFERENCE");
  });

  it("aceita média de estudo com amostra como statistic/benchmark", () => {
    expect(
      classifyExternalClaim("Pesquisa realizada com 2000 restaurantes brasileiros encontrou média observada de 31,2%."),
    ).toBe("STATISTIC");
  });

  it("média nacional exige geografia e não promove fonte sem metodologia a robusta", () => {
    const weak = validateBenchmarkClaim(
      source({
        snippet: "CMV de 30%.",
        sourceType: "secondary",
        domain: "blog.com",
        title: "Texto genérico",
      }),
      plan,
    );
    expect(weak.nationalEligible).toBe(false);
    const geo = validateBenchmarkClaim(source(), plan);
    expect(geo.hasGeographySupport).toBe(true);
    expect(geo.claimType).toBe("BENCHMARK");
  });
});

describe("outliers, duplicatas e rastreio", () => {
  it("marca outlier contextual e não inventa 0–100%", () => {
    const synthesis = synthesizeBenchmark({
      companyName: "J BURGUERS",
      metricLabel: "CMV",
      internalValue: 30,
      sources: [
        source({ snippet: "CMV saudável entre 28% e 32%." }),
        source({
          title: "Fórmula CMV",
          snippet: "Multiplique por 100. Resultado 100%.",
          domain: "calc.com",
          url: "https://calc.com/x",
          sourceType: "secondary",
        }),
      ],
      plan,
    });
    expect(synthesis.summary).not.toMatch(/28%–100%|0% a 100%|média brasileira é/i);
    expect(synthesis.valuesUsed.every((item) => item < 90)).toBe(true);
  });

  it("não aceita claim externo sem sourceIds", () => {
    const synthesis = synthesizeBenchmark({
      companyName: "J BURGUERS",
      metricLabel: "CMV",
      internalValue: 30,
      sources: [source()],
      plan,
    });
    expect(synthesis.cited.every((item) => item.sourceIds.length > 0)).toBe(true);
  });

  it("preserva divergência legítima sem faixa artificial", () => {
    const synthesis = synthesizeBenchmark({
      companyName: "J BURGUERS",
      metricLabel: "CMV",
      internalValue: 30,
      sources: [
        source({ snippet: "Média de 25% a 30% no mercado brasileiro de restaurantes." }),
        source({
          title: "Estudo FGV",
          url: "https://fgv.br/cmv",
          domain: "fgv.br",
          sourceType: "study",
          snippet: "Faixa típica de 35% a 40% para food service no Brasil.",
        }),
      ],
      plan,
    });
    expect(synthesis.divergent).toBe(true);
    expect(synthesis.summary).not.toMatch(/25%–40% como média nacional|0% a 100%/i);
  });
});

describe("regressão J BURGUERS", () => {
  it("não afirma média brasileira 28–32% só com referências práticas", () => {
    expect(plan.query).toMatch(/estudo|pesquisa|relat[oó]rio|associa/i);
    expect(plan.query).not.toMatch(/30%|J BURGUERS|100000/);
    const practical = source({
      title: "CMV para restaurantes",
      domain: "setorfood.com",
      url: "https://setorfood.com/cmv",
      sourceType: "secondary",
      snippet: "CMV ideal pode variar entre 28% e 32%.",
    });
    const answer = applyExternalResearch(emptyAnswer(), {
      used: true,
      unavailable: null,
      skipped: false,
      sources: [practical],
      query: plan.query,
      queryOriginal: plan.original,
      researchKind: "benchmark",
      company,
      finance,
    });
    expect(answer.summary).toMatch(/30%/);
    expect(answer.summary).toMatch(/referências|sustentação suficiente|média nacional/i);
    expect(answer.summary).not.toMatch(/média brasileira é 28|benchmark brasileiro é 28|mercado trabalha em 28/i);
    expect(answer.evidence).toHaveLength(0);
    expect(answer.externalSources).toHaveLength(1);
    expect(answer.externalSources[0]?.confidenceLabel).not.toMatch(/dados divergentes/i);
    expect(answer.nextActions.join(" ")).toMatch(/acompanhamento semanal/i);
    expect(answer.nextActions.join(" ")).not.toMatch(/^J BURGUERS ainda não tem diagnóstico persistido$/);
    expect(answer.summary.length).toBeLessThan(700);
  });

  it("limita a 4 cards e esconde rejeitadas", () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      source({ title: `Fonte ${index}`, url: `https://www.sebrae.com.br/${index}`, domain: `sebrae-${index}.com.br` }),
    );
    const filtered = filterRelevantSources(
      [
        ...many,
        source({ title: "CMV Group", url: "https://cmvgroup.com", domain: "cmvgroup.com", snippet: "CMV Group leadership" }),
      ],
      plan,
    );
    expect(filtered.rejected.some((item) => item.rejectReason === "homonym")).toBe(true);
    expect(selectSourcesForIntent(filtered.accepted, "BENCHMARK").length).toBeLessThanOrEqual(4);
  });

  it("dado interno não vira fonte externa e fallback permanece", () => {
    const answer = applyExternalResearch(emptyAnswer(), {
      used: false,
      unavailable: "Pesquisa externa indisponível neste momento.",
      skipped: false,
      sources: [],
      query: plan.query,
      researchKind: "benchmark",
      company,
      finance,
    });
    expect(answer.researchUsed).toBe(false);
    expect(answer.externalSources).toHaveLength(0);
    expect(answer.summary).not.toMatch(/média brasileira é/i);
  });
});

describe("KPIs generalizados", () => {
  it("expande margem, folha, CAC e ticket na query", () => {
    expect(buildResearchQuery("Compare a margem com o mercado").expandedTerms.join(" ")).toMatch(/Margem bruta|margem/i);
    expect(buildResearchQuery("Minha folha está alinhada ao mercado?").intent).toBe("BENCHMARK");
    expect(buildResearchQuery("Compare o CAC com o mercado").query).toMatch(/Custo de Aquisição de Cliente/);
  });
});
