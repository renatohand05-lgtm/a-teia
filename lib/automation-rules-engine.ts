import { DEFAULT_AUTOMATION_TIMEZONE } from "@/lib/automation-config";
import { formatBRL, formatPercent } from "@/lib/format";
import { slotKey } from "@/lib/timezone";

export type RuleOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "contains"
  | "days_since"
  | "status_is"
  | "missing";

export type AutomationKind = "ALERTA" | "LEMBRETE" | "FOLLOW_UP" | "CHECK" | "RESUMO" | "REVISAO";
export type AlertPriority = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";

export type AutomationCondition = {
  metric: string;
  operator: RuleOperator;
  threshold?: number | string | null;
  period?: string | null;
  entity?: string | null;
  companyId?: string | null;
  status?: string | null;
};

export type CompanyFacts = {
  companyId: string;
  companyName: string;
  cogsPercent: number | null;
  cogsTarget: number | null;
  ebitda: number | null;
  ebitdaTarget: number | null;
  cash: number | null;
  revenue: number | null;
  financeUpdatedAt: string | null;
  overdueTaskCount: number;
  stalePlanCount: number;
  experimentStaleCount: number;
  pendingDecisionDays: number | null;
  pendingDecisionCount: number;
  highScoreOpportunityWithoutPlan: number;
  allocationPendingDays: number | null;
  financeAgeDays: number | null;
  playbookAwaitingDecision?: number;
  playbookAwaitingResult?: number;
  playbookTransferOverdue?: number;
};

export type EvaluationHit = {
  ruleKey: string;
  companyId: string | null;
  companyName: string | null;
  title: string;
  message: string;
  priority: AlertPriority;
  kind: AutomationKind;
  href: string;
  facts: Record<string, string | number | null>;
  dataGap: boolean;
};

export type EvaluationResult = {
  hit: boolean;
  missing: boolean;
  reason: string;
};

export type AutomationTemplate = {
  key: string;
  kind: AutomationKind;
  title: string;
  description: string;
  frequency: "MANUAL" | "DAILY" | "WEEKLY" | "MONTHLY";
  cooldownHours: number;
  priority: AlertPriority;
  condition: AutomationCondition;
};

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "cmv_above_target",
    kind: "ALERTA",
    title: "CMV acima da meta",
    description: "Alerta quando o CMV persistido supera a meta interna.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "cogsPercent", operator: "gt", entity: "financial" },
  },
  {
    key: "ebitda_negative",
    kind: "ALERTA",
    title: "EBITDA negativo",
    description: "Alerta somente se o EBITDA informado for menor que zero.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "ebitda", operator: "lt", threshold: 0, entity: "financial" },
  },
  {
    key: "goal_behind",
    kind: "ALERTA",
    title: "Meta atrasada",
    description: "EBITDA informado abaixo da meta persistida.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "ebitdaVsTarget", operator: "lt", threshold: 0, entity: "financial" },
  },
  {
    key: "task_overdue",
    kind: "CHECK",
    title: "Tarefa vencida",
    description: "Follow-up quando houver tarefas vencidas no plano.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "MEDIO",
    condition: { metric: "overdueTaskCount", operator: "gt", threshold: 0, entity: "task" },
  },
  {
    key: "plan_stale",
    kind: "FOLLOW_UP",
    title: "Plano sem atualização",
    description: "Planos com pendências e sem atualização recente.",
    frequency: "DAILY",
    cooldownHours: 48,
    priority: "MEDIO",
    condition: { metric: "stalePlanCount", operator: "gt", threshold: 0, entity: "plan" },
  },
  {
    key: "experiment_stale",
    kind: "FOLLOW_UP",
    title: "Experimento sem medição",
    description: "Experimento ativo/concluído sem resultado persistido.",
    frequency: "DAILY",
    cooldownHours: 48,
    priority: "MEDIO",
    condition: { metric: "experimentStaleCount", operator: "gt", threshold: 0, entity: "experiment" },
  },
  {
    key: "decision_pending",
    kind: "REVISAO",
    title: "Decisão pendente",
    description: "Decisão aguardando humano há mais de 3 dias.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "pendingDecisionDays", operator: "gte", threshold: 3, entity: "decision" },
  },
  {
    key: "finance_stale",
    kind: "ALERTA",
    title: "Financeiro desatualizado",
    description: "DATA_GAP quando o financeiro não é atualizado há 30 dias.",
    frequency: "DAILY",
    cooldownHours: 72,
    priority: "BAIXO",
    condition: { metric: "financeAgeDays", operator: "gte", threshold: 30, entity: "financial" },
  },
  {
    key: "cash_below_limit",
    kind: "ALERTA",
    title: "Caixa abaixo do limite",
    description: "Só dispara se caixa e limite estiverem informados.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "CRITICO",
    condition: { metric: "cash", operator: "lt", entity: "financial" },
  },
  {
    key: "high_opportunity_idle",
    kind: "ALERTA",
    title: "Oportunidade alta sem plano",
    description: "Score alto persistido sem plano associado.",
    frequency: "DAILY",
    cooldownHours: 48,
    priority: "ALTO",
    condition: { metric: "highScoreOpportunityWithoutPlan", operator: "gt", threshold: 0, entity: "opportunity" },
  },
  {
    key: "allocation_pending",
    kind: "REVISAO",
    title: "Alocação aguardando decisão",
    description: "Proposta enviada e ainda pendente. Não realoca automaticamente.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "allocationPendingDays", operator: "gte", threshold: 1, entity: "allocation" },
  },
  {
    key: "playbook_awaiting_decision",
    kind: "REVISAO",
    title: "Aplicação de playbook aguardando decisão",
    description: "Somente alerta. A IA não aprova e não move a aplicação.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "playbookAwaitingDecision", operator: "gt", threshold: 0, entity: "playbook" },
  },
  {
    key: "playbook_awaiting_result",
    kind: "FOLLOW_UP",
    title: "Aplicação de playbook aguardando resultado",
    description: "Teste de transferência sem resultado registrado. Não conclui falha.",
    frequency: "DAILY",
    cooldownHours: 48,
    priority: "MEDIO",
    condition: { metric: "playbookAwaitingResult", operator: "gt", threshold: 0, entity: "playbook" },
  },
  {
    key: "playbook_transfer_overdue",
    kind: "CHECK",
    title: "Experimento de transferência vencido",
    description: "Prazo do teste venceu sem resultado. Não afirma fracasso.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "ALTO",
    condition: { metric: "playbookTransferOverdue", operator: "gt", threshold: 0, entity: "playbook" },
  },
  {
    key: "daily_briefing",
    kind: "RESUMO",
    title: "Briefing diário",
    description: "Resumo determinístico das prioridades, alertas e pendências.",
    frequency: "DAILY",
    cooldownHours: 24,
    priority: "BAIXO",
    condition: { metric: "briefing", operator: "eq", threshold: 1, entity: "portfolio" },
  },
  {
    key: "weekly_summary",
    kind: "RESUMO",
    title: "Resumo semanal",
    description: "O que mudou, pendências e prioridades da semana. Sem inventar causa.",
    frequency: "WEEKLY",
    cooldownHours: 168,
    priority: "BAIXO",
    condition: { metric: "weekly", operator: "eq", threshold: 1, entity: "portfolio" },
  },
];

export function isInformed(value: number | string | null | undefined): boolean {
  return value != null && value !== "";
}

export function evaluateCondition(
  condition: AutomationCondition,
  value: number | string | null | undefined,
  extra?: { target?: number | null; daysSince?: number | null; status?: string | null },
): EvaluationResult {
  if (condition.operator === "missing") {
    return { hit: !isInformed(value), missing: !isInformed(value), reason: isInformed(value) ? "Dado informado." : "Dado ausente." };
  }
  if (condition.operator === "days_since") {
    const days = extra?.daysSince ?? (typeof value === "number" ? value : null);
    if (days == null) return { hit: false, missing: true, reason: "Sem data persistida. Não dispara alerta falso." };
    const ok = compareNumber(days, "gte", Number(condition.threshold ?? 0));
    return { hit: ok, missing: false, reason: `${days} dias desde o último registro.` };
  }
  if (condition.operator === "status_is") {
    const status = extra?.status ?? (typeof value === "string" ? value : null);
    if (status == null) return { hit: false, missing: true, reason: "Status não informado." };
    return { hit: status === condition.status, missing: false, reason: `Status ${status}.` };
  }
  if (condition.operator === "contains") {
    if (typeof value !== "string") return { hit: false, missing: true, reason: "Texto não informado." };
    return { hit: value.toLowerCase().includes(String(condition.threshold ?? "").toLowerCase()), missing: false, reason: value };
  }
  if (!isInformed(value) || typeof value === "string") {
    return { hit: false, missing: true, reason: "Dado necessário ausente. Sem alerta financeiro inventado." };
  }
  const right = condition.threshold;
  if (right == null && condition.metric !== "cogsPercent") {
    return { hit: false, missing: true, reason: "Limite não configurado." };
  }
  const compared = condition.metric === "cogsPercent" && extra?.target != null ? extra.target : Number(right);
  if (!Number.isFinite(compared)) {
    return { hit: false, missing: true, reason: "Limite não configurado." };
  }
  const hit = compareNumber(Number(value), condition.operator, compared);
  return { hit, missing: false, reason: `${condition.metric} ${condition.operator} ${compared}.` };
}

export function compareNumber(left: number, operator: RuleOperator, right: number): boolean {
  if (operator === "gt") return left > right;
  if (operator === "gte") return left >= right;
  if (operator === "lt") return left < right;
  if (operator === "lte") return left <= right;
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;
  return false;
}

export function metricValue(facts: CompanyFacts, metric: string): number | null {
  const map: Record<string, number | null> = {
    cogsPercent: facts.cogsPercent,
    ebitda: facts.ebitda,
    ebitdaTarget: facts.ebitdaTarget,
    ebitdaVsTarget:
      facts.ebitda != null && facts.ebitdaTarget != null ? facts.ebitda - facts.ebitdaTarget : null,
    cash: facts.cash,
    revenue: facts.revenue,
    overdueTaskCount: facts.overdueTaskCount,
    stalePlanCount: facts.stalePlanCount,
    experimentStaleCount: facts.experimentStaleCount,
    pendingDecisionDays: facts.pendingDecisionDays,
    pendingDecisionCount: facts.pendingDecisionCount,
    highScoreOpportunityWithoutPlan: facts.highScoreOpportunityWithoutPlan,
    allocationPendingDays: facts.allocationPendingDays,
    financeAgeDays: facts.financeAgeDays,
    playbookAwaitingDecision: facts.playbookAwaitingDecision ?? 0,
    playbookAwaitingResult: facts.playbookAwaitingResult ?? 0,
    playbookTransferOverdue: facts.playbookTransferOverdue ?? 0,
    briefing: 1,
    weekly: 1,
  };
  return metric in map ? map[metric] ?? null : null;
}

export function evaluateTemplate(
  template: AutomationTemplate,
  facts: CompanyFacts,
  options?: { cashLimit?: number | null; cogsThreshold?: number | null },
): EvaluationHit | null {
  const condition = { ...template.condition };
  if (template.key === "cmv_above_target") {
    const threshold = options?.cogsThreshold ?? facts.cogsTarget;
    const result = evaluateCondition({ ...condition, threshold }, facts.cogsPercent, { target: threshold ?? null });
    if (result.missing) return dataGap(template, facts, "CMV ou meta não informados.");
    if (!result.hit) return null;
    return hit(template, facts, {
      title: "CMV acima da meta",
      message: `${facts.companyName}: CMV ${formatPercent(facts.cogsPercent)} acima da meta ${formatPercent(threshold)}.`,
      href: `/empresas/${facts.companyId}/financeiro`,
      facts: { cogsPercent: facts.cogsPercent, meta: threshold ?? null },
    });
  }
  if (template.key === "cash_below_limit") {
    const limit = options?.cashLimit ?? (typeof condition.threshold === "number" ? condition.threshold : null);
    const result = evaluateCondition({ ...condition, threshold: limit }, facts.cash);
    if (result.missing) return dataGap(template, facts, "Caixa ou limite não informado.");
    if (!result.hit) return null;
    return hit(template, facts, {
      title: "Caixa abaixo do limite",
      message: `${facts.companyName}: caixa ${formatBRL(facts.cash)} abaixo do limite ${formatBRL(limit)}.`,
      href: `/empresas/${facts.companyId}/financeiro/fluxo-caixa`,
      facts: { cash: facts.cash, limit },
      priority: "CRITICO",
    });
  }
  if (template.key === "finance_stale") {
    const result = evaluateCondition(condition, facts.financeAgeDays, { daysSince: facts.financeAgeDays });
    if (facts.financeUpdatedAt == null) {
      return dataGap(template, facts, "Financeiro nunca atualizado.");
    }
    if (!result.hit) return null;
    return hit(template, facts, {
      title: "Financeiro desatualizado",
      message: `${facts.companyName}: financeiro não atualizado há ${facts.financeAgeDays} dias.`,
      href: `/empresas/${facts.companyId}/financeiro`,
      facts: { financeAgeDays: facts.financeAgeDays },
      dataGap: true,
    });
  }
  if (template.key === "daily_briefing" || template.key === "weekly_summary") {
    return hit(template, facts, {
      title: template.title,
      message: template.key === "weekly_summary" ? "Resumo semanal pronto para revisão." : "Briefing diário pronto para revisão.",
      href: "/automacoes#resumos",
      facts: { company: facts.companyName },
    });
  }

  const value = metricValue(facts, condition.metric);
  const result = evaluateCondition(condition, value, {
    target: facts.cogsTarget,
    daysSince: condition.metric === "financeAgeDays" ? facts.financeAgeDays : value,
  });
  if (result.missing && ["ebitda", "ebitdaVsTarget", "cogsPercent", "cash"].includes(condition.metric)) {
    return null;
  }
  if (!result.hit) return null;
  return hit(template, facts, {
    title: template.title,
    message: `${facts.companyName}: ${result.reason}`,
    href: defaultHref(template, facts.companyId),
    facts: { [condition.metric]: value },
  });
}

export function evaluatePortfolio(
  template: AutomationTemplate,
  companies: CompanyFacts[],
  options?: { cashLimit?: number | null; cogsThreshold?: number | null },
): EvaluationHit[] {
  const scoped = template.condition.companyId
    ? companies.filter((item) => item.companyId === template.condition.companyId)
    : companies;
  if (template.key === "daily_briefing" || template.key === "weekly_summary") {
    const first = scoped[0];
    if (!first) return [];
    const generated = evaluateTemplate(template, first, options);
    return generated ? [generated] : [];
  }
  return scoped.map((item) => evaluateTemplate(template, item, options)).filter((item): item is EvaluationHit => Boolean(item));
}

export function alertIdempotencyKey(input: {
  ownerId: string;
  ruleKey: string;
  companyId: string | null;
  slot: string;
}) {
  return `${input.ownerId}:${input.ruleKey}:${input.companyId ?? "portfolio"}:${input.slot}`;
}

export function executionIdempotencyKey(input: {
  mode: "cron" | "manual";
  ownerId: string;
  automationId: string;
  slot: string;
}) {
  return `${input.mode}:${input.ownerId}:${input.automationId}:${input.slot}`;
}

export function shouldSuppress(input: {
  openOrAck: boolean;
  lastDetectedAt: string | null;
  cooldownHours: number;
  now?: Date;
}) {
  if (!input.openOrAck) return false;
  if (!input.lastDetectedAt) return true;
  const elapsed = (input.now ?? new Date()).getTime() - new Date(input.lastDetectedAt).getTime();
  return elapsed < input.cooldownHours * 60 * 60 * 1000;
}

export function composeDailyBriefing(input: {
  priorities: string[];
  alerts: string[];
  overdueTasks: number;
  pendingDecisions: number;
  staleExperiments: number;
  financeOff: string[];
  changes: string[];
}) {
  return [
    "BRIEFING DETERMINÍSTICO",
    input.priorities[0] ? `Prioridade: ${input.priorities[0]}` : "Nenhuma prioridade crítica persistida.",
    input.alerts[0] ? `Alertas: ${input.alerts.slice(0, 3).join(" · ")}` : "Nenhum alerta ativo.",
    `Tarefas vencidas: ${input.overdueTasks}`,
    `Decisões pendentes: ${input.pendingDecisions}`,
    `Experimentos exigindo atenção: ${input.staleExperiments}`,
    input.financeOff[0] ? `Financeiro fora da meta: ${input.financeOff.join(" · ")}` : "Sem desvio financeiro informado.",
    input.changes[0] ? `Mudanças: ${input.changes.slice(0, 3).join(" · ")}` : "Sem mudanças recentes na auditoria.",
  ].join("\n");
}

export function composeWeeklySummary(input: {
  changed: string[];
  improved: string[];
  worsened: string[];
  pendingDecisions: number;
  priorities: string[];
  experiments: string[];
  execution: string;
  finance: string;
}) {
  return [
    "RESUMO SEMANAL",
    `O que mudou: ${input.changed[0] ?? "nada persistido nesta semana."}`,
    `O que melhorou: ${input.improved[0] ?? "sem série histórica suficiente."}`,
    `O que piorou: ${input.worsened[0] ?? "sem série histórica suficiente."}`,
    `Decisões pendentes: ${input.pendingDecisions}`,
    `Prioridades: ${input.priorities[0] ?? "nenhuma."}`,
    `Experimentos: ${input.experiments[0] ?? "nenhum pendente."}`,
    `Execução: ${input.execution}`,
    `Financeiro: ${input.finance}`,
    "Sem inferir causalidade não persistida.",
  ].join("\n");
}

export function parseAutomationPrompt(question: string): {
  templateKey: string;
  title: string;
  condition: AutomationCondition;
  requiresConfirmation: true;
} | null {
  const q = question.toLowerCase();
  const cmv = q.match(/cmv.*?(\d+(?:[.,]\d+)?)/);
  if (cmv) {
    const threshold = Number(cmv[1]!.replace(",", "."));
    return {
      templateKey: "cmv_above_target",
      title: `Avisar se CMV passar de ${threshold}%`,
      condition: { metric: "cogsPercent", operator: "gt", threshold, entity: "financial" },
      requiresConfirmation: true,
    };
  }
  if (/ebitda negativo/.test(q)) {
    return {
      templateKey: "ebitda_negative",
      title: "Avisar se EBITDA for negativo",
      condition: { metric: "ebitda", operator: "lt", threshold: 0, entity: "financial" },
      requiresConfirmation: true,
    };
  }
  if (/aplica[cç].*aguardando (resultado|decis)/.test(q) || /playbooks? aguardando/.test(q)) {
    return {
      templateKey: /resultado/.test(q) ? "playbook_awaiting_result" : "playbook_awaiting_decision",
      title: /resultado/.test(q) ? "Avisar aplicações aguardando resultado" : "Avisar aplicações aguardando decisão",
      condition: {
        metric: /resultado/.test(q) ? "playbookAwaitingResult" : "playbookAwaitingDecision",
        operator: "gt",
        threshold: 0,
        entity: "playbook",
      },
      requiresConfirmation: true,
    };
  }
  if (/transfer[eê]ncia vencid|experimentos de transfer/.test(q)) {
    return {
      templateKey: "playbook_transfer_overdue",
      title: "Avisar experimentos de transferência vencidos",
      condition: { metric: "playbookTransferOverdue", operator: "gt", threshold: 0, entity: "playbook" },
      requiresConfirmation: true,
    };
  }
  if (/tarefa vencid/.test(q)) {
    return {
      templateKey: "task_overdue",
      title: "Avisar tarefas vencidas",
      condition: { metric: "overdueTaskCount", operator: "gt", threshold: 0, entity: "task" },
      requiresConfirmation: true,
    };
  }
  return null;
}

export function isAutomationQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return /alerta|automa[cç]|rotina|briefing di[aá]rio|resumo semanal|o que mudou esta semana|revisar amanh|sem dados atualiz|automações falharam|me avise se|por que recebi/.test(
    q,
  );
}

export function schedulerSlot(now = new Date(), frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL" = "DAILY") {
  return slotKey(now, frequency, DEFAULT_AUTOMATION_TIMEZONE);
}

function hit(
  template: AutomationTemplate,
  facts: CompanyFacts,
  rest: { title: string; message: string; href: string; facts: Record<string, string | number | null>; dataGap?: boolean; priority?: AlertPriority },
): EvaluationHit {
  return {
    ruleKey: template.key,
    companyId: facts.companyId,
    companyName: facts.companyName,
    kind: template.kind,
    priority: rest.priority ?? template.priority,
    dataGap: Boolean(rest.dataGap),
    ...rest,
  };
}

function dataGap(template: AutomationTemplate, facts: CompanyFacts, message: string): EvaluationHit | null {
  if (template.key !== "finance_stale" && template.key !== "cash_below_limit" && template.key !== "cmv_above_target") {
    return null;
  }
  if (template.key === "cmv_above_target" || template.key === "cash_below_limit") return null;
  return hit(template, facts, {
    title: "Dado ausente",
    message: `${facts.companyName}: ${message}`,
    href: `/empresas/${facts.companyId}/financeiro`,
    facts: { gap: message },
    dataGap: true,
    priority: "BAIXO",
  });
}

function defaultHref(template: AutomationTemplate, companyId: string) {
  if (template.condition.entity === "task" || template.condition.entity === "plan") return `/empresas/${companyId}/execucao`;
  if (template.condition.entity === "experiment") return `/empresas/${companyId}/experimentos`;
  if (template.condition.entity === "decision") return "/cockpit#cockpit-decisoes";
  if (template.condition.entity === "allocation") return "/alocacao";
  if (template.condition.entity === "opportunity") return `/empresas/${companyId}/oportunidades`;
  if (template.condition.entity === "playbook") return "/aplicacoes";
  return `/empresas/${companyId}`;
}

export const AUTOMATION_SHORTCUTS = [
  { label: "Quais alertas precisam da minha atenção?", prompt: "Quais alertas precisam da minha atenção?" },
  { label: "Por que recebi este alerta?", prompt: "Por que recebi este alerta?" },
  { label: "Quais automações estão ativas?", prompt: "Quais automações estão ativas?" },
  { label: "O que está atrasado?", prompt: "O que está atrasado nas automações e execução?" },
  { label: "O que mudou esta semana?", prompt: "O que mudou esta semana?" },
  { label: "Automações que falharam", prompt: "Quais automações falharam?" },
] as const;
