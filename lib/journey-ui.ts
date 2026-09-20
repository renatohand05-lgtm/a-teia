import type { CompanyProgress } from "@/lib/cockpit";

/** Nomenclatura oficial da UI — Release 1.0. Nomes técnicos do banco permanecem. */
export const RELEASE_NOMENCLATURE = {
  empresa: "Empresa",
  diagnostico: "Diagnóstico 360°",
  oportunidade: "Oportunidade",
  decisao: "Decisão",
  plano: "Plano 30/60/90",
  tarefa: "Tarefa",
  experimento: "Experimento",
  resultado: "Resultado",
  evidencia: "Evidência",
  memoria: "Memória Estratégica",
  alocacao: "Alocação",
  automacao: "Automação",
  alerta: "Alerta",
  auditoria: "Auditoria",
  assistente: "Assistente IA",
} as const;

export const STAGE_CONFUSION = [
  "HIPÓTESE ≠ EVIDÊNCIA",
  "OPORTUNIDADE ≠ DECISÃO",
  "DECISÃO ≠ EXECUÇÃO",
  "RESULTADO ≠ EVIDÊNCIA VALIDADA",
  "EVIDÊNCIA ≠ MEMÓRIA",
  "MEMÓRIA TRANSFERÍVEL ≠ VERDADE UNIVERSAL",
  "PESQUISA EXTERNA ≠ EVIDÊNCIA DA EMPRESA",
  "IA ≠ AUTORIDADE DE DECISÃO",
] as const;

export type JourneyChip = {
  key: string;
  label: string;
  value: string;
  href: string;
  done: boolean;
};

export function countOrZero(coverage: boolean, count: number): string {
  if (!coverage) return "Sem dados";
  return String(count);
}

export function doneOrPending(done: boolean): string {
  return done ? "✓" : "Pendente";
}

export function journeyChipValue(progress: CompanyProgress, key: string): string {
  if (!progress.hasCompany && key !== "empresa" && key !== "cadastro") return "Sem dados";

  switch (key) {
    case "empresa":
    case "cadastro":
      return doneOrPending(progress.hasCompany);
    case "diagnostico":
      return doneOrPending(progress.hasDiagnosis);
    case "financeiro":
      return doneOrPending(progress.financialCount > 0);
    case "oportunidade":
    case "oportunidades":
      return countOrZero(progress.hasCompany, progress.opportunityCount);
    case "execucao":
      return progress.planCount > 0 ? String(progress.planCount) : progress.hasCompany ? "Sem plano" : "Sem dados";
    case "experimento":
    case "experimentos":
      return countOrZero(progress.hasCompany, progress.experimentActiveCount + progress.experimentCompletedCount);
    case "evidencia":
    case "evidencias":
      return countOrZero(progress.hasCompany, progress.evidenceCount);
    case "memoria":
    case "memorias":
      return countOrZero(progress.hasCompany, progress.memoryValidatedCount);
    default:
      return "Sem dados";
  }
}

export function buildCompanyHubJourney(progress: CompanyProgress): JourneyChip[] {
  const id = progress.companyId;
  const base = id ? `/empresas/${id}` : "/empresas/nova";
  const stages = [
    { key: "cadastro", label: "Cadastro", href: id ? `${base}/editar` : "/empresas/nova" },
    { key: "financeiro", label: "Financeiro", href: id ? `${base}/financeiro` : "/empresas?modulo=financeiro" },
    { key: "diagnostico", label: "Diagnóstico", href: id ? `${base}/diagnostico` : "/empresas?modulo=diagnostico" },
    { key: "oportunidades", label: "Oportunidades", href: id ? `${base}/oportunidades` : "/empresas?modulo=oportunidades" },
    { key: "execucao", label: RELEASE_NOMENCLATURE.plano, href: id ? `${base}/execucao` : "/empresas?modulo=execucao" },
    { key: "experimentos", label: "Experimentos", href: id ? `${base}/experimentos` : "/empresas?modulo=experimentos" },
    { key: "evidencias", label: "Evidências", href: id ? `${base}/experimentos?status=COMPLETED` : "/empresas?modulo=experimentos" },
    { key: "memorias", label: "Memórias", href: id ? `${base}/memoria` : "/empresas?modulo=memoria" },
  ] as const;

  return stages.map((stage) => {
    const value = journeyChipValue(progress, stage.key);
    return {
      key: stage.key,
      label: stage.label,
      value,
      href: stage.href,
      done: value === "✓",
    };
  });
}

export function cockpitPriorityCta(nextAction: string | null | undefined): string {
  const text = nextAction?.trim() ?? "";
  if (/diagn[oó]stico/i.test(text)) return "Realizar diagnóstico";
  if (/financeiro|DRE|caixa/i.test(text)) return "Abrir financeiro";
  if (/oportunidad/i.test(text)) return "Analisar oportunidades";
  if (/plano|30\/60\/90|execu/i.test(text)) return "Abrir plano 30/60/90";
  if (/experimento|resultado/i.test(text)) return "Abrir experimentos";
  if (/mem[oó]ria|aprend/i.test(text)) return "Abrir memória";
  if (/alerta/i.test(text)) return "Ver alerta";
  return text ? text.replace(/\.$/, "") : "Abrir empresa";
}

export function decisionExecutionNext(input: {
  status: string | null | undefined;
  companyId: string;
  opportunityId?: string | null;
  planId?: string | null;
}): { show: boolean; label: string; href: string; note?: string } | { show: false; note?: string } {
  const rejected = input.status === "REJECTED" || input.status === "CANCELLED";
  if (rejected) {
    return { show: false, note: "Decisão rejeitada não sugere execução." };
  }
  const approved = input.status === "APPROVED" || input.status === "EXECUTED";
  if (!approved) return { show: false };
  if (input.planId) {
    return { show: true, label: "Abrir plano", href: `/empresas/${input.companyId}/execucao/${input.planId}` };
  }
  const query = input.opportunityId ? `?opportunityId=${input.opportunityId}` : "";
  return { show: true, label: "Criar plano 30/60/90", href: `/empresas/${input.companyId}/execucao/novo${query}` };
}

export function memoryOriginCopy(input: {
  validated: boolean;
  companyName: string;
  sameCompany: boolean;
}): string {
  if (!input.validated) return "Aprendizado ainda não validado. Não sustenta recomendação automática.";
  if (input.sameCompany) return `Baseado em aprendizado validado na empresa ${input.companyName}.`;
  return `Aprendizado de outra operação (${input.companyName}). Possível estratégia transferível.`;
}

const AUDIT_ENTITY_HREF: Record<string, (companyId: string | null, entityId: string | null) => string | null> = {
  Company: (companyId, entityId) => (entityId ? `/empresas/${entityId}` : companyId ? `/empresas/${companyId}` : null),
  Diagnosis: (companyId) => (companyId ? `/empresas/${companyId}/diagnostico` : null),
  Opportunity: (companyId, entityId) =>
    companyId && entityId ? `/empresas/${companyId}/oportunidades/${entityId}` : companyId ? `/empresas/${companyId}/oportunidades` : null,
  Decision: (companyId) => (companyId ? `/empresas/${companyId}` : "/cockpit#cockpit-decisoes"),
  ActionPlan: (companyId, entityId) =>
    companyId && entityId ? `/empresas/${companyId}/execucao/${entityId}` : companyId ? `/empresas/${companyId}/execucao` : null,
  Task: (companyId) => (companyId ? `/empresas/${companyId}/execucao` : null),
  FinancialStatement: (companyId) => (companyId ? `/empresas/${companyId}/financeiro` : null),
  FinancialGoal: (companyId) => (companyId ? `/empresas/${companyId}/financeiro/metas` : null),
  FinancialRecord: (companyId) => (companyId ? `/empresas/${companyId}/financeiro/fluxo-caixa` : null),
  Experiment: (companyId, entityId) =>
    companyId && entityId ? `/empresas/${companyId}/experimentos/${entityId}` : companyId ? `/empresas/${companyId}/experimentos` : null,
  ExperimentResult: (companyId) => (companyId ? `/empresas/${companyId}/experimentos` : null),
  Evidence: (companyId) => (companyId ? `/empresas/${companyId}/experimentos?status=COMPLETED` : null),
  StrategicMemory: (companyId, entityId) =>
    companyId && entityId ? `/empresas/${companyId}/memoria/${entityId}` : companyId ? `/empresas/${companyId}/memoria` : "/memoria",
  Automation: () => "/automacoes",
  AutomationAlert: () => "/alertas",
  Alert: () => "/alertas",
  ResourceBudget: () => "/alocacao",
  AllocationProposal: () => "/alocacao",
  AllocationScenario: () => "/alocacao",
  AIConversation: (companyId) => (companyId ? `/empresas/${companyId}/assistente` : "/assistente"),
  ResearchSession: (companyId) => (companyId ? `/empresas/${companyId}/assistente` : "/assistente"),
  Cockpit: () => "/cockpit",
  CompanyOnboarding: (companyId) => (companyId ? `/empresas/${companyId}/onboarding` : null),
};

export function auditResourceHref(input: {
  entity: string;
  entityId?: string | null;
  companyId?: string | null;
}): string | null {
  const mapper = AUDIT_ENTITY_HREF[input.entity];
  if (!mapper) {
    return input.companyId ? `/empresas/${input.companyId}` : null;
  }
  return mapper(input.companyId ?? null, input.entityId ?? null);
}

export function auditEntityLabel(entity: string | null | undefined): string {
  const labels: Record<string, string> = {
    Company: RELEASE_NOMENCLATURE.empresa,
    Diagnosis: RELEASE_NOMENCLATURE.diagnostico,
    Opportunity: RELEASE_NOMENCLATURE.oportunidade,
    Decision: RELEASE_NOMENCLATURE.decisao,
    ActionPlan: RELEASE_NOMENCLATURE.plano,
    Task: RELEASE_NOMENCLATURE.tarefa,
    Experiment: RELEASE_NOMENCLATURE.experimento,
    ExperimentResult: RELEASE_NOMENCLATURE.resultado,
    Evidence: RELEASE_NOMENCLATURE.evidencia,
    StrategicMemory: RELEASE_NOMENCLATURE.memoria,
    Automation: RELEASE_NOMENCLATURE.automacao,
    AutomationAlert: RELEASE_NOMENCLATURE.alerta,
    Alert: RELEASE_NOMENCLATURE.alerta,
    ResourceBudget: RELEASE_NOMENCLATURE.alocacao,
    AllocationProposal: RELEASE_NOMENCLATURE.alocacao,
    FinancialStatement: "Financeiro",
    FinancialGoal: "Metas",
    FinancialRecord: "Fluxo de caixa",
    AIConversation: RELEASE_NOMENCLATURE.assistente,
    ResearchSession: "Pesquisa externa",
    Cockpit: "Cockpit",
    CompanyOnboarding: "Onboarding",
  };
  if (!entity) return "Recurso";
  return labels[entity] ?? entity;
}

export function contextualAssistantPrompt(kind: "empresa" | "diagnostico" | "oportunidade" | "financeiro" | "experimento" | "alocacao", title?: string): string {
  switch (kind) {
    case "diagnostico":
      return "Quais são meus maiores gargalos?";
    case "oportunidade":
      return title ? `Analise a oportunidade ${title}. Qual o próximo passo?` : "Qual oportunidade devo analisar primeiro?";
    case "financeiro":
      return "Como está minha saúde financeira?";
    case "experimento":
      return title ? `Este experimento funcionou: ${title}` : "Quais experimentos precisam de atenção?";
    case "alocacao":
      return "Como eu distribuiria os recursos disponíveis?";
    default:
      return "Onde devo agir primeiro?";
  }
}
