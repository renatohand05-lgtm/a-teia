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
  alimentacap: "Alimentação",
  alimentaçãp: "Alimentação",
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

function segmentKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isAlimentacaoTypo(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return segmentKey(value) === "alimentacap";
}

export function displaySegment(value: string | null | undefined): string {
  if (!value?.trim()) return "Não informado";
  const trimmed = value.trim();
  const key = segmentKey(trimmed);
  if (SEGMENT_ALIASES[key] || SEGMENT_ALIASES[trimmed.toLowerCase()]) {
    return SEGMENT_ALIASES[trimmed.toLowerCase()] ?? SEGMENT_ALIASES[key];
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function persistableSegment(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const displayed = displaySegment(trimmed);
  if (displayed === "Não informado") return null;
  if (COMPANY_SEGMENT_OPTIONS.includes(displayed as (typeof COMPANY_SEGMENT_OPTIONS)[number]) && displayed !== "Outro") {
    return displayed;
  }
  return trimmed;
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
