import { formatBRL } from "@/lib/format";
import { fromCents, fromHourHundredths } from "@/lib/money";
import { ALLOCATION_STATUS_LABELS, statusLabel } from "@/lib/status-labels";

export const SCENARIO_LABELS: Record<string, string> = {
  CONSERVADOR: "Conservador",
  BALANCEADO: "Base",
  EXPANSAO: "Expansão",
};

export const EVIDENCE_LABELS: Record<string, string> = {
  SEM_EVIDENCIA: "Sem evidência",
  HIPOTESE: "Hipótese",
  SINAL_INICIAL: "Sinal inicial",
  EVIDENCIA_VALIDADA: "Evidência disponível",
};

export const RISK_LABELS: Record<string, string> = {
  BAIXO: "Baixo",
  MODERADO: "Moderado",
  ALTO: "Alto",
  INDETERMINADO: "Indeterminado",
};

export function scenarioLabel(value: string | null | undefined): string {
  if (!value) return "Sem dados";
  return SCENARIO_LABELS[value] ?? value;
}

export function evidenceLabel(value: string | null | undefined): string {
  if (!value) return "Sem dados";
  return EVIDENCE_LABELS[value] ?? value;
}

export function riskLabel(value: string | null | undefined): string {
  if (!value) return "Sem dados";
  return RISK_LABELS[value] ?? value;
}

export function displayMoney(value: number | null | undefined): string {
  if (value == null) return "Sem dados";
  return formatBRL(value);
}

export function displayMoneyFromCents(cents: number | null | undefined): string {
  return displayMoney(fromCents(cents));
}

export function displayHours(value: number | null | undefined): string {
  if (value == null) return "Sem dados";
  return `${value}h`;
}

export function displayHoursFromHundredths(hundredths: number | null | undefined): string {
  return displayHours(fromHourHundredths(hundredths ?? null));
}

export function allocationStatusLabel(value: string | null | undefined): string {
  return statusLabel(value, ALLOCATION_STATUS_LABELS, "Sem dados");
}

export function isAllocationDecisionTitle(title: string | null | undefined): boolean {
  return /aloca/i.test(title ?? "");
}

export function scenarioFromDecisionTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const match = title.match(/CONSERVADOR|BALANCEADO|EXPANSAO/i);
  return match ? scenarioLabel(match[0].toUpperCase()) : null;
}

export function emptyAllocationCopy(hasCompanies: boolean): { title: string; body: string; cta: string; href: string } {
  if (!hasCompanies) {
    return {
      title: "Nenhuma simulação criada.",
      body: "Cadastre a primeira empresa para decidir onde investir dinheiro e tempo.",
      cta: "Cadastrar empresa",
      href: "/empresas/nova",
    };
  }
  return {
    title: "Nenhuma simulação criada.",
    body: "Informe capital ou horas disponíveis acima. A A TEIA não inventa disponibilidade e não força o uso de 100% dos recursos.",
    cta: "Abrir empresas",
    href: "/empresas",
  };
}
