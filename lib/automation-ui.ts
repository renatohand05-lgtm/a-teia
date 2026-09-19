import { AUTOMATION_ALERT_LABELS, statusLabel } from "@/lib/status-labels";

export type AutomationBucket = "ATIVAS" | "PAUSADAS" | "RASCUNHOS" | "COM PROBLEMA";

export const FREQUENCY_LABELS: Record<string, string> = {
  MANUAL: "Quando solicitado",
  DAILY: "Todos os dias",
  WEEKLY: "Toda semana",
  MONTHLY: "Todo mês",
};

export const ALERT_PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "ATENÇÃO",
  BAIXO: "INFORMATIVO",
};

export const AUTOMATION_KIND_LABELS: Record<string, string> = {
  ALERTA: "Alerta",
  LEMBRETE: "Lembrete",
  FOLLOW_UP: "Acompanhamento",
  CHECK: "Checagem",
  RESUMO: "Resumo",
  REVISAO: "Revisão",
};

const METRIC_LABELS: Record<string, string> = {
  cogsPercent: "CMV",
  ebitda: "EBITDA",
  ebitdaVsTarget: "EBITDA vs meta",
  cash: "Caixa",
  overdueTaskCount: "Tarefa atrasada",
  stalePlanCount: "Plano parado",
  experimentStaleCount: "Experimento",
  pendingDecisionDays: "Decisão pendente",
  financeAgeDays: "Financeiro desatualizado",
  highScoreOpportunityWithoutPlan: "Oportunidade sem plano",
  allocationPendingDays: "Alocação",
  briefing: "Briefing",
  weekly: "Resumo semanal",
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: "acima de",
  gte: "igual ou acima de",
  lt: "abaixo de",
  lte: "igual ou abaixo de",
  eq: "igual a",
  neq: "diferente de",
};

export function frequencyLabel(value: string | null | undefined): string {
  if (!value) return "Sem dados";
  return FREQUENCY_LABELS[value] ?? value;
}

export function alertPriorityLabel(value: string | null | undefined): string {
  if (!value) return "ATENÇÃO";
  return ALERT_PRIORITY_LABELS[value] ?? value;
}

export function alertStatusLabel(value: string | null | undefined): string {
  return statusLabel(value, AUTOMATION_ALERT_LABELS, "Aberto");
}

export function automationKindLabel(value: string | null | undefined): string {
  if (!value) return "Alerta";
  return AUTOMATION_KIND_LABELS[value] ?? value;
}

export function conditionLabel(condition: { metric?: string; operator?: string; threshold?: unknown } | null | undefined): string {
  if (!condition?.metric) return "Condição persistida da regra.";
  const metric = METRIC_LABELS[condition.metric] ?? condition.metric;
  const operator = OPERATOR_LABELS[condition.operator ?? ""] ?? condition.operator ?? "";
  if (condition.threshold == null || condition.threshold === "") return metric;
  const unit = condition.metric === "cogsPercent" ? "%" : "";
  return `${metric} ${operator} ${condition.threshold}${unit}`.trim();
}

export function automationBucket(item: { enabled: boolean; lastRunAt: string | null }, lastStatus?: string | null): AutomationBucket {
  if (lastStatus === "FAILED") return "COM PROBLEMA";
  if (item.enabled) return "ATIVAS";
  if (item.lastRunAt) return "PAUSADAS";
  return "RASCUNHOS";
}

export function groupAutomations<T extends { enabled: boolean; lastRunAt: string | null; id: string }>(
  items: T[],
  lastStatusById: Record<string, string | null>,
): Record<AutomationBucket, T[]> {
  const groups: Record<AutomationBucket, T[]> = {
    ATIVAS: [],
    PAUSADAS: [],
    RASCUNHOS: [],
    "COM PROBLEMA": [],
  };
  for (const item of items) {
    groups[automationBucket(item, lastStatusById[item.id])].push(item);
  }
  return groups;
}

export function runNowDisclaimer(): string {
  return "Esta ação avaliará as regras ativas agora. Nenhuma movimentação financeira será realizada.";
}

export function runNowResultCopy(input: { itemsProcessed?: number | null; alertsCreated?: number | null; skipped?: boolean }): string {
  if (input.skipped) return "Sem alteração. A execução já havia sido registrada neste intervalo.";
  const processed = input.itemsProcessed ?? 0;
  const created = input.alertsCreated ?? 0;
  if (processed === 0 && created === 0) return "Sem alteração";
  return `Regras avaliadas: ${processed}. Alertas criados: ${created}.`;
}

export const EMPTY_AUTOMATION = {
  title: "Nenhuma regra automática está acompanhando sua operação.",
  body: "Crie uma regra para gerar alerta. Nada é ativado em silêncio e nenhuma ação financeira é executada.",
};

export const EMPTY_ALERT = {
  title: "Nenhum alerta aberto no momento.",
  body: "Um alerta indica uma condição detectada. Não prova fraude, perda ou falha de gestão.",
};

export function missingRuleDataCopy(): string {
  return "A regra depende de um dado que esta empresa ainda não possui.";
}
