export type AsyncViewState = "loading" | "empty" | "error" | "success";

export type NavItem = {
  href: string;
  label: string;
  enabled: boolean;
  group?: string;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/cockpit", label: "Meu Cockpit", enabled: true, group: "Núcleo" },
  { href: "/empresas", label: "Empresas", enabled: true, group: "Núcleo" },
];

export const CENTRAL_NAV: NavItem[] = [
  { href: "/cockpit#cockpit-prioridades", label: "Prioridades", enabled: true, group: "Central" },
  { href: "/cockpit#cockpit-decisoes", label: "Decisões", enabled: true, group: "Central" },
  { href: "/alocacao", label: "Alocação", enabled: true, group: "Central" },
];

export const INTELLIGENCE_NAV: NavItem[] = [
  { href: "/memoria", label: "Memória Estratégica", enabled: true, group: "Inteligência" },
  { href: "/assistente", label: "Assistente IA", enabled: true, group: "Inteligência" },
];

export const FUTURE_NAV: NavItem[] = [
  { href: "#", label: "Conexões", enabled: false, group: "Em breve" },
  { href: "#", label: "Estratégia", enabled: false, group: "Em breve" },
  { href: "#", label: "Auditoria", enabled: false, group: "Em breve" },
];
