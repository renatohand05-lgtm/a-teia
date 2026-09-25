export const CONNECTION_SCORE_VERSION = "connection-score-1.0";

export const CONNECTION_TYPES = [
  "CLIENTE",
  "FORNECEDOR",
  "PARCEIRO",
  "CANAL",
  "INDICACAO",
  "CROSS_SELL",
  "UPSELL",
  "RECORRENCIA",
  "AQUISICAO",
  "RETENCAO",
  "EFICIENCIA_OPERACIONAL",
  "COMPARTILHAMENTO_DE_RECURSO",
  "APRENDIZADO_TRANSFERIVEL",
  "ESTRATEGIA_TRANSFERIVEL",
] as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const CONNECTION_STATUSES = [
  "SUGERIDA",
  "EM_ANALISE",
  "APROVADA",
  "EM_TESTE",
  "VALIDADA",
  "REJEITADA",
  "ARQUIVADA",
] as const;

export type ConnectionLifecycle = (typeof CONNECTION_STATUSES)[number];

export const CONNECTION_CLASSIFICATIONS = [
  "DADO_INTERNO",
  "INFERENCIA",
  "HIPOTESE",
  "EVIDENCIA",
  "MEMORIA_VALIDADA",
  "FONTE_EXTERNA",
  "RECOMENDACAO",
] as const;

export type ConnectionOriginClass = (typeof CONNECTION_CLASSIFICATIONS)[number];

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  CLIENTE: "Cliente",
  FORNECEDOR: "Fornecedor",
  PARCEIRO: "Parceiro",
  CANAL: "Canal",
  INDICACAO: "Indicação",
  CROSS_SELL: "Cross-sell",
  UPSELL: "Upsell",
  RECORRENCIA: "Recorrência",
  AQUISICAO: "Aquisição",
  RETENCAO: "Retenção",
  EFICIENCIA_OPERACIONAL: "Eficiência operacional",
  COMPARTILHAMENTO_DE_RECURSO: "Compartilhamento de recurso",
  APRENDIZADO_TRANSFERIVEL: "Aprendizado transferível",
  ESTRATEGIA_TRANSFERIVEL: "Estratégia transferível",
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionLifecycle, string> = {
  SUGERIDA: "Sugerida",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  EM_TESTE: "Em teste",
  VALIDADA: "Validada",
  REJEITADA: "Rejeitada",
  ARQUIVADA: "Arquivada",
};

export const CONNECTION_CLASS_LABELS: Record<ConnectionOriginClass, string> = {
  DADO_INTERNO: "Dado interno",
  INFERENCIA: "Inferência",
  HIPOTESE: "Hipótese",
  EVIDENCIA: "Evidência",
  MEMORIA_VALIDADA: "Memória validada",
  FONTE_EXTERNA: "Fonte externa",
  RECOMENDACAO: "Recomendação",
};

export const CONNECTION_SCORE_WEIGHTS = {
  segmentFit: 0.15,
  audienceFit: 0.1,
  needFit: 0.15,
  economicPotential: 0.1,
  testEase: 0.1,
  testSpeed: 0.08,
  internalEvidence: 0.12,
  validatedMemory: 0.1,
  risk: 0.05,
  effort: 0.05,
} as const;

export type ConnectionScoreFactorKey = keyof typeof CONNECTION_SCORE_WEIGHTS;

export type ConnectionMemorySignal = {
  id: string;
  companyId: string;
  title: string;
  validated: boolean;
  approved: boolean;
  segment: string | null;
  kpi: string | null;
  limitations: string | null;
};

export type ConnectionCompanySignal = {
  id: string;
  name: string;
  segment: string | null;
  bottlenecks: string | null;
  objectives: string | null;
  notes: string | null;
  revenueMonthly: number | null;
  marginPercent: number | null;
  hasDiagnosis: boolean;
  diagnosisBottleneck: string | null;
  hasFinance: boolean;
  evidenceCount: number;
  validatedEvidenceCount: number;
  memories: ConnectionMemorySignal[];
};

export type ConnectionScoreFactor = {
  key: ConnectionScoreFactorKey;
  label: string;
  value: number | null;
  used: boolean;
};

export type ConnectionScoreResult = {
  score: number | null;
  partial: boolean;
  factors: ConnectionScoreFactor[];
  used: string[];
  missing: string[];
  justification: string;
  version: string;
  calculatedAt: string;
};

export type ConnectionDiscovery = {
  fromId: string;
  toId: string;
  type: ConnectionType;
  mechanism: string;
  hypothesis: string;
  justification: string;
  limitations: string;
  nextAction: string;
  classification: ConnectionOriginClass;
  score: ConnectionScoreResult;
  usedMemoryIds: string[];
  usedEvidenceHint: boolean;
  usedFields: string[];
  discoveryKey: string;
};

const COMPLEMENTARY_SEGMENTS: Array<[string, string, ConnectionType, string]> = [
  ["oficina", "alimentacao", "INDICACAO", "benefício cruzado para motoristas e clientes recorrentes"],
  ["oficina", "servicos", "PARCEIRO", "serviço complementar de manutenção e operação"],
  ["alimentacao", "varejo", "CROSS_SELL", "público compartilhado de consumo local"],
  ["alimentacao", "servicos", "CANAL", "canal de aquisição em operação complementar"],
  ["saude", "servicos", "PARCEIRO", "serviço auxiliar à jornada do cliente"],
  ["educacao", "servicos", "PARCEIRO", "oferta complementar de capacitação e operação"],
  ["industria", "servicos", "FORNECEDOR", "encadeamento operacional possível"],
  ["varejo", "servicos", "CANAL", "ponto de contato compartilhado com o cliente"],
];

function fold(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeConnectionSegment(segment: string | null | undefined): string | null {
  const raw = fold(segment);
  if (!raw) return null;
  if (/oficina|mecan/.test(raw)) return "oficina";
  if (/aliment|restaur|food|burguer|hambur/.test(raw)) return "alimentacao";
  if (/varejo|comercio|loja/.test(raw)) return "varejo";
  if (/saude|clinica|odonto/.test(raw)) return "saude";
  if (/educa/.test(raw)) return "educacao";
  if (/industr/.test(raw)) return "industria";
  if (/servic/.test(raw)) return "servicos";
  return raw;
}

export function connectionDiscoveryKey(fromId: string, toId: string, type: ConnectionType): string {
  return `${fromId}:${toId}:${type}`;
}

export function connectionTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return CONNECTION_TYPE_LABELS[type as ConnectionType] ?? type;
}

export function connectionStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return CONNECTION_STATUS_LABELS[status as ConnectionLifecycle] ?? status;
}

export function connectionClassLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CONNECTION_CLASS_LABELS[value as ConnectionOriginClass] ?? value;
}

export function displayConnectionScore(score: number | null | undefined, partial: boolean): {
  value: string;
  caption: string;
} {
  if (score == null) return { value: "Sem dados", caption: "Prioridade de análise indisponível" };
  return {
    value: String(score),
    caption: partial ? "Score parcial" : "Prioridade para análise — não é probabilidade de sucesso",
  };
}

function factor(
  key: ConnectionScoreFactorKey,
  label: string,
  value: number | null,
): ConnectionScoreFactor {
  return { key, label, value, used: value != null && Number.isFinite(value) };
}

export function calculateConnectionScore(input: {
  from: ConnectionCompanySignal;
  to: ConnectionCompanySignal;
  type: ConnectionType;
  usedMemoryIds?: string[];
}): ConnectionScoreResult {
  const fromSeg = normalizeConnectionSegment(input.from.segment);
  const toSeg = normalizeConnectionSegment(input.to.segment);
  const sameSegment = Boolean(fromSeg && toSeg && fromSeg === toSeg);
  const complementary = COMPLEMENTARY_SEGMENTS.some(
    ([a, b, type]) =>
      type === input.type &&
      ((fromSeg === a && toSeg === b) || (fromSeg === b && toSeg === a)),
  );

  const fromNeed = fold(input.from.diagnosisBottleneck || input.from.bottlenecks || input.from.objectives);
  const toNeed = fold(input.to.diagnosisBottleneck || input.to.bottlenecks || input.to.objectives);
  const needOverlap = fromNeed && toNeed ? (fromNeed.includes(toNeed.slice(0, 12)) || toNeed.includes(fromNeed.slice(0, 12)) || /recorr|aquis|reten|indic|frota|cliente/.test(fromNeed + toNeed)) : false;

  const memories = [...input.from.memories, ...input.to.memories].filter((item) => item.validated && item.approved);
  const usedMemories = memories.filter((item) => (input.usedMemoryIds ?? []).includes(item.id) || item.companyId === input.from.id);

  const factors: ConnectionScoreFactor[] = [
    factor(
      "segmentFit",
      "Aderência entre segmentos",
      fromSeg && toSeg ? (sameSegment ? 0.72 : complementary ? 0.86 : 0.28) : null,
    ),
    factor(
      "audienceFit",
      "Compatibilidade de público",
      fromNeed || toNeed ? (needOverlap ? 0.8 : 0.4) : null,
    ),
    factor(
      "needFit",
      "Compatibilidade de necessidade",
      input.from.hasDiagnosis || input.to.hasDiagnosis || fromNeed || toNeed
        ? needOverlap
          ? 0.82
          : 0.38
        : null,
    ),
    factor(
      "economicPotential",
      "Potencial econômico informado",
      input.from.revenueMonthly != null || input.to.revenueMonthly != null
        ? Math.min(1, ((input.from.revenueMonthly ?? 0) + (input.to.revenueMonthly ?? 0)) / 80_000)
        : null,
    ),
    factor("testEase", "Facilidade de teste", input.from.hasDiagnosis || input.to.hasDiagnosis ? 0.7 : 0.45),
    factor("testSpeed", "Velocidade de teste", input.from.hasFinance || input.to.hasFinance ? 0.62 : null),
    factor(
      "internalEvidence",
      "Evidências internas existentes",
      input.from.evidenceCount + input.to.evidenceCount > 0
        ? Math.min(1, (input.from.validatedEvidenceCount + input.to.validatedEvidenceCount) * 0.35 + 0.2)
        : input.from.evidenceCount + input.to.evidenceCount === 0 && (input.from.hasDiagnosis || input.to.hasDiagnosis)
          ? 0.15
          : null,
    ),
    factor(
      "validatedMemory",
      "Memória estratégica validada",
      usedMemories.length ? Math.min(1, 0.55 + usedMemories.length * 0.15) : memories.length ? 0.3 : null,
    ),
    factor("risk", "Risco residual (invertido)", input.from.hasDiagnosis && input.to.hasDiagnosis ? 0.58 : 0.4),
    factor("effort", "Esforço residual (invertido)", complementary || sameSegment ? 0.66 : 0.42),
  ];

  const used = factors.filter((item) => item.used);
  const missing = factors.filter((item) => !item.used).map((item) => item.label);
  const weightSum = used.reduce((sum, item) => sum + CONNECTION_SCORE_WEIGHTS[item.key], 0);
  const weighted = used.reduce((sum, item) => sum + (item.value ?? 0) * CONNECTION_SCORE_WEIGHTS[item.key], 0);
  const score = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : null;
  const partial = score == null || missing.length > 0 || weightSum < 0.55;
  const justification =
    score == null
      ? "Não há sinais suficientes para priorizar esta análise. Ausência de dado não foi preenchida."
      : partial
        ? `Prioridade de análise ${score}/100 com cobertura parcial. Fatores ausentes: ${missing.join(", ") || "nenhum"}. Isso não é probabilidade de sucesso.`
        : `Prioridade de análise ${score}/100 com os fatores persistidos. Similaridade não é evidência.`;

  return {
    score,
    partial,
    factors,
    used: used.map((item) => item.label),
    missing,
    justification,
    version: CONNECTION_SCORE_VERSION,
    calculatedAt: new Date(0).toISOString(),
  };
}

export function stampConnectionScore(result: ConnectionScoreResult, at = new Date()): ConnectionScoreResult {
  return { ...result, calculatedAt: at.toISOString() };
}

function complementaryMechanism(from: ConnectionCompanySignal, to: ConnectionCompanySignal): Array<{
  type: ConnectionType;
  mechanism: string;
}> {
  const fromSeg = normalizeConnectionSegment(from.segment);
  const toSeg = normalizeConnectionSegment(to.segment);
  const found: Array<{ type: ConnectionType; mechanism: string }> = [];
  if (!fromSeg || !toSeg) return found;
  for (const [a, b, type, mechanism] of COMPLEMENTARY_SEGMENTS) {
    if ((fromSeg === a && toSeg === b) || (fromSeg === b && toSeg === a)) {
      found.push({ type, mechanism });
    }
  }
  if (fromSeg === toSeg) {
    found.push({ type: "CROSS_SELL", mechanism: "mesmo segmento — possível oferta complementar, ainda hipótese" });
  }
  return found;
}

function transferableMemories(from: ConnectionCompanySignal): ConnectionMemorySignal[] {
  return from.memories.filter((item) => item.validated && item.approved && item.companyId === from.id);
}

export function discoverPairConnections(from: ConnectionCompanySignal, to: ConnectionCompanySignal): ConnectionDiscovery[] {
  if (from.id === to.id) return [];
  const out: ConnectionDiscovery[] = [];
  const usedFields: string[] = [];
  if (from.segment) usedFields.push("segmento origem");
  if (to.segment) usedFields.push("segmento destino");
  if (from.hasDiagnosis || to.hasDiagnosis) usedFields.push("diagnóstico");
  if (from.hasFinance || to.hasFinance) usedFields.push("financeiro");
  if (from.bottlenecks || to.bottlenecks || from.diagnosisBottleneck || to.diagnosisBottleneck) usedFields.push("gargalo");

  const mechanisms = complementaryMechanism(from, to);
  for (const item of mechanisms) {
    const memories = transferableMemories(from);
    const score = stampConnectionScore(
      calculateConnectionScore({ from, to, type: item.type, usedMemoryIds: memories.map((memory) => memory.id) }),
    );
    out.push({
      fromId: from.id,
      toId: to.id,
      type: item.type,
      mechanism: item.mechanism,
      hypothesis: `Possível conexão ${CONNECTION_TYPE_LABELS[item.type].toLowerCase()} entre ${from.name} e ${to.name} via ${item.mechanism}.`,
      justification: score.justification,
      limitations: "Similaridade e complementaridade não comprovam transferência. Evidência da origem não vira evidência do destino.",
      nextAction: "Revisar a hipótese e, se fizer sentido, criar uma estratégia para testar.",
      classification: "HIPOTESE",
      score,
      usedMemoryIds: memories.map((memory) => memory.id),
      usedEvidenceHint: from.validatedEvidenceCount + to.validatedEvidenceCount > 0,
      usedFields,
      discoveryKey: connectionDiscoveryKey(from.id, to.id, item.type),
    });
  }

  const memories = transferableMemories(from);
  if (memories.length) {
    const type: ConnectionType = "APRENDIZADO_TRANSFERIVEL";
    const score = stampConnectionScore(
      calculateConnectionScore({ from, to, type, usedMemoryIds: memories.map((item) => item.id) }),
    );
    out.push({
      fromId: from.id,
      toId: to.id,
      type,
      mechanism: `aprendizado validado em ${from.name} candidato a teste em ${to.name}`,
      hypothesis: `Aprendizado validado em ${from.name} pode ser testado em ${to.name}. Na empresa destino isso permanece hipótese.`,
      justification: `Aprendizado validado em ${from.name}. Evidência da Empresa A não vira evidência da Empresa B.`,
      limitations: memories
        .map((item) => item.limitations)
        .filter(Boolean)
        .join(" · ") || "Condições do teste original podem não se repetir.",
      nextAction: "Avaliar diferenças de segmento, KPI e investimento antes de criar estratégia.",
      classification: "HIPOTESE",
      score,
      usedMemoryIds: memories.map((item) => item.id),
      usedEvidenceHint: from.validatedEvidenceCount > 0,
      usedFields: [...usedFields, "memória validada"],
      discoveryKey: connectionDiscoveryKey(from.id, to.id, type),
    });
  }

  return out;
}

export function discoverPortfolioConnections(companies: ConnectionCompanySignal[]): ConnectionDiscovery[] {
  const active = companies.filter((item) => item.id);
  const discoveries: ConnectionDiscovery[] = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = 0; j < active.length; j += 1) {
      if (i === j) continue;
      discoveries.push(...discoverPairConnections(active[i]!, active[j]!));
    }
  }
  const unique = new Map<string, ConnectionDiscovery>();
  for (const item of discoveries) {
    const current = unique.get(item.discoveryKey);
    if (!current || (item.score.score ?? -1) > (current.score.score ?? -1)) unique.set(item.discoveryKey, item);
  }
  return [...unique.values()].sort((a, b) => (b.score.score ?? -1) - (a.score.score ?? -1));
}

export function evidenceDoesNotTransfer(originCompanyId: string, destinationCompanyId: string): boolean {
  return originCompanyId !== destinationCompanyId;
}

export function transferredMemoryClassification(): ConnectionOriginClass {
  return "HIPOTESE";
}

export function externalSourceIsNotEvidence(): { origin: ConnectionOriginClass; evidence: false } {
  return { origin: "FONTE_EXTERNA", evidence: false };
}

export function aiCannotValidateConnection(): boolean {
  return true;
}

export function mapShowsOnlyPersisted(ids: string[], persistedIds: string[]): boolean {
  return ids.every((id) => persistedIds.includes(id));
}

export function humanMustConfirmOpportunity(): boolean {
  return true;
}

export const CONNECTION_EMPTY = {
  title: "Nenhuma conexão identificada.",
  body: "O mapa só mostra relações gravadas. Similaridade não inventa ligação.",
};

export function filterConnections<T extends {
  fromId: string;
  toId: string;
  type: string;
  status: string;
  classification: string;
  score: number | null;
  fromSegment?: string | null;
  toSegment?: string | null;
  createdAt: string;
}>(
  items: T[],
  filters: {
    companyId?: string;
    segment?: string;
    type?: string;
    status?: string;
    classification?: string;
    minScore?: number;
    periodFrom?: string;
    periodTo?: string;
  },
): T[] {
  return items.filter((item) => {
    if (filters.companyId && item.fromId !== filters.companyId && item.toId !== filters.companyId) return false;
    if (filters.segment) {
      const needle = fold(filters.segment);
      const hit = fold(item.fromSegment).includes(needle) || fold(item.toSegment).includes(needle);
      if (!hit) return false;
    }
    if (filters.type && filters.type !== "ALL" && item.type !== filters.type) return false;
    if (filters.status && filters.status !== "ALL" && item.status !== filters.status) return false;
    if (filters.classification && filters.classification !== "ALL" && item.classification !== filters.classification) {
      return false;
    }
    if (typeof filters.minScore === "number" && (item.score == null || item.score < filters.minScore)) return false;
    if (filters.periodFrom && item.createdAt < filters.periodFrom) return false;
    if (filters.periodTo && item.createdAt > filters.periodTo) return false;
    return true;
  });
}
