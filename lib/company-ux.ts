import { nextCockpitAction, type CompanyProgress } from "@/lib/cockpit";
import { cockpitPriorityFromCompany } from "@/lib/priority";

export const ESSENTIAL_MODULE_KEYS = ["cadastro", "onboarding", "diagnostico", "financeiro", "oportunidades"] as const;

export type EssentialModuleKey = (typeof ESSENTIAL_MODULE_KEYS)[number];

export type CoverageLevel = "INICIAL" | "PARCIAL" | "COMPLETO";

export type EssentialFlags = Record<EssentialModuleKey, boolean>;

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  ARCHIVED: "Arquivada",
};

export const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  INICIAL: "Inicial",
  PARCIAL: "Parcial",
  COMPLETO: "Completo",
};

export const COMPANY_SEGMENT_OPTIONS = [
  "Alimentação",
  "Oficina",
  "Varejo",
  "Serviços",
  "Saúde",
  "Educação",
  "Indústria",
  "Outro",
] as const;

const SEGMENT_ALIASES: Record<string, string> = {
  alimentacao: "Alimentação",
  alimentação: "Alimentação",
  restaurante: "Alimentação",
  food: "Alimentação",
  oficina: "Oficina",
  "oficina mecanica": "Oficina",
  "oficina mecânica": "Oficina",
  varejo: "Varejo",
  servicos: "Serviços",
  serviços: "Serviços",
};

export function companyStatusLabel(status: string | null | undefined, isDemo = false): string {
  if (isDemo) return "Demo";
  if (!status) return "—";
  return COMPANY_STATUS_LABELS[status] ?? status;
}

export function displaySegment(value: string | null | undefined): string {
  if (!value?.trim()) return "Não informado";
  const key = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (SEGMENT_ALIASES[key] || SEGMENT_ALIASES[value.trim().toLowerCase()]) {
    return SEGMENT_ALIASES[value.trim().toLowerCase()] ?? SEGMENT_ALIASES[key];
  }
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function segmentSelectValue(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const displayed = displaySegment(value);
  if (displayed === "Não informado") return "";
  return COMPANY_SEGMENT_OPTIONS.includes(displayed as (typeof COMPANY_SEGMENT_OPTIONS)[number]) && displayed !== "Outro"
    ? displayed
    : "Outro";
}

export function dataHealthLabel(level: string | null | undefined): string {
  const labels: Record<string, string> = {
    COMPLETO: "Completo",
    PARCIAL: "Parcial",
    INSUFICIENTE: "Insuficiente",
  };
  return level ? (labels[level] ?? level) : "—";
}

export function coverageFromFlags(flags: EssentialFlags): {
  filled: number;
  total: number;
  level: CoverageLevel;
  label: string;
} {
  const total = ESSENTIAL_MODULE_KEYS.length;
  const filled = ESSENTIAL_MODULE_KEYS.filter((key) => flags[key]).length;
  const level: CoverageLevel = filled <= 1 ? "INICIAL" : filled <= 3 ? "PARCIAL" : "COMPLETO";
  return {
    filled,
    total,
    level,
    label: `${filled} de ${total} essenciais`,
  };
}

export function listingPriorityLabel(company: {
  revenueMonthly: number | null;
  marginPercent: number | null;
  perceivedBottlenecks: string | null;
  objectives: string | null;
}): string {
  const informed =
    company.revenueMonthly != null || company.marginPercent != null || Boolean(company.perceivedBottlenecks);
  if (!informed) return "—";
  const zone = cockpitPriorityFromCompany(company).zone;
  if (zone === "critical") return "Alta";
  if (zone === "watch") return "Média";
  if (zone === "stable") return "Baixa";
  return "Média";
}

export function nextActionForCompany(progress: CompanyProgress) {
  return nextCockpitAction(progress);
}
