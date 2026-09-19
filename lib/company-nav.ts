export type CompanyNavItem = {
  key: string;
  label: string;
  href: (companyId: string) => string;
  match: (pathname: string) => boolean;
  children?: Array<{
    key: string;
    label: string;
    href: (companyId: string) => string;
  }>;
};

export const COMPANY_NAV: CompanyNavItem[] = [
  {
    key: "central",
    label: "Central",
    href: (id) => `/empresas/${id}`,
    match: (pathname) => /^\/empresas\/[^/]+$/.test(pathname),
  },
  {
    key: "diagnostico",
    label: "Diagnóstico 360°",
    href: (id) => `/empresas/${id}/diagnostico`,
    match: (pathname) => pathname.includes("/diagnostico"),
  },
  {
    key: "oportunidades",
    label: "Oportunidades",
    href: (id) => `/empresas/${id}/oportunidades`,
    match: (pathname) => pathname.includes("/oportunidades"),
  },
  {
    key: "execucao",
    label: "Plano 30/60/90",
    href: (id) => `/empresas/${id}/execucao`,
    match: (pathname) => pathname.includes("/execucao"),
  },
  {
    key: "financeiro",
    label: "Financeiro",
    href: (id) => `/empresas/${id}/financeiro`,
    match: (pathname) => pathname.includes("/financeiro"),
    children: [
      { key: "dre", label: "DRE", href: (id) => `/empresas/${id}/financeiro/dre` },
      { key: "caixa", label: "Fluxo de caixa", href: (id) => `/empresas/${id}/financeiro/fluxo-caixa` },
      { key: "metas", label: "Metas", href: (id) => `/empresas/${id}/financeiro/metas` },
      { key: "cenarios", label: "Cenários", href: (id) => `/empresas/${id}/financeiro/cenarios` },
    ],
  },
  {
    key: "experimentos",
    label: "Experimentos",
    href: (id) => `/empresas/${id}/experimentos`,
    match: (pathname) => pathname.includes("/experimentos"),
    children: [
      { key: "evidencias", label: "Evidências", href: (id) => `/empresas/${id}/experimentos?status=COMPLETED` },
    ],
  },
  {
    key: "memoria",
    label: "Memória estratégica",
    href: (id) => `/empresas/${id}/memoria`,
    match: (pathname) => pathname.includes("/memoria"),
  },
  {
    key: "assistente",
    label: "Assistente IA",
    href: (id) => `/empresas/${id}/assistente`,
    match: (pathname) => pathname.includes("/assistente"),
  },
];

const RESERVED = new Set(["nova"]);

export function companyIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/empresas\/([^/]+)/);
  if (!match?.[1] || RESERVED.has(match[1])) return null;
  return match[1];
}

export const GESTAO_NAV: Array<{ key: string; label: string }> = [
  { key: "diagnostico", label: "Diagnóstico 360°" },
  { key: "oportunidades", label: "Oportunidades" },
  { key: "execucao", label: "Plano 30/60/90" },
  { key: "financeiro", label: "Financeiro" },
  { key: "experimentos", label: "Experimentos" },
];

export const COMPANY_MODULE_TABS: Array<{ key: string; label: string }> = [
  { key: "central", label: "Visão Geral" },
  { key: "diagnostico", label: "Diagnóstico 360°" },
  { key: "oportunidades", label: "Oportunidades" },
  { key: "execucao", label: "Plano 30/60/90" },
  { key: "financeiro", label: "Financeiro" },
  { key: "experimentos", label: "Experimentos" },
  { key: "memoria", label: "Memória Estratégica" },
  { key: "assistente", label: "Assistente IA" },
];

export const MODULE_PICKER_LABELS: Record<string, string> = {
  central: "visão geral da empresa",
  diagnostico: "Diagnóstico 360°",
  oportunidades: "Oportunidades",
  execucao: "Plano 30/60/90",
  financeiro: "Financeiro",
  dre: "DRE",
  caixa: "Fluxo de caixa",
  metas: "Metas",
  cenarios: "Cenários",
  experimentos: "Experimentos",
  evidencias: "Evidências",
  memoria: "Memória estratégica",
  assistente: "Assistente IA",
};

export function findCompanyNav(key: string) {
  const parent = COMPANY_NAV.find((item) => item.key === key);
  if (parent) return parent;
  for (const item of COMPANY_NAV) {
    const child = item.children?.find((entry) => entry.key === key);
    if (child) return child;
  }
  return null;
}

export function pathForModuleQuery(modulo: string | undefined, companyId: string): string | null {
  if (!modulo) return null;
  const item = findCompanyNav(modulo);
  return item ? item.href(companyId) : null;
}

export function gestaoHref(companyId: string | null, key: string): string {
  if (companyId) return pathForModuleQuery(key, companyId) ?? `/empresas/${companyId}`;
  return `/empresas?modulo=${key}`;
}
