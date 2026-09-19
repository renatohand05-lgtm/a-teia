import { COMPANY_NAV, pathForModuleQuery } from "@/lib/company-nav";

export type ModuleStatus = "SEM_DADOS" | "INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "ATENCAO";

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  SEM_DADOS: "Sem dados",
  INICIADO: "Iniciado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  ATENCAO: "Atenção",
};

export type CompanyProgress = {
  companyId: string | null;
  companyName: string | null;
  hasCompany: boolean;
  hasDiagnosis: boolean;
  opportunityCount: number;
  prioritizedOpportunityCount: number;
  planCount: number;
  financialCount: number;
  experimentActiveCount: number;
  experimentCompletedCount: number;
  evidenceCount: number;
  evidenceValidatedCount: number;
  memoryValidatedCount: number;
  attention: boolean;
};

export type CockpitActionCode =
  | "CREATE_COMPANY"
  | "DIAGNOSIS"
  | "OPPORTUNITIES"
  | "PLAN"
  | "EXPERIMENT"
  | "MEMORY"
  | "REVIEW";

export type CockpitAction = {
  code: CockpitActionCode;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export type JourneyStage = {
  key: string;
  label: string;
  status: ModuleStatus;
  href: string;
  clickable: true;
};

export const JOURNEY_STAGES = [
  { key: "empresa", label: "Empresa", moduleKey: "central" },
  { key: "diagnostico", label: "360°", moduleKey: "diagnostico" },
  { key: "oportunidade", label: "Oportunidade", moduleKey: "oportunidades" },
  { key: "execucao", label: "Plano 30/60/90", moduleKey: "execucao" },
  { key: "financeiro", label: "Financeiro", moduleKey: "financeiro" },
  { key: "experimento", label: "Experimento", moduleKey: "experimentos" },
  { key: "evidencia", label: "Evidência", moduleKey: "evidencias" },
  { key: "memoria", label: "Memória", moduleKey: "memoria" },
] as const;

export function emptyCompanyProgress(): CompanyProgress {
  return {
    companyId: null,
    companyName: null,
    hasCompany: false,
    hasDiagnosis: false,
    opportunityCount: 0,
    prioritizedOpportunityCount: 0,
    planCount: 0,
    financialCount: 0,
    experimentActiveCount: 0,
    experimentCompletedCount: 0,
    evidenceCount: 0,
    evidenceValidatedCount: 0,
    memoryValidatedCount: 0,
    attention: false,
  };
}

export function nextCockpitAction(progress: CompanyProgress): CockpitAction {
  if (!progress.hasCompany || !progress.companyId) {
    return {
      code: "CREATE_COMPANY",
      title: "Cadastrar primeira empresa",
      body: "O centro de decisão começa com um negócio real na carteira.",
      href: "/empresas/nova",
      cta: "Cadastrar empresa",
    };
  }

  const id = progress.companyId;
  const name = progress.companyName ?? "esta empresa";

  if (!progress.hasDiagnosis) {
    return {
      code: "DIAGNOSIS",
      title: "Realizar Diagnóstico 360°",
      body: `${name} ainda não tem um diagnóstico persistido.`,
      href: `/empresas/${id}/diagnostico`,
      cta: "Abrir diagnóstico",
    };
  }

  if (progress.opportunityCount === 0 || progress.prioritizedOpportunityCount === 0) {
    return {
      code: "OPPORTUNITIES",
      title: "Analisar oportunidades",
      body:
        progress.opportunityCount === 0
          ? "O 360° existe. O próximo passo é transformar o gargalo em hipóteses priorizadas."
          : "Há hipóteses cadastradas, mas nenhuma oportunidade priorizada.",
      href: `/empresas/${id}/oportunidades`,
      cta: "Ver oportunidades",
    };
  }

  if (progress.planCount === 0) {
    return {
      code: "PLAN",
      title: "Criar plano 30/60/90",
      body: "Há oportunidade priorizada sem plano de execução.",
      href: `/empresas/${id}/execucao`,
      cta: "Abrir execução",
    };
  }

  if (progress.experimentActiveCount === 0 && progress.experimentCompletedCount === 0 && progress.evidenceCount === 0) {
    return {
      code: "EXPERIMENT",
      title: "Criar experimento",
      body: "Há plano em andamento, mas ainda não há validação medida.",
      href: `/empresas/${id}/experimentos`,
      cta: "Abrir experimentos",
    };
  }

  if (progress.evidenceCount > 0 && progress.memoryValidatedCount === 0) {
    return {
      code: "MEMORY",
      title: "Transformar evidência em aprendizado",
      body: "A evidência já existe. Falta registrar a memória estratégica.",
      href: `/empresas/${id}/memoria`,
      cta: "Abrir memória",
    };
  }

  return {
    code: "REVIEW",
    title: "Revisar a jornada",
    body: "Os módulos principais já têm dados. Continue no ponto que precisa de atenção.",
    href: `/empresas/${id}`,
    cta: "Abrir empresa",
  };
}

export function stageHref(progress: Pick<CompanyProgress, "companyId">, moduleKey: string): string {
  if (moduleKey === "central") {
    return progress.companyId ? `/empresas/${progress.companyId}` : "/empresas/nova";
  }
  if (progress.companyId) {
    return pathForModuleQuery(moduleKey, progress.companyId) ?? `/empresas/${progress.companyId}`;
  }
  return `/empresas?modulo=${moduleKey}`;
}

export function journeyStatus(progress: CompanyProgress, key: (typeof JOURNEY_STAGES)[number]["key"]): ModuleStatus {
  switch (key) {
    case "empresa":
      if (!progress.hasCompany) return "SEM_DADOS";
      if (progress.attention) return "ATENCAO";
      return "CONCLUIDO";
    case "diagnostico":
      return progress.hasDiagnosis ? "CONCLUIDO" : "SEM_DADOS";
    case "oportunidade":
      if (progress.opportunityCount === 0) return "SEM_DADOS";
      if (progress.prioritizedOpportunityCount > 0) return "EM_ANDAMENTO";
      return "INICIADO";
    case "execucao":
      return progress.planCount > 0 ? "EM_ANDAMENTO" : "SEM_DADOS";
    case "financeiro":
      return progress.financialCount > 0 ? "INICIADO" : "SEM_DADOS";
    case "experimento":
      if (progress.experimentActiveCount > 0) return "EM_ANDAMENTO";
      if (progress.experimentCompletedCount > 0) return "CONCLUIDO";
      return "SEM_DADOS";
    case "evidencia":
      if (progress.evidenceCount === 0) return "SEM_DADOS";
      if (progress.evidenceValidatedCount > 0) return "CONCLUIDO";
      return "INICIADO";
    case "memoria":
      return progress.memoryValidatedCount > 0 ? "CONCLUIDO" : "SEM_DADOS";
    default:
      return "SEM_DADOS";
  }
}

export function buildJourney(progress: CompanyProgress): JourneyStage[] {
  return JOURNEY_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    status: journeyStatus(progress, stage.key),
    href: stageHref(progress, stage.moduleKey),
    clickable: true as const,
  }));
}

export function releasedModuleHrefs(companyId: string): string[] {
  const hrefs = COMPANY_NAV.flatMap((item) => [
    item.href(companyId),
    ...(item.children?.map((child) => child.href(companyId).split("?")[0] ?? child.href(companyId)) ?? []),
  ]);
  return Array.from(new Set(hrefs));
}
