import { describe, expect, it } from "vitest";
import { validateBenchmarkClaim } from "@/lib/research-claims";
import { applyExternalResearch, wrapExternalAsData } from "@/lib/research-engine";
import {
  filterRelevantSources,
  isSemanticallyRelevantSource,
  selectSourcesForIntent,
} from "@/lib/research-filter";
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

const question =
  "Compare o CMV desta empresa com a média do mercado brasileiro. Pesquise na web e mostre as fontes utilizadas.";

const plan = buildResearchQuery(question, {
  name: "J BURGUERS",
  segment: "ALIMENTAÇÃO",
  city: null,
  state: null,
});

function emptyAnswer(extra: Partial<ExecutiveAnswer> = {}): ExecutiveAnswer {
  return {
    summary: "x",
    data: [
      { kind: "DADO", text: "CMV: 30%.", source: "Financeiro" },
      { kind: "DADO", text: "Faturamento: R$ 100.000.", source: "Financeiro" },
      { kind: "DADO", text: "EBITDA: não informado.", source: "Financeiro" },
      { kind: "DADO", text: "Caixa do mês: não informado.", source: "Financeiro" },
    ],
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
    ...extra,
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
  cogsTarget: 28,
  cashBalance: 12000,
  scenarios: [{ label: "base", revenue: 100000, ebitda: null }],
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

function apply(sources: NormalizedSource[]) {
  const filtered = filterRelevantSources(sources, plan);
  const selected = selectSourcesForIntent(filtered.accepted, "BENCHMARK", plan.original);
  return applyExternalResearch(emptyAnswer(), {
    used: selected.length > 0,
    unavailable: null,
    skipped: false,
    sources: selected,
    query: plan.query,
    queryOriginal: plan.original,
    researchKind: "benchmark",
    company,
    finance,
  });
}

const kart = source({
  title: "Copa Brasil de Kart movimentou mais de R$ 700 mil em premiação",
  snippet: "A competição reuniu pilotos no Brasil e movimentou mais de R$ 700 mil.",
  domain: "esportes.com.br",
  url: "https://esportes.com.br/kart",
  sourceType: "press",
  publisher: "esportes.com.br",
});

describe("filtro semântico residual", () => {
  it("rejeita artigo de kart em CMV de restaurante", () => {
    const semantic = isSemanticallyRelevantSource(kart, plan);
    expect(semantic.relevant).toBe(false);
    expect(semantic.reason).toBe("semantic_mismatch");
    const filtered = filterRelevantSources([kart], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(filtered.rejected[0]?.rejectReason).toBe("semantic_mismatch");
  });

  it("rejeita notícia policial/celebridade sem relação", () => {
    const news = source({
      title: "Polícia prende celebridade após festa",
      snippet: "Notícia policial sem relação com alimentação ou custos.",
      domain: "noticias.com",
      url: "https://noticias.com/celebridade",
      sourceType: "press",
    });
    const filtered = filterRelevantSources([news], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(["semantic_mismatch", "low_semantic_relevance"]).toContain(filtered.rejected[0]?.rejectReason);
  });

  it("rejeita título semanticamente incompatível mesmo com snippet coincidente", () => {
    const mismatch = source({
      title: "Futebol: campeonato de verão movimenta o Brasil",
      snippet: "CMV de restaurantes no Brasil fica em 30%.",
    });
    const filtered = filterRelevantSources([mismatch], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(filtered.rejected[0]?.rejectReason).toBe("semantic_mismatch");
  });

  it("rejeita snippet off-topic com título genérico", () => {
    const mismatch = source({
      title: "Atualidades da semana",
      snippet: "Copa Brasil de Kart movimentou mais de R$ 700 mil em São Paulo.",
    });
    const filtered = filterRelevantSources([mismatch], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(["semantic_mismatch", "low_semantic_relevance"]).toContain(filtered.rejected[0]?.rejectReason);
  });

  it("rejeita mismatch de métrica", () => {
    const ebitda = source({
      title: "EBITDA de software houses na Europa",
      snippet: "A margem EBITDA média de SaaS europeu ficou em 12%.",
      domain: "saas.eu",
      url: "https://saas.eu/ebitda",
      sourceType: "secondary",
    });
    const filtered = filterRelevantSources([ebitda], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(["low_semantic_relevance", "segment_mismatch", "geography_mismatch"]).toContain(
      filtered.rejected[0]?.rejectReason,
    );
  });

  it("rejeita mismatch de segmento", () => {
    const oficina = source({
      title: "CMV de oficinas mecânicas",
      snippet: "Custo da Mercadoria Vendida em oficinas e autopeças.",
      domain: "oficinas.com.br",
      url: "https://oficinas.com.br/cmv",
      sourceType: "secondary",
    });
    const filtered = filterRelevantSources([oficina], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(["segment_mismatch", "low_semantic_relevance"]).toContain(filtered.rejected[0]?.rejectReason);
  });

  it("aceita fonte realmente relevante de CMV em restaurante", () => {
    const filtered = filterRelevantSources([source()], plan);
    expect(filtered.accepted).toHaveLength(1);
    expect(isSemanticallyRelevantSource(source(), plan).relevant).toBe(true);
  });
});

describe("cards principais e quantidade", () => {
  it("esconde EXAMPLE dos cards principais", () => {
    const example = source({
      title: "Como calcular o Custo da Mercadoria Vendida",
      snippet: "Em nosso exemplo, estoque inicial 18 mil e CMV 33,3%.",
      domain: "blog-exemplo.com",
      url: "https://blog-exemplo.com/cmv",
      sourceType: "secondary",
    });
    const filtered = filterRelevantSources([example, source()], plan);
    expect(filtered.rejected.some((item) => item.rejectReason === "example_only")).toBe(true);
    const answer = apply([example, source()]);
    expect(answer.externalSources.map((item) => item.title).join(" ")).not.toMatch(/exemplo|calcul/i);
    expect(answer.externalSources.every((item) => item.claimType !== "EXAMPLE")).toBe(true);
  });

  it("esconde calculadora dos cards de benchmark", () => {
    const calculator = source({
      title: "Calculadora de CMV",
      snippet: "Calcule grátis o CMV. Se a receita for 90 mil, o CMV é 33,3%.",
      domain: "calc.com",
      url: "https://calc.com/cmv",
      sourceType: "secondary",
    });
    const filtered = filterRelevantSources([calculator], plan);
    expect(filtered.accepted).toHaveLength(0);
    expect(apply([calculator]).externalSources).toHaveLength(0);
  });

  it("esconde fórmula dos cards de benchmark", () => {
    const formula = source({
      title: "Fórmula do CMV",
      snippet: "Fórmula: (estoque inicial + compras - estoque final) / receita * 100. Resultado 100%.",
      domain: "formula.com",
      url: "https://formula.com/cmv",
      sourceType: "secondary",
    });
    expect(apply([formula]).externalSources).toHaveLength(0);
  });

  it("mostra 2 fontes quando só há 2 boas", () => {
    const a = source();
    const b = source({
      title: "Estudo FGV de food service",
      url: "https://fgv.br/cmv",
      domain: "fgv.br",
      sourceType: "study",
      snippet: "Pesquisa realizada com 200 restaurantes brasileiros encontrou média observada de 31%.",
    });
    const filtered = filterRelevantSources([a, b], plan);
    expect(selectSourcesForIntent(filtered.accepted, "BENCHMARK", plan.original)).toHaveLength(2);
    expect(apply([a, b]).externalSources).toHaveLength(2);
  });

  it("mostra 1 fonte quando só há 1 boa", () => {
    expect(apply([source()]).externalSources).toHaveLength(1);
  });

  it("não inventa fonte quando zero fontes boas", () => {
    const answer = apply([kart]);
    expect(answer.externalSources).toHaveLength(0);
    expect(answer.researchUsed).toBe(false);
    expect(answer.summary).not.toMatch(/kart/i);
  });

  it("limita a no máximo 4 cards", () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      source({ title: `Fonte ${index}`, url: `https://www.sebrae.com.br/${index}`, domain: `sebrae-${index}.com.br` }),
    );
    expect(apply(many).externalSources.length).toBeLessThanOrEqual(4);
    expect(selectSourcesForIntent(many.map((item) => ({ ...item, relevanceScore: 80 })), "BENCHMARK").length).toBeLessThanOrEqual(4);
  });
});

describe("classificação, duplicidade e UX executiva", () => {
  it("remove duplicidade de classificação", () => {
    const answer = apply([source()]);
    const card = answer.externalSources[0];
    expect(card?.displayType).toBe(card?.confidenceLabel);
    expect(card?.displayType).not.toMatch(/ · /);
  });

  it("não repete texto de divergência no resumo", () => {
    const a = source({ snippet: "Média de 25% a 30% no mercado brasileiro de restaurantes." });
    const b = source({
      title: "Estudo FGV",
      url: "https://fgv.br/cmv",
      domain: "fgv.br",
      sourceType: "study",
      snippet: "Pesquisa realizada com 400 restaurantes brasileiros encontrou média observada de 38%.",
    });
    const answer = apply([a, b]);
    const hits = answer.summary.match(/valores diferentes/gi) ?? [];
    expect(hits.length).toBeLessThanOrEqual(1);
    expect(answer.external.filter((item) => /fonte\(s\) relevantes apresentam/i.test(item.text))).toHaveLength(0);
  });

  it("resposta executiva compacta sem dados irrelevantes", () => {
    const answer = apply([source()]);
    expect(answer.summary).toMatch(/RESUMO EXECUTIVO/);
    expect(answer.summary).toMatch(/CMV atual: 30%/);
    expect(answer.summary).toMatch(/Meta interna: 28%/);
    expect(answer.summary).toMatch(/Desvio: \+2 p\.p\./);
    expect(answer.summary.length).toBeLessThan(700);
    expect(answer.summary).not.toMatch(/faturamento|EBITDA|caixa do mês|ponto de equilíbrio/i);
    expect(answer.summary).not.toMatch(/https:\/\//);
  });

  it("mantém detalhe técnico acessível e KPIs internos completos nos dados", () => {
    const answer = apply([source()]);
    expect(answer.data.some((item) => /faturamento/i.test(item.text))).toBe(true);
    expect(answer.external.some((item) => item.sourceLabel === "REGRA" || item.text.includes("Fonte externa não altera"))).toBe(true);
    expect(answer.summary).not.toMatch(/Fonte externa não altera score/);
  });

  it("não apresenta hipótese como evidência", () => {
    const answer = apply([source()]);
    expect(answer.evidence.some((item) => /desperd[ií]cio|compras estão erradas|ficha técnica está errada/i.test(item.text))).toBe(false);
    expect(answer.hypotheses.some((item) => /hip[oó]tese|investigar|ficha técnica/i.test(item.text))).toBe(true);
  });

  it("não rotula referência prática como BENCHMARK", () => {
    const practical = source({
      title: "CMV: entenda o que é e como reduzir",
      snippet: "A faixa sugerida de CMV fica entre 18% e 25%. O ideal pode variar para restaurantes.",
      domain: "bareserestaurantes.com.br",
      url: "https://bareserestaurantes.com.br/cmv",
      sourceType: "secondary",
    });
    const validation = validateBenchmarkClaim(practical, plan);
    expect(validation.claimType).toBe("REFERENCE");
    expect(validation.displayType).toBe("REFERÊNCIA ESPECIALIZADA");
    expect(apply([practical]).externalSources[0]?.claimType).toBe("REFERENCE");
  });

  it("não envia fonte rejeitada para o contexto da OpenAI", () => {
    const filtered = filterRelevantSources([kart, source()], plan);
    const selected = selectSourcesForIntent(filtered.accepted, "BENCHMARK", plan.original);
    expect(selected.some((item) => /kart/i.test(item.title))).toBe(false);
    const packed = wrapExternalAsData({
      sources: selected.map((item) => ({ title: item.title, snippet: item.snippet })),
    });
    expect(packed).not.toMatch(/kart/i);
    expect(packed).toMatch(/Custo da Mercadoria Vendida/);
  });

  it("preserva isolamento de owner no plano de query e fallback", () => {
    expect(plan.query).not.toMatch(/J BURGUERS|100000|30%/);
    const fallback = applyExternalResearch(emptyAnswer(), {
      used: false,
      unavailable: "Pesquisa externa indisponível neste momento.",
      skipped: false,
      sources: [],
      query: plan.query,
      researchKind: "benchmark",
      company,
      finance,
    });
    expect(fallback.researchUsed).toBe(false);
    expect(fallback.externalSources).toHaveLength(0);
    expect(fallback.researchUnavailable).toMatch(/indisponível/i);
  });
});

describe("regressão J BURGUERS", () => {
  it("compara CMV 30% vs meta 28% sem kart, homônimo, calculadora ou média nacional inventada", () => {
    const practical = source({
      title: "CMV: entenda o que é e como reduzir",
      snippet: "Referência prática de CMV para restaurantes. A faixa sugerida pode variar entre 28% e 32%.",
      domain: "bareserestaurantes.com.br",
      url: "https://bareserestaurantes.com.br/cmv",
      sourceType: "secondary",
    });
    const study = source({
      title: "Estudo setorial de food service",
      snippet: "Pesquisa realizada com 180 restaurantes brasileiros encontrou média observada de 31%.",
      domain: "fgv.br",
      url: "https://fgv.br/food-cmv",
      sourceType: "study",
    });
    const noise = [
      kart,
      source({
        title: "CMV Group leadership",
        snippet: "CMV Group announces new CEO",
        domain: "cmvgroup.com",
        url: "https://cmvgroup.com",
        sourceType: "secondary",
      }),
      source({
        title: "CMV Informatics",
        snippet: "CMV Informatics software",
        domain: "cmvinformatics.com",
        url: "https://cmvinformatics.com",
        sourceType: "secondary",
      }),
      source({
        title: "CMV Teknoloji",
        snippet: "CMV Teknoloji solutions",
        domain: "cmvteknoloji.com",
        url: "https://cmvteknoloji.com",
        sourceType: "secondary",
      }),
      source({
        title: "RocketReach contacts",
        snippet: "Find emails at restaurants",
        domain: "rocketreach.co",
        url: "https://rocketreach.co/x",
        sourceType: "community",
      }),
      source({
        title: "Calculadora de CMV",
        snippet: "Calcule grátis o CMV. Se a receita for 90 mil, CMV 33,3%.",
        domain: "calc.com",
        url: "https://calc.com/cmv",
        sourceType: "secondary",
      }),
    ];
    const filtered = filterRelevantSources([practical, study, ...noise], plan);
    const selected = selectSourcesForIntent(filtered.accepted, "BENCHMARK", plan.original);
    expect(selected.every((item) => !/kart|Group|Informatics|Teknoloji|RocketReach|Calculadora/i.test(item.title))).toBe(true);
    const answer = apply([practical, study, ...noise]);
    expect(answer.summary).toMatch(/CMV atual: 30%/);
    expect(answer.summary).toMatch(/Meta interna: 28%/);
    expect(answer.summary).toMatch(/Desvio: \+2 p\.p\./);
    expect(answer.summary).toMatch(/referências|sustentação suficiente|média nacional/i);
    expect(answer.summary).not.toMatch(/média brasileira é|benchmark brasileiro é|mercado trabalha em/i);
    expect(answer.summary).not.toMatch(/kart|RocketReach|CMV Group|há desperdício/i);
    expect(answer.externalSources.length).toBeGreaterThanOrEqual(1);
    expect(answer.externalSources.length).toBeLessThanOrEqual(4);
    expect(answer.externalSources.every((item) => item.claimType !== "EXAMPLE" && item.claimType !== "FORMULA")).toBe(true);
    expect(answer.nextActions.join(" ")).toMatch(/acompanhamento semanal/i);
  });
});
