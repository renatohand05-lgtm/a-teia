export const DIAGNOSTIC_DIMENSIONS = [
  {
    key: "attraction",
    label: "Atração",
    explanation: "Capacidade da empresa de gerar fluxo constante de novos clientes.",
  },
  {
    key: "conversion",
    label: "Conversão",
    explanation: "Capacidade de transformar oportunidades e leads em vendas.",
  },
  {
    key: "averageTicket",
    label: "Ticket Médio",
    explanation: "Capacidade de elevar o valor médio de cada venda sem perder conversão.",
  },
  {
    key: "recurrence",
    label: "Recorrência",
    explanation: "Capacidade de fazer o cliente voltar e comprar novamente.",
  },
  {
    key: "referral",
    label: "Indicação",
    explanation: "Capacidade de gerar novos negócios a partir de clientes satisfeitos.",
  },
  {
    key: "brandImage",
    label: "Imagem da Marca",
    explanation: "Percepção de confiança, diferenciação e reputação no mercado em que atua.",
  },
  {
    key: "commercialImage",
    label: "Imagem Comercial",
    explanation: "Clareza da oferta, da proposta de valor e da força de venda no ponto de contato.",
  },
  {
    key: "operations",
    label: "Operação",
    explanation: "Qualidade da entrega, processos, capacidade produtiva e consistência do serviço.",
  },
  {
    key: "finance",
    label: "Financeiro",
    explanation: "Nível de controle sobre margem, caixa, custos, DRE e resultado.",
  },
  {
    key: "managementData",
    label: "Gestão & Dados",
    explanation: "Qualidade dos indicadores e utilização de dados na tomada de decisão.",
  },
] as const;

export type DiagnosticDimensionKey = (typeof DIAGNOSTIC_DIMENSIONS)[number]["key"];

export const DIAGNOSTIC_MAX_POINTS = 50;
export const DIAGNOSTIC_MIN_SCORE = 1;
export const DIAGNOSTIC_MAX_SCORE = 5;

/** Limites centralizados — alterar aqui muda a classificação em todo o sistema. */
export const MATURITY_BANDS = [
  { min: 0, max: 39, label: "Crítico" },
  { min: 40, max: 59, label: "Em estruturação" },
  { min: 60, max: 74, label: "Em desenvolvimento" },
  { min: 75, max: 89, label: "Estruturado" },
  { min: 90, max: 100, label: "Alta maturidade" },
] as const;

export type DimensionScoreInput = {
  key: DiagnosticDimensionKey;
  score: number;
};

export type Score360Result = {
  rawTotal: number;
  score100: number;
  maturity: string;
  bottlenecks: Array<{ key: DiagnosticDimensionKey; label: string; score: number }>;
  strengths: Array<{ key: DiagnosticDimensionKey; label: string; score: number }>;
  attention: Array<{ key: DiagnosticDimensionKey; label: string; score: number }>;
  scoresKind: "INTERNAL_DATA";
  bottleneckKind: "INFERENCE";
};

export function dimensionByKey(key: string) {
  return DIAGNOSTIC_DIMENSIONS.find((item) => item.key === key);
}

export function isDiagnosticScore(value: number): boolean {
  return Number.isInteger(value) && value >= DIAGNOSTIC_MIN_SCORE && value <= DIAGNOSTIC_MAX_SCORE;
}

export function calculateScore360(scores: DimensionScoreInput[]): Score360Result {
  if (scores.length !== DIAGNOSTIC_DIMENSIONS.length) {
    throw new Error("O diagnóstico exige as 10 dimensões.");
  }

  const byKey = new Map(scores.map((item) => [item.key, item.score]));
  const ordered = DIAGNOSTIC_DIMENSIONS.map((dimension) => {
    const score = byKey.get(dimension.key);
    if (score === undefined || !isDiagnosticScore(score)) {
      throw new Error(`Nota inválida em ${dimension.label}. Use apenas valores de 1 a 5.`);
    }
    return { key: dimension.key, label: dimension.label, score };
  });

  const rawTotal = ordered.reduce((sum, item) => sum + item.score, 0);
  const score100 = Math.round((rawTotal / DIAGNOSTIC_MAX_POINTS) * 100);
  const maturity = classifyMaturity(score100);
  const min = Math.min(...ordered.map((item) => item.score));
  const max = Math.max(...ordered.map((item) => item.score));

  return {
    rawTotal,
    score100,
    maturity,
    bottlenecks: ordered.filter((item) => item.score === min),
    strengths: ordered.filter((item) => item.score === max && item.score > min),
    attention: ordered.filter((item) => item.score <= 2),
    scoresKind: "INTERNAL_DATA",
    bottleneckKind: "INFERENCE",
  };
}

export function classifyMaturity(score100: number): string {
  const clamped = Math.max(0, Math.min(100, score100));
  const band = MATURITY_BANDS.find((item) => clamped >= item.min && clamped <= item.max);
  return band?.label ?? "Em estruturação";
}

export function bottleneckLabels(result: Score360Result): string {
  return result.bottlenecks.map((item) => item.label).join(", ");
}
