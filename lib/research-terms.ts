export type MetricAcronym = {
  key: string;
  acronym: string;
  expansions: string[];
  contextHints: string[];
};

export const METRIC_ACRONYMS: MetricAcronym[] = [
  {
    key: "CMV",
    acronym: "CMV",
    expansions: ["Custo da Mercadoria Vendida", "custo das mercadorias vendidas", "food cost", "COGS"],
    contextHints: ["restaurante", "alimentação", "ficha técnica", "cardápio", "food service", "mercadoria vendida"],
  },
  {
    key: "DRE",
    acronym: "DRE",
    expansions: ["Demonstração do Resultado do Exercício", "demonstração de resultado"],
    contextHints: ["resultado", "lucro", "receita", "despesa"],
  },
  {
    key: "EBITDA",
    acronym: "EBITDA",
    expansions: ["Earnings Before Interest, Taxes, Depreciation and Amortization", "lucro antes de juros"],
    contextHints: ["margem", "operacional", "depreciação"],
  },
  {
    key: "CAC",
    acronym: "CAC",
    expansions: ["Custo de Aquisição de Cliente", "customer acquisition cost"],
    contextHints: ["aquisição", "marketing", "cliente"],
  },
  {
    key: "LTV",
    acronym: "LTV",
    expansions: ["Lifetime Value", "valor do tempo de vida do cliente"],
    contextHints: ["retenção", "recorrência", "cliente"],
  },
  {
    key: "ROI",
    acronym: "ROI",
    expansions: ["Retorno sobre Investimento", "return on investment"],
    contextHints: ["investimento", "retorno"],
  },
  {
    key: "TICKET",
    acronym: "ticket",
    expansions: ["Ticket médio", "ticket medio"],
    contextHints: ["venda", "consumo", "cliente"],
  },
];

export const AGGREGATOR_DOMAINS = [
  "rocketreach.co",
  "rocketreach.com",
  "zoominfo.com",
  "crunchbase.com",
  "apollo.io",
  "signalhire.com",
  "dnb.com",
  "owler.com",
  "pitchbook.com",
  "linkedin.com",
  "yellowpages.com",
  "yelp.com",
];

export const DIRECTORY_HINTS = [
  "management team",
  "employee directory",
  "people also search",
  "company profile",
  "lead database",
  "contact information",
  "email format",
  "org chart",
];

export const HOMONYM_ORG_SUFFIXES = [
  "group",
  "inc",
  "llc",
  "ltd",
  "gmbh",
  "s\\.a\\.",
  "teknoloji",
  "informatics",
  "software",
  "solutions",
  "consulting",
  "holdings",
  "corp",
  "company",
  "technologies",
  "tech",
];

export function detectMetricsInText(text: string): MetricAcronym[] {
  const hay = text.toLowerCase();
  return METRIC_ACRONYMS.filter((item) => {
    const acronymHit = new RegExp(`\\b${item.acronym}\\b`, "i").test(text);
    const expansionHit = item.expansions.some((exp) => hay.includes(exp.toLowerCase()));
    return acronymHit || expansionHit;
  });
}

export function preferredExpansion(metric: MetricAcronym, country = "Brasil"): string {
  if (country.toLowerCase().includes("brasil") || country.toLowerCase().includes("brazil")) {
    return metric.expansions[0];
  }
  return metric.expansions.find((item) => /[A-Za-z]{4,}/.test(item) && !/[áàãéêíóôúç]/i.test(item)) ?? metric.expansions[0];
}
