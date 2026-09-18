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
    label: "Diagnóstico",
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
    label: "Execução 30/60/90",
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
];

const RESERVED = new Set(["nova"]);

export function companyIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/empresas\/([^/]+)/);
  if (!match?.[1] || RESERVED.has(match[1])) return null;
  return match[1];
}
