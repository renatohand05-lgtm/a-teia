import { calculatePlaybookCoverage, isActiveTransferStatus, type TransferStatus } from "@/lib/playbook-transfer-engine";

export const APPLICATION_PAGE_SIZE = 20;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PROPOSTA: "Proposta",
  REVISADA: "Revisada",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADA: "Aprovada",
  CONFIRMADA: "Oportunidade criada",
  PLANEJADA: "Planejada",
  EM_TESTE: "Em experimento",
  MEDIDA: "Resultado registrado",
  CONCLUIDA: "Concluída",
  REJEITADA: "Rejeitada",
  CANCELADA: "Cancelada",
  ARQUIVADA: "Arquivada",
};

export function applicationStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return APPLICATION_STATUS_LABELS[status] ?? status;
}

export type ApplicationNextAction = {
  key:
    | "complete_data"
    | "review_fit"
    | "request_decision"
    | "decide"
    | "create_plan"
    | "create_experiment"
    | "start_experiment"
    | "record_result"
    | "review_evidence"
    | "review_memory"
    | "complete"
    | "done";
  label: string;
};

export function getApplicationNextAction(input: {
  status: string;
  scorePartial?: boolean;
  kpi?: string | null;
  decisionId?: string | null;
  actionPlanId?: string | null;
  experimentId?: string | null;
  experimentStarted?: boolean;
  resultingEvidenceId?: string | null;
  resultingMemoryId?: string | null;
  memoryStatus?: string | null;
}): ApplicationNextAction {
  const status = input.status;
  if (status === "CONCLUIDA" || status === "REJEITADA" || status === "CANCELADA" || status === "ARQUIVADA") {
    return { key: "done", label: "Concluído" };
  }
  if ((status === "PROPOSTA" || status === "REVISADA") && (input.scorePartial || !input.kpi)) {
    return { key: "complete_data", label: "Completar dados" };
  }
  if (status === "PROPOSTA") return { key: "review_fit", label: "Revisar compatibilidade" };
  if (status === "REVISADA") return { key: "request_decision", label: "Enviar para decisão" };
  if (status === "AGUARDANDO_APROVACAO") return { key: "decide", label: "Aprovar teste" };
  if (!input.actionPlanId && (status === "APROVADA" || status === "CONFIRMADA")) {
    return { key: "create_plan", label: "Criar plano" };
  }
  if (input.resultingEvidenceId && !input.resultingMemoryId) {
    return { key: "review_evidence", label: "Avaliar evidência" };
  }
  if (input.resultingMemoryId && input.memoryStatus !== "APPROVED") {
    return { key: "review_memory", label: "Revisar memória" };
  }
  if (status === "MEDIDA") return { key: "complete", label: "Concluir aplicação" };
  if (!input.experimentId) return { key: "create_experiment", label: "Criar experimento" };
  if (input.experimentId && !input.experimentStarted && status !== "EM_TESTE") {
    return { key: "start_experiment", label: "Iniciar experimento" };
  }
  if (status === "EM_TESTE" || status === "PLANEJADA" || (input.experimentId && !input.resultingEvidenceId)) {
    return { key: "record_result", label: "Registrar resultado" };
  }
  return { key: "review_fit", label: "Revisar compatibilidade" };
}

export function applicationDaysLeft(horizonDays: number | null | undefined, startedAt?: string | null, now = Date.now()): string {
  if (horizonDays == null) return "Sem dados";
  if (!startedAt) return `${horizonDays} dias previstos`;
  const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 86400000);
  const left = horizonDays - elapsed;
  if (left < 0) return `${Math.abs(left)} dias em atraso`;
  return `${left} dias restantes`;
}

export type ApplicationListRow = {
  id: string;
  playbookId: string;
  playbookTitle: string;
  originCompanyId: string;
  originCompanyName: string;
  destinationCompanyId: string;
  destinationName: string;
  destinationSegment: string | null;
  compatibilityScore: number | null;
  scorePartial: boolean;
  status: string;
  kpi: string | null;
  horizonDays: number | null;
  experimentId: string | null;
  experimentStarted: boolean;
  experimentStartedAt: string | null;
  hasResult: boolean;
  hasLocalEvidence: boolean;
  classification: string | null;
  experimentClassification: string | null;
  resultingMemoryId: string | null;
  memoryStatus: string | null;
  decisionId: string | null;
  actionPlanId: string | null;
  ownerName: string | null;
  updatedAt: string;
  createdAt: string;
};

export function filterApplicationRows(
  rows: ApplicationListRow[],
  filters: {
    originId?: string;
    destinationId?: string;
    playbookId?: string;
    segment?: string;
    status?: string;
    compatibility?: string;
    result?: string;
    evidence?: string;
    period?: string;
    q?: string;
  },
  now = Date.now(),
): ApplicationListRow[] {
  const query = filters.q?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (filters.originId && filters.originId !== "ALL" && row.originCompanyId !== filters.originId) return false;
    if (filters.destinationId && filters.destinationId !== "ALL" && row.destinationCompanyId !== filters.destinationId) return false;
    if (filters.playbookId && filters.playbookId !== "ALL" && row.playbookId !== filters.playbookId) return false;
    if (filters.segment && filters.segment !== "ALL" && row.destinationSegment !== filters.segment) return false;
    if (filters.status && filters.status !== "ALL" && row.status !== filters.status) return false;
    if (filters.compatibility === "parcial" && !row.scorePartial) return false;
    if (filters.compatibility === "completa" && row.scorePartial) return false;
    if (filters.compatibility === "alta" && (row.compatibilityScore == null || row.compatibilityScore < 70)) return false;
    if (filters.compatibility === "baixa" && (row.compatibilityScore == null || row.compatibilityScore >= 50)) return false;
    if (filters.result === "pendente" && row.hasResult) return false;
    if (filters.result === "positivo" && row.experimentClassification !== "VALIDATED" && row.experimentClassification !== "PARTIALLY_VALIDATED") return false;
    if (filters.result === "negativo" && row.experimentClassification !== "REFUTED") return false;
    if (filters.result === "inconclusivo" && row.hasResult && row.experimentClassification !== "INCONCLUSIVE") return false;
    if (filters.evidence === "local" && !row.hasLocalEvidence) return false;
    if (filters.evidence === "nenhuma" && row.hasLocalEvidence) return false;
    if (filters.period && filters.period !== "ALL") {
      const days = Number(filters.period);
      if (Number.isFinite(days) && now - new Date(row.updatedAt).getTime() > days * 86400000) return false;
    }
    if (query) {
      const haystack = `${row.playbookTitle} ${row.originCompanyName} ${row.destinationName} ${row.kpi ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function sortApplicationRows(rows: ApplicationListRow[], order?: string, now = Date.now()): ApplicationListRow[] {
  const copy = [...rows];
  if (order === "antigas") copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  else if (order === "compat_desc") copy.sort((a, b) => (b.compatibilityScore ?? -1) - (a.compatibilityScore ?? -1));
  else if (order === "compat_asc") copy.sort((a, b) => (a.compatibilityScore ?? 999) - (b.compatibilityScore ?? 999));
  else if (order === "prazo") {
    copy.sort((a, b) => remainingMs(a, now) - remainingMs(b, now));
  } else if (order === "acao") {
    copy.sort((a, b) => actionRank(a) - actionRank(b) || b.updatedAt.localeCompare(a.updatedAt));
  } else {
    copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return copy;
}

function remainingMs(row: ApplicationListRow, now: number): number {
  if (row.horizonDays == null) return Number.POSITIVE_INFINITY;
  const start = row.experimentStartedAt ? new Date(row.experimentStartedAt).getTime() : new Date(row.createdAt).getTime();
  return start + row.horizonDays * 86400000 - now;
}

function actionRank(row: ApplicationListRow): number {
  const next = getApplicationNextAction(row);
  const ranks: Record<ApplicationNextAction["key"], number> = {
    decide: 0,
    record_result: 1,
    complete_data: 2,
    start_experiment: 3,
    create_experiment: 4,
    create_plan: 5,
    request_decision: 6,
    review_fit: 7,
    review_evidence: 8,
    review_memory: 9,
    complete: 10,
    done: 11,
  };
  return ranks[next.key];
}

export function applicationCenterKpis(rows: ApplicationListRow[], hasCoverage: boolean) {
  if (!hasCoverage) {
    return {
      active: null,
      awaitingDecision: null,
      inExperiment: null,
      pendingResults: null,
      completed: null,
      insufficient: null,
    };
  }
  return {
    active: rows.filter((item) => isActiveTransferStatus(item.status)).length,
    awaitingDecision: rows.filter((item) => item.status === "AGUARDANDO_APROVACAO").length,
    inExperiment: rows.filter((item) => item.status === "EM_TESTE").length,
    pendingResults: rows.filter((item) => item.status === "EM_TESTE" || item.status === "PLANEJADA").length,
    completed: rows.filter((item) => item.status === "CONCLUIDA").length,
    insufficient: rows.filter((item) => item.scorePartial && isActiveTransferStatus(item.status)).length,
  };
}

export function displayCenterKpi(value: number | null, hasCoverage: boolean): string {
  if (!hasCoverage) return "Sem dados";
  return String(value ?? 0);
}

export type OperationalStepState = "done" | "current" | "pending" | "blocked";
export type OperationalStep = { key: string; label: string; done: boolean; state: OperationalStepState };

export function buildOperationalTimeline(input: {
  proposedAt?: string | null;
  scored?: boolean;
  reviewedAt?: string | null;
  decisionId?: string | null;
  approved?: boolean;
  actionPlanId?: string | null;
  experimentId?: string | null;
  experimentStarted?: boolean;
  resultingEvidenceId?: string | null;
  resultingMemoryId?: string | null;
  memoryApproved?: boolean;
  completedAt?: string | null;
}): OperationalStep[] {
  const base = [
    { key: "selected", label: "Playbook selecionado", done: Boolean(input.proposedAt) },
    { key: "compat", label: "Compatibilidade calculada", done: Boolean(input.scored) },
    { key: "reviewed", label: "Aplicação revisada", done: Boolean(input.reviewedAt) },
    { key: "decision", label: "Decisão registrada", done: Boolean(input.decisionId && input.approved) },
    { key: "plan", label: "Plano criado", done: Boolean(input.actionPlanId) },
    { key: "experiment", label: "Experimento criado", done: Boolean(input.experimentId) },
    { key: "started", label: "Experimento iniciado", done: Boolean(input.experimentStarted) },
    { key: "result", label: "Resultado registrado", done: Boolean(input.resultingEvidenceId) },
    { key: "evidence", label: "Evidência criada", done: Boolean(input.resultingEvidenceId) },
    { key: "memory", label: "Memória proposta", done: Boolean(input.resultingMemoryId) },
    { key: "memoryApproved", label: "Memória aprovada", done: Boolean(input.memoryApproved) },
    { key: "completed", label: "Aplicação concluída", done: Boolean(input.completedAt) },
  ];
  return decorateTimelineStates(base);
}

export function decorateTimelineStates<T extends { done: boolean }>(steps: T[]): Array<T & { state: OperationalStepState }> {
  let currentAssigned = false;
  return steps.map((step, index) => {
    if (step.done) return { ...step, state: "done" as const };
    const previous = steps[index - 1];
    if (previous && !previous.done) return { ...step, state: "blocked" as const };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, state: "current" as const };
    }
    return { ...step, state: "pending" as const };
  });
}

export function operationalProgress(steps: OperationalStep[]): { done: number; total: number; caption: string } {
  const done = steps.filter((item) => item.done).length;
  return {
    done,
    total: steps.length,
    caption: `${done} de ${steps.length} etapas concluídas`,
  };
}

export function neverCallProgressSuccess(caption: string): boolean {
  return !/sucesso|chance/i.test(caption);
}

export const APPLICATION_EMPTY = {
  list: "Nenhum playbook está sendo testado em outra empresa.",
  results: "Nenhum resultado pendente.",
  evidence: "Nenhuma evidência local registrada.",
  memory: "Nenhuma memória",
};

export function memoryStateLabel(status?: string | null, validated?: boolean | null): string {
  if (!status) return APPLICATION_EMPTY.memory;
  if (status === "APPROVED" || validated) return "Memória aprovada";
  if (status === "REJECTED") return "Memória rejeitada";
  return "Memória proposta";
}

export function experimentSummaryLabel(row: Pick<ApplicationListRow, "experimentId" | "experimentStarted">): string {
  if (!row.experimentId) return "Sem dados";
  return row.experimentStarted ? "Em andamento" : "Criado";
}

export function resultSummaryLabel(row: Pick<ApplicationListRow, "hasResult" | "experimentClassification">): string {
  if (!row.hasResult) return "Pendente";
  if (row.experimentClassification === "VALIDATED" || row.experimentClassification === "PARTIALLY_VALIDATED") return "Positivo";
  if (row.experimentClassification === "REFUTED") return "Negativo";
  return "Inconclusivo";
}

export function evidenceSummaryLabel(row: Pick<ApplicationListRow, "hasLocalEvidence">): string {
  return row.hasLocalEvidence ? "Local no destino" : "Nenhuma";
}

export function pageHref(base: string, suffix: string, page: number): string {
  const sep = suffix ? "&" : "";
  return `${base}?${suffix}${sep}pagina=${page}`;
}

export function playbookSortKey(
  order: string | undefined,
  item: { updatedAt: string; applicationCount: number; measured: number; segments: number },
): number | string {
  if (order === "aplicados") return -item.applicationCount;
  if (order === "cobertura") return -item.measured;
  if (order === "diversidade") return -item.segments;
  return item.updatedAt;
}

export function matchesPlaybookLibraryFilter(
  item: { applicationCount: number; testedCompanies: number; testedSegments: number },
  filters: { applications?: string; companies?: string; segments?: string },
): boolean {
  if (filters.applications === "com" && item.applicationCount === 0) return false;
  if (filters.applications === "sem" && item.applicationCount > 0) return false;
  if (filters.companies === "2+" && item.testedCompanies < 2) return false;
  if (filters.segments === "2+" && item.testedSegments < 2) return false;
  return true;
}

export function coverageFromApplications(
  rows: Array<{
    destinationCompanyId: string;
    destinationSegment: string | null;
    status: string;
    classification: string | null;
    resultingEvidenceId: string | null;
  }>,
) {
  return calculatePlaybookCoverage(rows);
}

export { isActiveTransferStatus };
export type { TransferStatus };
