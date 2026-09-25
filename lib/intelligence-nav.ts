import type { CompanyCrumb } from "@/lib/company-nav";

const SECTIONS = [
  { prefix: "/conexoes", list: "Conexões", detail: "Conexão" },
  { prefix: "/estrategias", list: "Estratégias", detail: "Estratégia" },
  { prefix: "/playbooks", list: "Playbooks", detail: "Playbook" },
  { prefix: "/aplicacoes", list: "Aplicações", detail: "Aplicação" },
  { prefix: "/memoria", list: "Memória Estratégica", detail: "Memória" },
] as const;

export function looksLikeTechnicalId(value: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);
}

export function intelligenceBreadcrumbTrail(
  pathname: string,
  title: string,
  subtitle?: string,
): CompanyCrumb[] | null {
  const path = pathname.split("?")[0] ?? pathname;
  for (const section of SECTIONS) {
    if (path === section.prefix || path === `${section.prefix}/`) {
      return [{ label: section.list }];
    }
    if (path.startsWith(`${section.prefix}/`)) {
      const last = humanCrumbLabel(title, subtitle, section.detail);
      return [{ href: section.prefix, label: section.list }, { label: last }];
    }
  }
  return null;
}

export function humanCrumbLabel(title: string, subtitle: string | undefined, fallback: string): string {
  const candidates = [subtitle, title, fallback].filter((item): item is string => Boolean(item?.trim()));
  const chosen = candidates.find((item) => !looksLikeTechnicalId(item)) ?? fallback;
  return chosen;
}

export function timelineStepState(steps: Array<{ done: boolean }>): Array<"done" | "current" | "pending" | "blocked"> {
  let currentAssigned = false;
  return steps.map((step, index) => {
    if (step.done) return "done";
    const previous = steps[index - 1];
    if (previous && !previous.done) return "blocked";
    if (!currentAssigned) {
      currentAssigned = true;
      return "current";
    }
    return "pending";
  });
}

export const TIMELINE_STATE_LABELS = {
  done: "Concluído",
  current: "Atual",
  pending: "Pendente",
  blocked: "Bloqueado",
} as const;
