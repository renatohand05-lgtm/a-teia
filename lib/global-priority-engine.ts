import { formatBRL, formatPercent } from "@/lib/format";
import { normalizeSegmentLabel } from "@/lib/research-query";

export type SignalKind =
  | "RISK"
  | "OPPORTUNITY"
  | "EXECUTION"
  | "FINANCIAL"
  | "DIAGNOSIS"
  | "EXPERIMENT"
  | "EVIDENCE"
  | "DATA_GAP";

export type PriorityLevel = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
export type DataHealthLevel = "COMPLETO" | "PARCIAL" | "INSUFICIENTE";
export type TrendDirection = "up" | "down" | "stable";

export type FinanceSnapshot = {
  periodLabel: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdaPercent: number | null;
  ebitdaTarget: number | null;
  cogsPercent: number | null;
  cogsTarget: number | null;
  cash: number | null;
  history: Array<{ periodLabel: string; revenue: number | null; ebitda: number | null; cogsPercent: number | null }>;
};

export type PortfolioCompanyInput = {
  id: string;
  name: string;
  segment: string | null;
  status: "ACTIVE" | "ARCHIVED";
  updatedAt: string;
  diagnosis: { overallScore: number | null; bottleneck: string | null; createdAt: string } | null;
  finance: FinanceSnapshot;
  opportunities: Array<{
    id: string;
    title: string;
    score: number | null;
    status: string;
    expectedImpact: number | null;
    urgency: number | null;
    evidenceLevel: string;
    hasPlan: boolean;
  }>;
  plans: Array<{
    id: string;
    title: string;
    overdueTaskCount: number;
    pendingTaskCount: number;
    doneTaskCount: number;
    updatedAt: string;
  }>;
  experiments: Array<{
    id: string;
    title: string;
    status: string;
    hasResult: boolean;
    evidenceCount: number;
    validatedEvidence: boolean;
  }>;
  memories: Array<{ id: string; title: string; validated: boolean }>;
  evidence: Array<{ id: string; title: string; classification: string }>;
};

export type PriorityItem = {
  id: string;
  companyId: string;
  companyName: string;
  category: SignalKind;
  situation: string;
  level: PriorityLevel;
  score: number;
  reason: string;
  impact: string;
  urgency: string;
  evidenceAvailable: string;
  nextAction: string;
  factors: string[];
  sourceRefs: string[];
  limitations: string[];
  missingData: string[];
  href: string;
};

export type ExecutiveAlert = {
  id: string;
  companyId: string;
  companyName: string;
  kind: SignalKind;
  title: string;
  detail: string;
  href: string;
};

export type DataHealth = {
  level: DataHealthLevel;
  score: number;
  checks: Array<{ key: string; label: string; ok: boolean }>;
  explanation: string;
};

export type Consolidation = {
  revenue: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  cash: number | null;
  revenueUsed: number;
  ebitdaUsed: number;
  cashUsed: number;
  total: number;
  complete: boolean;
  label: string;
};

export type RecentChange = {
  id: string;
  at: string;
  title: string;
  companyName: string | null;
  href: string | null;
};

const STALE_MS = 120 * 24 * 60 * 60 * 1000;

export function isInformedNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

export function missingIsNotZero(value: number | null | undefined): boolean {
  return value == null;
}

export function priorityLevelFromScore(score: number): PriorityLevel {
  if (score >= 85) return "CRITICA";
  if (score >= 65) return "ALTA";
  if (score >= 45) return "MEDIA";
  return "BAIXA";
}

export function assessDataHealth(company: PortfolioCompanyInput): DataHealth {
  const financeInformed = isInformedNumber(company.finance.revenue) || isInformedNumber(company.finance.ebitda);
  const checks = [
    { key: "diagnosis", label: "Diagnóstico atualizado", ok: Boolean(company.diagnosis) },
    { key: "finance", label: "Financeiro atualizado", ok: financeInformed },
    { key: "opportunities", label: "Oportunidades disponíveis", ok: company.opportunities.length > 0 },
    { key: "plan", label: "Plano existente", ok: company.plans.length > 0 },
    { key: "experiments", label: "Experimentos", ok: company.experiments.length > 0 },
  ];
  const okCount = checks.filter((item) => item.ok).length;
  const level: DataHealthLevel = okCount >= 4 ? "COMPLETO" : okCount >= 2 ? "PARCIAL" : "INSUFICIENTE";
  return {
    level,
    score: okCount,
    checks,
    explanation:
      level === "COMPLETO"
        ? "Diagnóstico, financeiro, oportunidades e execução estão persistidos."
        : level === "PARCIAL"
          ? "Há dados suficientes para priorizar, mas a jornada ainda está incompleta."
          : "Faltam dados críticos. Complete o cadastro para gerar prioridades melhores.",
  };
}

export function collectSignals(company: PortfolioCompanyInput): PriorityItem[] {
  const items: PriorityItem[] = [];
  const health = assessDataHealth(company);
  const missing: string[] = health.checks.filter((item) => !item.ok).map((item) => item.label);

  if (!company.diagnosis) {
    items.push(
      signal(company, {
        category: "DATA_GAP",
        situation: "Empresa sem Diagnóstico 360°",
        score: 48,
        reason: "Ausência de diagnóstico. Isso não significa que a empresa está ruim.",
        impact: "Sem mapa de gargalo persistido.",
        urgency: "Completar quando for decidir com método.",
        evidenceAvailable: "Nenhuma",
        nextAction: "Realizar Diagnóstico 360°.",
        factors: ["dado_ausente", "diagnostico"],
        sourceRefs: [`company:${company.id}`],
        limitations: ["Sem 360° não há gargalo medido."],
        missingData: ["diagnóstico 360°"],
        href: `/empresas/${company.id}/diagnostico`,
      }),
    );
  } else if (isInformedNumber(company.diagnosis.overallScore) && company.diagnosis.overallScore < 40) {
    items.push(
      signal(company, {
        category: "DIAGNOSIS",
        situation: `Diagnóstico baixo (${company.diagnosis.overallScore}/100)`,
        score: 78,
        reason: `Score 360 persistido em ${company.diagnosis.overallScore}.`,
        impact: company.diagnosis.bottleneck ? `Gargalo: ${company.diagnosis.bottleneck}` : "Maturidade baixa no 360°.",
        urgency: "Revisar dimensões críticas.",
        evidenceAvailable: "Diagnóstico persistido",
        nextAction: "Abrir o 360° e atacar o gargalo registrado.",
        factors: ["diagnostico_baixo", `score:${company.diagnosis.overallScore}`],
        sourceRefs: [`diagnosis:${company.id}:${company.diagnosis.createdAt}`],
        limitations: ["Score 360 não é ranking financeiro."],
        missingData: missing,
        href: `/empresas/${company.id}/diagnostico`,
      }),
    );
  }

  const { finance } = company;
  if (!isInformedNumber(finance.ebitda) && !isInformedNumber(finance.revenue)) {
    items.push(
      signal(company, {
        category: "DATA_GAP",
        situation: "Financeiro não informado",
        score: 42,
        reason: "EBITDA e receita ausentes. Ausência de dado não é resultado ruim nem EBITDA negativo.",
        impact: "Consolidado da carteira fica parcial.",
        urgency: "Informar DRE da competência.",
        evidenceAvailable: "Nenhuma",
        nextAction: "Informar o financeiro da competência.",
        factors: ["dado_ausente", "ebitda_ausente"],
        sourceRefs: [`finance:${company.id}`],
        limitations: ["Nenhum zero foi inventado."],
        missingData: ["receita", "EBITDA"],
        href: `/empresas/${company.id}/financeiro`,
      }),
    );
  } else if (!isInformedNumber(finance.ebitda)) {
    items.push(
      signal(company, {
        category: "DATA_GAP",
        situation: "EBITDA não cadastrado",
        score: 44,
        reason: "EBITDA ausente. Isso não é EBITDA zero nem EBITDA negativo.",
        impact: "Sem leitura de resultado operacional.",
        urgency: "Completar DRE.",
        evidenceAvailable: isInformedNumber(finance.revenue) ? "Receita persistida" : "Nenhuma",
        nextAction: "Completar o DRE para calcular EBITDA.",
        factors: ["dado_ausente", "ebitda_ausente"],
        sourceRefs: [`finance:${company.id}`],
        limitations: ["Não inferir prejuízo."],
        missingData: ["EBITDA"],
        href: `/empresas/${company.id}/financeiro/dre`,
      }),
    );
  } else if (finance.ebitda < 0) {
    items.push(
      signal(company, {
        category: "RISK",
        situation: "EBITDA negativo",
        score: 92,
        reason: `EBITDA informado: ${formatBRL(finance.ebitda)}.`,
        impact: "Resultado operacional negativo no período persistido.",
        urgency: "Alta — dado informado, não inventado.",
        evidenceAvailable: finance.periodLabel ? `DRE ${finance.periodLabel}` : "DRE persistido",
        nextAction: "Revisar custos e receita da competência.",
        factors: ["ebitda_negativo", `valor:${finance.ebitda}`],
        sourceRefs: [`finance:${company.id}:${finance.periodLabel ?? "atual"}`],
        limitations: ["Um período não prova tendência."],
        missingData: missing,
        href: `/empresas/${company.id}/financeiro`,
      }),
    );
  } else if (isInformedNumber(finance.ebitdaTarget) && finance.ebitda < finance.ebitdaTarget) {
    items.push(
      signal(company, {
        category: "FINANCIAL",
        situation: "EBITDA abaixo da meta",
        score: 74,
        reason: `EBITDA ${formatBRL(finance.ebitda)} abaixo da meta ${formatBRL(finance.ebitdaTarget)}.`,
        impact: "Desvio de resultado operacional.",
        urgency: "Alta se o período estiver atual.",
        evidenceAvailable: finance.periodLabel ?? "DRE",
        nextAction: "Analisar o desvio da meta de EBITDA.",
        factors: ["ebitda_abaixo_meta"],
        sourceRefs: [`finance:${company.id}`],
        limitations: [],
        missingData: missing,
        href: `/empresas/${company.id}/financeiro/metas`,
      }),
    );
  }

  if (isInformedNumber(finance.cogsPercent) && isInformedNumber(finance.cogsTarget) && finance.cogsPercent > finance.cogsTarget) {
    const delta = Math.round((finance.cogsPercent - finance.cogsTarget) * 10) / 10;
    items.push(
      signal(company, {
        category: "FINANCIAL",
        situation: "CMV acima da meta",
        score: 72,
        reason: `CMV atual ${formatPercent(finance.cogsPercent)} · meta ${formatPercent(finance.cogsTarget)} · desvio +${delta} p.p.`,
        impact: `Desvio de +${delta} p.p. na meta interna.`,
        urgency: "Alta para acompanhamento, sem afirmar causa.",
        evidenceAvailable: finance.periodLabel ?? "Financeiro persistido",
        nextAction: "Analisar evolução histórica do CMV.",
        factors: ["cmv_acima_meta", `desvio:${delta}`],
        sourceRefs: [`finance:${company.id}:cmv`],
        limitations: ["Sem evidência de problema estrutural.", "Histórico pode ser insuficiente."],
        missingData: finance.history.length < 2 ? ["histórico de CMV"] : [],
        href: `/empresas/${company.id}/financeiro`,
      }),
    );
  }

  if (isInformedNumber(finance.cash) && finance.cash < 0) {
    items.push(
      signal(company, {
        category: "RISK",
        situation: "Caixa crítico",
        score: 88,
        reason: `Caixa acumulado informado: ${formatBRL(finance.cash)}.`,
        impact: "Saldo operacional negativo persistido.",
        urgency: "Crítica.",
        evidenceAvailable: "Fluxo de caixa persistido",
        nextAction: "Revisar entradas e saídas do período.",
        factors: ["caixa_critico"],
        sourceRefs: [`cash:${company.id}`],
        limitations: [],
        missingData: missing,
        href: `/empresas/${company.id}/financeiro/fluxo-caixa`,
      }),
    );
  }

  for (const opportunity of company.opportunities) {
    if ((opportunity.score ?? 0) >= 80 && !opportunity.hasPlan) {
      items.push(
        signal(company, {
          category: "OPPORTUNITY",
          situation: `Oportunidade score ${opportunity.score} sem plano`,
          score: 76,
          reason: `${opportunity.title} está priorizada e sem plano 30/60/90.`,
          impact: opportunity.expectedImpact != null ? `Impacto declarado ${opportunity.expectedImpact}/5.` : "Impacto não informado.",
          urgency: opportunity.urgency != null ? `Urgência ${opportunity.urgency}/5.` : "Sem urgência informada.",
          evidenceAvailable: opportunity.evidenceLevel,
          nextAction: "Criar ou revisar o plano da oportunidade.",
          factors: ["oportunidade_alta_parada", `score:${opportunity.score}`],
          sourceRefs: [`opportunity:${opportunity.id}`],
          limitations: ["Score não é evidência validada."],
          missingData: missing,
          href: `/empresas/${company.id}/oportunidades/${opportunity.id}`,
        }),
      );
    }
  }

  for (const plan of company.plans) {
    if (plan.overdueTaskCount > 0) {
      items.push(
        signal(company, {
          category: "EXECUTION",
          situation: `Plano ${plan.title} possui ${plan.overdueTaskCount} tarefa(s) vencida(s)`,
          score: Math.min(84, 58 + plan.overdueTaskCount * 4),
          reason: "Tarefas vencidas agrupadas no mesmo plano — um sinal, não um alerta por tarefa.",
          impact: "Execução atrasada.",
          urgency: "Alta.",
          evidenceAvailable: `${plan.doneTaskCount} concluída(s) · ${plan.pendingTaskCount} pendente(s)`,
          nextAction: "Revisar responsáveis e prazo do plano.",
          factors: ["plano_atrasado", `tarefas_vencidas:${plan.overdueTaskCount}`],
          sourceRefs: [`plan:${plan.id}`],
          limitations: [],
          missingData: missing,
          href: `/empresas/${company.id}/execucao/${plan.id}`,
        }),
      );
    }
  }

  for (const experiment of company.experiments) {
    const waiting =
      experiment.status === "COMPLETED" && !experiment.hasResult && !experiment.validatedEvidence;
    const runningWithoutResult = (experiment.status === "RUNNING" || experiment.status === "READY") && !experiment.hasResult;
    if (waiting || runningWithoutResult) {
      items.push(
        signal(company, {
          category: "EXPERIMENT",
          situation: waiting
            ? "Experimento finalizado aguardando conclusão"
            : "Experimento ativo sem resultado",
          score: waiting ? 70 : 56,
          reason: `${experiment.title} ainda não tem resultado/evidência validada. Não afirmar que funcionou.`,
          impact: "Decisão de continuidade bloqueada.",
          urgency: waiting ? "Alta — falta encerrar com evidência." : "Média.",
          evidenceAvailable: experiment.validatedEvidence ? "Evidência validada" : "Sem evidência validada",
          nextAction: "Registrar resultado e classificar a evidência.",
          factors: ["experimento_sem_resultado", `status:${experiment.status}`],
          sourceRefs: [`experiment:${experiment.id}`],
          limitations: ["Experimento em andamento não é evidência."],
          missingData: experiment.hasResult ? [] : ["resultado do experimento"],
          href: `/empresas/${company.id}/experimentos/${experiment.id}`,
        }),
      );
    }
    if (experiment.validatedEvidence) {
      items.push(
        signal(company, {
          category: "EVIDENCE",
          situation: "Evidência validada disponível",
          score: 40,
          reason: `${experiment.title} gerou evidência validada.`,
          impact: "Aprendizado utilizável na empresa.",
          urgency: "Baixa — informar, não alarmar.",
          evidenceAvailable: "Evidência validada",
          nextAction: "Revisar se o aprendizado virou memória.",
          factors: ["evidencia_validada"],
          sourceRefs: [`experiment:${experiment.id}`],
          limitations: ["Validação não transfere automaticamente de segmento."],
          missingData: missing,
          href: `/empresas/${company.id}/experimentos/${experiment.id}`,
        }),
      );
    }
  }

  return items;
}

export function rankGlobalPriorities(companies: PortfolioCompanyInput[], limit = 5): PriorityItem[] {
  return companies
    .filter((item) => item.status === "ACTIVE")
    .flatMap((item) => collectSignals(item))
    .sort((a, b) => b.score - a.score || a.companyName.localeCompare(b.companyName))
    .slice(0, limit);
}

export function explainPriority(item: PriorityItem) {
  return {
    level: item.level,
    reasons: item.factors,
    dataUsed: [item.reason, item.impact].filter(Boolean),
    impact: item.impact,
    urgency: item.urgency,
    evidence: item.evidenceAvailable,
    limitations: item.limitations,
    missingData: item.missingData,
    sourceRefs: item.sourceRefs,
  };
}

export function buildAlerts(priorities: PriorityItem[], max = 8): ExecutiveAlert[] {
  const seen = new Set<string>();
  const alerts: ExecutiveAlert[] = [];
  for (const item of priorities) {
    if (item.category === "EVIDENCE" || item.category === "DATA_GAP") continue;
    const key = `${item.companyId}:${item.category}:${item.situation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alerts.push({
      id: item.id,
      companyId: item.companyId,
      companyName: item.companyName,
      kind: item.category,
      title: item.situation,
      detail: item.reason,
      href: item.href,
    });
    if (alerts.length >= max) break;
  }
  return alerts;
}

export function consolidateFinance(companies: PortfolioCompanyInput[]): Consolidation {
  const active = companies.filter((item) => item.status === "ACTIVE");
  const withRevenue = active.filter((item) => isInformedNumber(item.finance.revenue));
  const withEbitda = active.filter((item) => isInformedNumber(item.finance.ebitda));
  const withCash = active.filter((item) => isInformedNumber(item.finance.cash));
  const revenue = withRevenue.length ? withRevenue.reduce((sum, item) => sum + item.finance.revenue!, 0) : null;
  const ebitda = withEbitda.length ? withEbitda.reduce((sum, item) => sum + item.finance.ebitda!, 0) : null;
  const cash = withCash.length ? withCash.reduce((sum, item) => sum + item.finance.cash!, 0) : null;
  const ebitdaMargin =
    isInformedNumber(revenue) && revenue !== 0 && isInformedNumber(ebitda) && withEbitda.length === withRevenue.length
      ? Math.round((ebitda / revenue) * 1000) / 10
      : null;
  return {
    revenue,
    ebitda,
    ebitdaMargin,
    cash,
    revenueUsed: withRevenue.length,
    ebitdaUsed: withEbitda.length,
    cashUsed: withCash.length,
    total: active.length,
    complete: active.length > 0 && withRevenue.length === active.length,
    label:
      active.length === 0
        ? "Nenhuma empresa ativa"
        : `Base: ${withRevenue.length} de ${active.length} empresas com dados no período.`,
  };
}

export function trendFromHistory(
  values: Array<number | null>,
  periodLabel = "últimos períodos",
): { direction: TrendDirection; period: string } | { insufficient: true; period: string } {
  const informed = values.filter(isInformedNumber);
  if (informed.length < 2) return { insufficient: true, period: periodLabel };
  const first = informed[0]!;
  const last = informed[informed.length - 1]!;
  const delta = first === 0 ? last : (last - first) / Math.abs(first);
  const direction: TrendDirection = delta > 0.03 ? "up" : delta < -0.03 ? "down" : "stable";
  return { direction, period: periodLabel };
}

export function canCompareCompanies(
  left: Pick<PortfolioCompanyInput, "segment">,
  right: Pick<PortfolioCompanyInput, "segment">,
  metric: string,
): { valid: boolean; reason: string } {
  const a = normalizeSegmentLabel(left.segment);
  const b = normalizeSegmentLabel(right.segment);
  if (!a || !b) return { valid: false, reason: "Segmento ausente. Comparação de indicador exige recorte explícito." };
  if (a !== b) {
    return {
      valid: false,
      reason: `Não comparar ${metric} de ${a} com ${b} como se fossem equivalentes.`,
    };
  }
  return { valid: true, reason: `Comparação válida: mesmo segmento (${a}) e mesmo indicador (${metric}).` };
}

export function groupOverdueTasks(plans: PortfolioCompanyInput["plans"]) {
  return plans
    .filter((item) => item.overdueTaskCount > 0)
    .map((item) => ({ planId: item.id, title: item.title, overdue: item.overdueTaskCount }));
}

export function executionSummary(companies: PortfolioCompanyInput[]) {
  const plans = companies.flatMap((item) => item.plans);
  return {
    activePlans: plans.length,
    pendingTasks: plans.reduce((sum, item) => sum + item.pendingTaskCount, 0),
    overdueTasks: plans.reduce((sum, item) => sum + item.overdueTaskCount, 0),
    doneTasks: plans.reduce((sum, item) => sum + item.doneTaskCount, 0),
  };
}

export function experimentSummary(companies: PortfolioCompanyInput[]) {
  const experiments = companies.flatMap((item) => item.experiments);
  return {
    active: experiments.filter((item) => item.status === "RUNNING" || item.status === "READY").length,
    waitingResult: experiments.filter((item) => item.status === "COMPLETED" && !item.hasResult && !item.validatedEvidence).length,
    completed: experiments.filter((item) => item.status === "COMPLETED").length,
    withEvidence: experiments.filter((item) => item.evidenceCount > 0).length,
    withoutEvidence: experiments.filter((item) => item.evidenceCount === 0).length,
  };
}

export function opportunitySummary(companies: PortfolioCompanyInput[]) {
  const rows = companies.flatMap((company) =>
    company.opportunities.map((item) => ({
      ...item,
      companyId: company.id,
      companyName: company.name,
      href: `/empresas/${company.id}/oportunidades/${item.id}`,
    })),
  );
  return rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 6);
}

export function separateMemories(
  companyMemories: Array<{ title: string; companyId: string }>,
  transversal: Array<{ title: string }>,
) {
  return {
    company: companyMemories,
    transversal,
  };
}

export function mapRecentChanges(
  events: Array<{ id: string; action: string; createdAt: string; companyName?: string | null; entityId?: string | null }>,
): RecentChange[] {
  return events.slice(0, 12).map((event) => ({
    id: event.id,
    at: event.createdAt,
    title: labelForAudit(event.action),
    companyName: event.companyName ?? null,
    href: null,
  }));
}

export function composePortfolioSummary(priorities: PriorityItem[]): string {
  if (!priorities.length) {
    return "Nenhuma prioridade crítica identificada com os dados atuais.";
  }
  return priorities
    .slice(0, 3)
    .map((item, index) => {
      return [
        `PRIORIDADE ${index + 1} — ${item.companyName}`,
        item.situation,
        `DADO: ${item.reason}`,
        `INFERÊNCIA: ${item.limitations[0] ?? "Leitura a partir dos dados persistidos, sem inventar causa."}`,
        `AÇÃO: ${item.nextAction}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildPortfolioAIContext(input: {
  ownerId: string;
  companies: PortfolioCompanyInput[];
  priorities: PriorityItem[];
  consolidation: Consolidation;
}) {
  const compact = {
    ownerId: input.ownerId,
    companies: input.companies.slice(0, 6).map((item) => ({
      id: item.id,
      name: item.name,
      segment: item.segment,
      dataHealth: assessDataHealth(item).level,
      diagnosis: item.diagnosis?.overallScore ?? null,
      cmv: item.finance.cogsPercent,
      ebitda: item.finance.ebitda,
    })),
    priorities: input.priorities.slice(0, 5).map((item) => ({
      company: item.companyName,
      situation: item.situation,
      level: item.level,
      reason: item.reason,
      action: item.nextAction,
    })),
    finance: {
      revenue: input.consolidation.revenue,
      coverage: `${input.consolidation.revenueUsed}/${input.consolidation.total}`,
    },
  };
  const serialized = JSON.stringify(compact);
  const max = 2800;
  return {
    ownerId: input.ownerId,
    payload: serialized.length > max ? `${serialized.slice(0, max)}…` : serialized,
    companyIds: compact.companies.map((item) => item.id),
    reduced: serialized.length > max || input.companies.length > 6,
    chars: Math.min(serialized.length, max),
  };
}

export function filterPortfolio(
  companies: PortfolioCompanyInput[],
  filters: { companyId?: string; segment?: string },
) {
  return companies.filter((item) => {
    if (filters.companyId && item.id !== filters.companyId) return false;
    if (filters.segment) {
      const wanted = normalizeSegmentLabel(filters.segment);
      if (wanted && normalizeSegmentLabel(item.segment) !== wanted) return false;
    }
    return true;
  });
}

export function filterPriorities(
  items: PriorityItem[],
  filters: { level?: string; kind?: string },
) {
  return items.filter((item) => {
    if (filters.level && item.level !== filters.level) return false;
    if (filters.kind && item.category !== filters.kind) return false;
    return true;
  });
}

export function diagnosisIsStale(createdAt: string, now = Date.now()) {
  return now - new Date(createdAt).getTime() > STALE_MS;
}

export const PORTFOLIO_SHORTCUTS = [
  { label: "Onde agir primeiro?", prompt: "Onde devo agir primeiro?" },
  { label: "Qual empresa precisa de atenção?", prompt: "Qual empresa precisa mais atenção?" },
  { label: "Oportunidades paradas", prompt: "Quais oportunidades estão paradas?" },
  { label: "Planos atrasados", prompt: "Quais planos estão atrasados?" },
  { label: "Indicadores fora da meta", prompt: "Quais indicadores estão fora da meta?" },
  { label: "Experimentos pendentes", prompt: "Quais experimentos precisam de decisão?" },
  { label: "Onde faltam dados?", prompt: "Onde faltam dados?" },
  { label: "O que mudou?", prompt: "O que mudou recentemente?" },
] as const;

function signal(
  company: PortfolioCompanyInput,
  rest: Omit<PriorityItem, "id" | "companyId" | "companyName" | "level">,
): PriorityItem {
  return {
    id: `${company.id}:${rest.category}:${rest.factors[0] ?? rest.situation}`,
    companyId: company.id,
    companyName: company.name,
    level: priorityLevelFromScore(rest.score),
    ...rest,
  };
}

function labelForAudit(action: string): string {
  if (action.includes("opportunity")) return "Nova oportunidade criada";
  if (action.includes("plan") || action.includes("execution")) return "Plano atualizado";
  if (action.includes("task") && action.includes("overdue")) return "Tarefa venceu";
  if (action.includes("experiment")) return "Experimento atualizado";
  if (action.includes("evidence")) return "Nova evidência registrada";
  if (action.includes("goal") || action.includes("meta")) return "Meta alterada";
  if (action.includes("financial") || action.includes("finance")) return "Financeiro atualizado";
  if (action.includes("decision")) return "Decisão atualizada";
  return action.replace(/[._]/g, " ");
}
