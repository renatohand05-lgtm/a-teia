export const PLAYBOOK_TRANSFER_VERSION = "playbook-transfer-1.0";

export const TRANSFER_STATUSES = [
  "PROPOSTA",
  "REVISADA",
  "AGUARDANDO_APROVACAO",
  "APROVADA",
  "CONFIRMADA",
  "PLANEJADA",
  "EM_TESTE",
  "MEDIDA",
  "CONCLUIDA",
  "REJEITADA",
  "CANCELADA",
  "ARQUIVADA",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PROPOSTA: "Proposta",
  REVISADA: "Revisada",
  AGUARDANDO_APROVACAO: "Aguardando decisão",
  APROVADA: "Aprovada",
  CONFIRMADA: "Oportunidade criada",
  PLANEJADA: "Planejada",
  EM_TESTE: "Em experimento",
  MEDIDA: "Resultado medido",
  CONCLUIDA: "Concluída",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
  ARQUIVADA: "Arquivada",
};

const TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  PROPOSTA: ["REVISADA", "AGUARDANDO_APROVACAO", "CONFIRMADA", "REJEITADA", "CANCELADA"],
  REVISADA: ["AGUARDANDO_APROVACAO", "CONFIRMADA", "REJEITADA", "CANCELADA"],
  AGUARDANDO_APROVACAO: ["APROVADA", "CONFIRMADA", "REJEITADA", "CANCELADA"],
  CONFIRMADA: ["APROVADA", "AGUARDANDO_APROVACAO", "PLANEJADA", "EM_TESTE", "REJEITADA", "CANCELADA"],
  APROVADA: ["PLANEJADA", "EM_TESTE", "CANCELADA"],
  PLANEJADA: ["EM_TESTE", "CANCELADA"],
  EM_TESTE: ["MEDIDA", "CANCELADA"],
  MEDIDA: ["CONCLUIDA", "CANCELADA"],
  CONCLUIDA: ["ARQUIVADA"],
  REJEITADA: ["PROPOSTA", "ARQUIVADA"],
  CANCELADA: ["PROPOSTA", "ARQUIVADA"],
  ARQUIVADA: [],
};

export function transferStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return TRANSFER_STATUS_LABELS[status as TransferStatus] ?? status;
}

export function canTransitionApplication(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from as TransferStatus];
  return Boolean(allowed?.includes(to as TransferStatus));
}

export function assertTransition(from: string, to: string): void {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`Transição inválida: ${from} → ${to}. O ciclo real não pode ser pulado.`);
  }
}

export function isActiveTransferStatus(status: string): boolean {
  return !["REJEITADA", "CANCELADA", "ARQUIVADA", "CONCLUIDA"].includes(status);
}

export function alreadyTestingCopy(): string {
  return "Este playbook já está sendo testado nesta empresa.";
}

export type TransferDimension = {
  key: string;
  label: string;
  max: number;
  value: number | null;
  missing: boolean;
};

export function calculateTransferCompatibility(input: {
  sameProblem: boolean | null;
  hasDiagnosis: boolean;
  sameSegment: boolean | null;
  kpiAvailable: boolean | null;
  hasCapacity: boolean | null;
  investmentCompatible: boolean | null;
  hasResources: boolean | null;
  hasRelatedHistory: boolean | null;
}): {
  score: number;
  partial: boolean;
  caption: string;
  dimensions: TransferDimension[];
  favorable: string[];
  differences: string[];
  missing: string[];
  risks: string[];
  version: string;
} {
  const dimensions: TransferDimension[] = [
    dim("problem", "Problema semelhante", 20, input.sameProblem == null ? null : input.sameProblem ? 16 : 6),
    dim("context", "Contexto operacional", 15, input.hasDiagnosis ? 12 : null),
    dim("segment", "Segmento/mecanismo", 10, input.sameSegment == null ? null : input.sameSegment ? 9 : 4),
    dim("kpi", "KPI disponível", 10, input.kpiAvailable == null ? null : input.kpiAvailable ? 8 : 3),
    dim("capacity", "Capacidade de execução", 15, input.hasCapacity == null ? null : input.hasCapacity ? 12 : 5),
    dim("investment", "Investimento compatível", 10, input.investmentCompatible == null ? null : input.investmentCompatible ? 8 : 3),
    dim("resources", "Recursos necessários", 10, input.hasResources == null ? null : input.hasResources ? 7 : 3),
    dim("history", "Histórico relacionado", 10, input.hasRelatedHistory == null ? null : input.hasRelatedHistory ? 7 : 3),
  ];
  const missing = dimensions.filter((item) => item.missing).map((item) => item.label);
  const score = dimensions.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const partial = missing.length > 0;
  const favorable = dimensions.filter((item) => !item.missing && (item.value ?? 0) >= item.max * 0.7).map((item) => item.label);
  const differences = dimensions.filter((item) => !item.missing && (item.value ?? 0) < item.max * 0.5).map((item) => item.label);
  return {
    score,
    partial,
    caption: partial
      ? `Score de compatibilidade: ${score}/100 — compatibilidade parcial por falta de dados. Não é probabilidade de sucesso.`
      : `Score de compatibilidade: ${score}/100 — prioridade para teste, não chance de sucesso.`,
    dimensions,
    favorable,
    differences,
    missing,
    risks: [
      "Evidência da origem não transfere.",
      "Resultado da Empresa A não é resultado esperado na Empresa B.",
      ...(partial ? ["Dados ausentes não foram completados artificialmente."] : []),
    ],
    version: PLAYBOOK_TRANSFER_VERSION,
  };
}

function dim(key: string, label: string, max: number, value: number | null): TransferDimension {
  return { key, label, max, value, missing: value == null };
}

export function buildAdaptation(input: {
  originalDuration: number | null;
  originalInvestment: number | null;
  originalTarget: number | null;
  originalChannel: string | null;
  proposedDuration: number | null;
  proposedInvestment: number | null;
  proposedTarget: number | null;
  proposedChannel: string | null;
}): { original: Record<string, string>; proposed: Record<string, string> } {
  const show = (value: number | string | null) => (value == null || value === "" ? "Sem dados" : String(value));
  return {
    original: {
      prazo: show(input.originalDuration),
      investimento: show(input.originalInvestment),
      meta: show(input.originalTarget),
      canal: show(input.originalChannel),
    },
    proposed: {
      prazo: show(input.proposedDuration),
      investimento: show(input.proposedInvestment),
      meta: show(input.proposedTarget),
      canal: show(input.proposedChannel),
    },
  };
}

export function localHypothesis(playbookTitle: string, destinationName: string, days: number | null): string {
  return `Testar “${playbookTitle}” inspirado no playbook de origem na empresa ${destinationName}${days ? ` durante ${days} dias` : ""}. Permanece hipótese.`;
}

export function mapResultPolarity(classification: string | null | undefined): "POSITIVO" | "NEGATIVO" | "INCONCLUSIVO" {
  if (classification === "VALIDATED" || classification === "PARTIALLY_VALIDATED") return "POSITIVO";
  if (classification === "REFUTED") return "NEGATIVO";
  return "INCONCLUSIVO";
}

export type CoverageInput = {
  destinationCompanyId: string;
  destinationSegment: string | null;
  status: string;
  classification: string | null;
  resultingEvidenceId: string | null;
};

export function calculatePlaybookCoverage(rows: CoverageInput[]): {
  measured: number;
  positives: number;
  negatives: number;
  inconclusive: number;
  companies: number;
  segments: number;
  maturity: "EXPERIMENTAL" | "REPLICADO" | "MULTICONTEXTO" | "SEM_MEDICAO";
  caption: string;
} {
  const measuredRows = rows.filter((item) => item.status === "MEDIDA" || item.status === "CONCLUIDA" || item.resultingEvidenceId);
  const polarities = measuredRows.map((item) => mapResultPolarity(item.classification));
  const companies = new Set(measuredRows.map((item) => item.destinationCompanyId));
  const segments = new Set(measuredRows.map((item) => item.destinationSegment).filter(Boolean));
  const measured = measuredRows.length;
  let maturity: "EXPERIMENTAL" | "REPLICADO" | "MULTICONTEXTO" | "SEM_MEDICAO" = "SEM_MEDICAO";
  if (measured >= 1 && companies.size < 2) maturity = "EXPERIMENTAL";
  if (companies.size >= 2) maturity = "REPLICADO";
  if (segments.size >= 2) maturity = "MULTICONTEXTO";
  return {
    measured,
    positives: polarities.filter((item) => item === "POSITIVO").length,
    negatives: polarities.filter((item) => item === "NEGATIVO").length,
    inconclusive: polarities.filter((item) => item === "INCONCLUSIVO").length,
    companies: companies.size,
    segments: segments.size,
    maturity,
    caption:
      maturity === "SEM_MEDICAO"
        ? "Sem medição no destino. Maturidade mede cobertura de evidência, não probabilidade."
        : `Cobertura: ${measured} aplicação(ões) medida(s) · ${companies.size} empresa(s) · ${segments.size} segmento(s). Maturidade ${maturity} não é chance de sucesso.`,
  };
}

export function compareOriginDestination(input: {
  origin: Record<string, string | number | null>;
  destination: Record<string, string | number | null>;
}): Array<{ label: string; origin: string; destination: string }> {
  const keys = ["segmento", "kpi", "baseline", "meta", "resultado", "investimento", "duracao"];
  return keys.map((key) => ({
    label: key,
    origin: input.origin[key] == null || input.origin[key] === "" ? "Sem dados" : String(input.origin[key]),
    destination: input.destination[key] == null || input.destination[key] === "" ? "Sem dados" : String(input.destination[key]),
  }));
}

export function buildTransferTimeline(input: {
  proposedAt?: string | null;
  reviewedAt?: string | null;
  decisionId?: string | null;
  approvedAt?: string | null;
  actionPlanId?: string | null;
  experimentId?: string | null;
  resultingEvidenceId?: string | null;
  resultingMemoryId?: string | null;
  completedAt?: string | null;
  confirmedAt?: string | null;
}): Array<{ key: string; label: string; done: boolean }> {
  return [
    { key: "selected", label: "Playbook selecionado", done: true },
    { key: "compat", label: "Compatibilidade analisada", done: Boolean(input.proposedAt) },
    { key: "proposed", label: "Aplicação proposta", done: Boolean(input.proposedAt) },
    { key: "decision", label: "Decisão aprovada", done: Boolean(input.approvedAt || input.confirmedAt) },
    { key: "plan", label: "Plano criado", done: Boolean(input.actionPlanId) },
    { key: "experiment", label: "Experimento iniciado", done: Boolean(input.experimentId) },
    { key: "result", label: "Resultado registrado", done: Boolean(input.resultingEvidenceId || input.completedAt) },
    { key: "evidence", label: "Evidência local criada", done: Boolean(input.resultingEvidenceId) },
    { key: "memory", label: "Memória proposta", done: Boolean(input.resultingMemoryId) },
  ];
}

export function evidenceStaysLocal(originCompanyId: string, destinationCompanyId: string, evidenceCompanyId: string): boolean {
  return evidenceCompanyId === destinationCompanyId && originCompanyId !== destinationCompanyId;
}

export function knowledgeConnectionType(): "APRENDIZADO_TRANSFERIVEL" {
  return "APRENDIZADO_TRANSFERIVEL";
}

export function strategyMultiContextCopy(segments: number): string | null {
  return segments >= 2 ? "Possui evidência em múltiplos contextos. Isso não promove a estratégia automaticamente." : null;
}

export function overlapSignal(left: string | null | undefined, right: string | null | undefined): boolean | null {
  if (!left?.trim() || !right?.trim()) return null;
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  const words = a.split(/\W+/).filter((word) => word.length > 3);
  if (!words.length) return a === b ? true : null;
  return words.some((word) => b.includes(word));
}

export function mapTransferSignals(input: {
  originProblem: string | null;
  destBottleneck: string | null;
  destHasDiagnosis: boolean;
  originSegment: string | null;
  destSegment: string | null;
  playbookKpi: string | null;
  destTeamSize: number | null;
  playbookInvestment: number | null;
  destRevenue: number | null;
  destHasResources: boolean | null;
  destRelatedHistory: boolean | null;
}) {
  const sameSegment =
    input.originSegment && input.destSegment
      ? input.originSegment.trim().toLowerCase() === input.destSegment.trim().toLowerCase()
      : null;
  const investmentCompatible =
    input.playbookInvestment == null || input.destRevenue == null
      ? null
      : input.playbookInvestment <= input.destRevenue * 0.15;
  return calculateTransferCompatibility({
    sameProblem: overlapSignal(input.originProblem, input.destBottleneck),
    hasDiagnosis: input.destHasDiagnosis,
    sameSegment,
    kpiAvailable: input.playbookKpi ? true : null,
    hasCapacity: input.destTeamSize == null ? null : input.destTeamSize > 0,
    investmentCompatible,
    hasResources: input.destHasResources,
    hasRelatedHistory: input.destRelatedHistory,
  });
}

export function buildTransversalLearning(input: {
  originName: string;
  destinationName: string;
  origin: Record<string, string | number | null>;
  destination: Record<string, string | number | null>;
  originPolarity?: string | null;
  destinationPolarity?: string | null;
}): {
  repeated: string[];
  changed: string[];
  worked: string[];
  failed: string[];
  conditions: string[];
  rows: Array<{ label: string; origin: string; destination: string }>;
  caution: string;
} {
  const rows = compareOriginDestination({ origin: input.origin, destination: input.destination });
  const repeated = rows.filter((row) => row.origin !== "Sem dados" && row.origin === row.destination).map((row) => row.label);
  const changed = rows.filter((row) => row.origin !== "Sem dados" && row.destination !== "Sem dados" && row.origin !== row.destination).map((row) => row.label);
  const destPolarity = mapResultPolarity(input.destinationPolarity);
  const originPolarity = mapResultPolarity(input.originPolarity);
  return {
    repeated,
    changed,
    worked: [
      originPolarity === "POSITIVO" ? `${input.originName}: resultado positivo na origem` : "",
      destPolarity === "POSITIVO" ? `${input.destinationName}: resultado positivo local` : "",
    ].filter(Boolean),
    failed: [
      originPolarity === "NEGATIVO" ? `${input.originName}: resultado negativo na origem` : "",
      destPolarity === "NEGATIVO" ? `${input.destinationName}: resultado negativo local` : "",
    ].filter(Boolean),
    conditions: rows.filter((row) => row.origin === "Sem dados" || row.destination === "Sem dados").map((row) => `${row.label}: ${row.origin} vs ${row.destination}`),
    rows,
    caution: "Comparação descritiva. Não conclui causalidade sem evidência suficiente em ambos os contextos.",
  };
}

export function transferPriorityReason(status: string, overdue: boolean, missingData: boolean): string | null {
  if (status === "AGUARDANDO_APROVACAO") return "Aplicação de playbook aguardando decisão humana.";
  if (overdue) return "Experimento de transferência com prazo vencido. Isso não prova falha.";
  if (status === "EM_TESTE" || status === "PLANEJADA") return "Teste de transferência sem resultado registrado.";
  if (missingData && (status === "PROPOSTA" || status === "REVISADA")) return "Aplicação com dados necessários ausentes.";
  return null;
}

export const TRANSFER_EMPTY = {
  applications: "Nenhuma aplicação",
  results: "Nenhum resultado",
  evidence: "Nenhuma evidência local",
  memory: "Nenhuma memória",
  data: "Nenhum dado suficiente",
};
