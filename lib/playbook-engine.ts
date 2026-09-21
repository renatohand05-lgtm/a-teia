export const PLAYBOOK_COMPAT_VERSION = "playbook-compat-1.0";
export const PLAYBOOK_PAGE_SIZE = 20;

export const PLAYBOOK_STATUSES = ["RASCUNHO", "EM_REVISAO", "VALIDADO", "ARQUIVADO"] as const;
export type PlaybookLifecycle = (typeof PLAYBOOK_STATUSES)[number];

export const PLAYBOOK_APPLICATION_STATUSES = ["PROPOSTA", "CONFIRMADA", "REJEITADA", "EM_TESTE", "ARQUIVADA"] as const;
export type PlaybookApplicationLifecycle = (typeof PLAYBOOK_APPLICATION_STATUSES)[number];

export const PLAYBOOK_FAMILIES = [
  "AQUISICAO",
  "RETENCAO",
  "INDICACAO",
  "PARCERIA",
  "PRECIFICACAO",
  "OPERACAO",
  "CROSS_SELL",
  "OUTRO",
] as const;
export type PlaybookFamily = (typeof PLAYBOOK_FAMILIES)[number];

export const PLAYBOOK_STATUS_LABELS: Record<PlaybookLifecycle, string> = {
  RASCUNHO: "Rascunho",
  EM_REVISAO: "Em revisão",
  VALIDADO: "Validado",
  ARQUIVADO: "Arquivado",
};

export const PLAYBOOK_FAMILY_LABELS: Record<PlaybookFamily, string> = {
  AQUISICAO: "Aquisição",
  RETENCAO: "Retenção",
  INDICACAO: "Indicação",
  PARCERIA: "Parceria",
  PRECIFICACAO: "Precificação",
  OPERACAO: "Operação",
  CROSS_SELL: "Cross-sell",
  OUTRO: "Outro",
};

export const PLAYBOOK_COMPAT_WEIGHTS = {
  segment: 0.18,
  problem: 0.16,
  diagnosis: 0.12,
  audience: 0.1,
  kpi: 0.1,
  capacity: 0.1,
  investment: 0.08,
  history: 0.06,
  evidence: 0.06,
  contextGap: 0.04,
} as const;

export type PlaybookCompatFactorKey = keyof typeof PLAYBOOK_COMPAT_WEIGHTS;

export type PlaybookEligibilityInput = {
  status?: string | null;
  validated?: boolean;
  evidenceId?: string | null;
  measuredResult?: number | null;
  classification?: string | null;
};

export type PlaybookDraftInput = {
  title: string;
  family: string | null;
  problem: string | null;
  lesson: string | null;
  originCompanyName: string;
  originSegment: string | null;
  kpi: string | null;
  baseline: number | null;
  target: number | null;
  measuredResult: number | null;
  investment: number | null;
  limitations: string | null;
  conditions: string | null;
  audience: string | null;
  durationDays: number | null;
};

export type CompatibilityCompany = {
  id: string;
  name: string;
  segment: string | null;
  bottleneck: string | null;
  hasDiagnosis: boolean;
  teamSize: number | null;
  revenueMonthly: number | null;
  objectives: string | null;
  evidenceCount: number;
};

export type CompatibilityPlaybook = {
  originCompanyId: string;
  originSegment: string | null;
  family: string | null;
  problem: string | null;
  audience: string | null;
  primaryKpi: string | null;
  observedInvestment: number | null;
  requiredConditions: string | null;
  contrarySignals: string | null;
};

export type PlaybookListRow = {
  originCompanyId: string;
  originSegment: string | null;
  family: string | null;
  primaryKpi: string | null;
  status: string;
  confidence: number | null;
  observedResult: number | null;
  createdAt: string;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textOverlap(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a?.trim() || !b?.trim()) return null;
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 100;
  const tokens = right.split(/\W+/).filter((item) => item.length > 3);
  if (!tokens.length) return left.includes(right) || right.includes(left) ? 70 : 30;
  const hits = tokens.filter((token) => left.includes(token)).length;
  return clamp((hits / tokens.length) * 100);
}

export function playbookStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return PLAYBOOK_STATUS_LABELS[status as PlaybookLifecycle] ?? status;
}

export function playbookFamilyLabel(family: string | null | undefined): string {
  if (!family) return "Não informada";
  return PLAYBOOK_FAMILY_LABELS[family as PlaybookFamily] ?? family;
}

export function playbookEligibilityFromMemory(input: PlaybookEligibilityInput): {
  eligible: boolean;
  canValidateRecord: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.status !== "APPROVED") reasons.push("memória não aprovada");
  if (!input.evidenceId && input.measuredResult == null) reasons.push("ausência de evidência");
  const eligible = reasons.length === 0;
  return {
    eligible,
    canValidateRecord: eligible && Boolean(input.evidenceId),
    reasons,
  };
}

export function playbookEligibilityFromStrategy(input: {
  status?: string | null;
  evidenceCount?: number;
  measuredResult?: number | null;
}): {
  eligible: boolean;
  canValidateRecord: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.status !== "VALIDADA") reasons.push("estratégia não validada");
  if (!(input.evidenceCount && input.evidenceCount > 0) && input.measuredResult == null) {
    reasons.push("ausência de resultado medido");
  }
  const eligible = reasons.length === 0;
  return {
    eligible,
    canValidateRecord: eligible,
    reasons,
  };
}

export function draftPlaybookFromLearning(input: PlaybookDraftInput): {
  title: string;
  family: string;
  description: string;
  problem: string;
  scenario: string;
  limitations: string;
  recommendedAdaptations: string;
  status: PlaybookLifecycle;
} {
  const family =
    PLAYBOOK_FAMILIES.find((item) => input.family?.toUpperCase().includes(item) || input.title.toUpperCase().includes(item)) ??
    "OUTRO";
  return {
    title: input.title.slice(0, 160),
    family,
    description: `Foi validado neste contexto (${input.originCompanyName}) e pode ser testado em empresas com características semelhantes.`,
    problem: input.problem?.trim() || "Problema não informado na origem.",
    scenario: `Empresa de origem: ${input.originCompanyName}${input.originSegment ? ` · segmento ${input.originSegment}` : ""}.`,
    limitations:
      input.limitations?.trim() ||
      "Amostra, período e sazonalidade da origem não se repetem automaticamente no destino.",
    recommendedAdaptations: "Adaptar público, prazo e investimento antes de testar. Continua hipótese no destino.",
    status: "RASCUNHO",
  };
}

export function calculatePlaybookCompatibility(input: {
  playbook: CompatibilityPlaybook;
  company: CompatibilityCompany;
}): {
  score: number | null;
  partial: boolean;
  caption: string;
  factorsUsed: PlaybookCompatFactorKey[];
  factorsMissing: PlaybookCompatFactorKey[];
  favorable: string[];
  contrary: string[];
  limitations: string;
  version: string;
} {
  const used: Array<{ key: PlaybookCompatFactorKey; value: number }> = [];
  const missing: PlaybookCompatFactorKey[] = [];
  const favorable: string[] = [];
  const contrary: string[] = [];

  const add = (key: PlaybookCompatFactorKey, value: number | null, ok?: string, bad?: string) => {
    if (value == null) {
      missing.push(key);
      return;
    }
    used.push({ key, value });
    if (value >= 70 && ok) favorable.push(ok);
    if (value <= 40 && bad) contrary.push(bad);
  };

  add(
    "segment",
    input.playbook.originSegment && input.company.segment
      ? input.playbook.originSegment.toLowerCase() === input.company.segment.toLowerCase()
        ? 90
        : 45
      : null,
    "Segmento próximo ao de origem.",
    "Segmento diferente do contexto original.",
  );
  add(
    "problem",
    textOverlap(input.playbook.problem, input.company.bottleneck ?? input.company.objectives),
    "Problema parece aderente ao gargalo informado.",
    "Problema da origem não aparece no destino.",
  );
  if (!input.company.hasDiagnosis) missing.push("diagnosis");
  else add("diagnosis", input.company.bottleneck ? 70 : 50, "Há diagnóstico no destino.");
  add("audience", textOverlap(input.playbook.audience, input.company.objectives) ?? (input.playbook.audience ? 40 : null));
  add("kpi", input.playbook.primaryKpi ? 65 : null);
  add(
    "capacity",
    input.company.teamSize == null ? null : input.company.teamSize >= 3 ? 70 : 40,
    undefined,
    "Capacidade operacional informada é restrita.",
  );
  add(
    "investment",
    input.playbook.observedInvestment == null || input.company.revenueMonthly == null
      ? null
      : input.playbook.observedInvestment <= input.company.revenueMonthly * 0.15
        ? 75
        : 35,
    undefined,
    "Investimento observado pode ser alto para o faturamento informado.",
  );
  add("history", input.company.evidenceCount > 0 ? 60 : 35);
  add("evidence", input.company.id === input.playbook.originCompanyId ? 90 : 20, undefined, "Evidência da origem não transfere.");
  add(
    "contextGap",
    input.playbook.originCompanyId === input.company.id
      ? 90
      : input.playbook.originSegment && input.company.segment && input.playbook.originSegment === input.company.segment
        ? 55
        : 30,
  );

  if (input.playbook.contrarySignals) contrary.push(input.playbook.contrarySignals);
  if (input.playbook.requiredConditions) contrary.push(`Condição necessária: ${input.playbook.requiredConditions}`);

  if (!used.length) {
    return {
      score: null,
      partial: true,
      caption: "Score parcial — dados insuficientes para priorizar o teste.",
      factorsUsed: [],
      factorsMissing: missing,
      favorable,
      contrary,
      limitations: "Sem informação suficiente. Dados ausentes não foram completados.",
      version: PLAYBOOK_COMPAT_VERSION,
    };
  }

  const weightSum = used.reduce((sum, item) => sum + PLAYBOOK_COMPAT_WEIGHTS[item.key], 0);
  const weighted = used.reduce((sum, item) => sum + item.value * PLAYBOOK_COMPAT_WEIGHTS[item.key], 0);
  const partial = missing.length > 0;
  return {
    score: clamp(weighted / weightSum),
    partial,
    caption: partial ? "Score de compatibilidade parcial — prioridade para teste, não chance de sucesso." : "Score de compatibilidade para teste — não é probabilidade de sucesso.",
    factorsUsed: used.map((item) => item.key),
    factorsMissing: missing,
    favorable,
    contrary,
    limitations: "Resultado da Empresa A não é resultado esperado na Empresa B. Exige novo experimento.",
    version: PLAYBOOK_COMPAT_VERSION,
  };
}

export function displayCompatibilityScore(score: number | null, partial: boolean): { value: string; caption: string } {
  if (score == null) return { value: "Score parcial", caption: "Sem dados suficientes." };
  return {
    value: String(score),
    caption: partial ? "Score parcial de compatibilidade para teste." : "Score de compatibilidade para teste.",
  };
}

export function transferClassification(): { origin: "EVIDENCIA"; destination: "HIPOTESE" } {
  return { origin: "EVIDENCIA", destination: "HIPOTESE" };
}

export function evidenceDoesNotTransfer(fromCompanyId: string, toCompanyId: string): boolean {
  return fromCompanyId !== toCompanyId;
}

export function humanMustConfirmApplication(): boolean {
  return true;
}

export function aiCannotValidatePlaybook(): boolean {
  return true;
}

export function externalSourceIsNotPlaybookEvidence(): { origin: "FONTE_EXTERNA"; evidence: false } {
  return { origin: "FONTE_EXTERNA", evidence: false };
}

export function playbookNeverBornValidated(): PlaybookLifecycle {
  return "RASCUNHO";
}

export function isActiveApplicationStatus(status: string): boolean {
  return status === "PROPOSTA" || status === "CONFIRMADA" || status === "EM_TESTE";
}

export function applicationIdempotencyKey(playbookId: string, companyId: string): string {
  return `${playbookId}:${companyId}`;
}

export function alreadyEvaluatingCopy(): string {
  return "Este playbook já está sendo avaliado nesta empresa.";
}

export function paginateItems<T>(items: T[], page = 1, pageSize = PLAYBOOK_PAGE_SIZE): { items: T[]; page: number; pages: number; total: number } {
  const safePage = Math.max(1, page);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: Math.min(safePage, pages), pages, total };
}

export function filterPlaybooks(rows: PlaybookListRow[], filters: {
  companyId?: string;
  segment?: string;
  family?: string;
  kpi?: string;
  status?: string;
  minConfidence?: number;
}): PlaybookListRow[] {
  return rows.filter((row) => {
    if (filters.companyId && filters.companyId !== "ALL" && row.originCompanyId !== filters.companyId) return false;
    if (filters.segment && filters.segment !== "ALL" && row.originSegment !== filters.segment) return false;
    if (filters.family && filters.family !== "ALL" && row.family !== filters.family) return false;
    if (filters.kpi && filters.kpi !== "ALL" && row.primaryKpi !== filters.kpi) return false;
    if (filters.status && filters.status !== "ALL" && row.status !== filters.status) return false;
    if (filters.minConfidence != null && (row.confidence == null || row.confidence < filters.minConfidence)) return false;
    return true;
  });
}

export function relatedPlaybooksForConnection(input: {
  fromSegment: string | null;
  toSegment: string | null;
  type: string;
  playbooks: Array<{ id: string; title: string; family: string | null; originSegment: string | null; testedCompanyIds: string[]; destinationId: string }>;
}): Array<{ id: string; title: string; label: string }> {
  return input.playbooks
    .filter((item) => {
      const familyHit = item.family && input.type.includes(item.family);
      const segmentHit =
        (item.originSegment && (item.originSegment === input.fromSegment || item.originSegment === input.toSegment)) ||
        familyHit;
      return Boolean(segmentHit);
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      label: item.testedCompanyIds.includes(item.destinationId) ? "Já testado neste destino" : "Possível aplicação",
    }));
}

export const PLAYBOOK_EMPTY = {
  title: "Nenhum playbook ainda",
  body: "Playbook nasce de aprendizado com evidência. Ele registra o que foi feito — não garante resultado em outra empresa.",
};

export const VALIDATED_PLAYBOOK_COPY =
  "Validado significa que o registro representa corretamente um aprendizado suportado por evidência — não é garantia universal de resultado.";
