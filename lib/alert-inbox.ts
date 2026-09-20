export type AlertInboxStatusFilter = "todos" | "novos" | "atencao" | "resolvidos";
export type AlertInboxSeverityFilter = "todos" | "critico" | "atencao" | "informativo";

export type AlertInboxItem = {
  status: string;
  priority: string;
};

export const ALERT_STATUS_FILTERS: Array<{ value: AlertInboxStatusFilter; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "novos", label: "Novos" },
  { value: "atencao", label: "Atenção" },
  { value: "resolvidos", label: "Resolvidos" },
];

export const ALERT_SEVERITY_FILTERS: Array<{ value: AlertInboxSeverityFilter; label: string }> = [
  { value: "todos", label: "Todas" },
  { value: "critico", label: "Crítico" },
  { value: "atencao", label: "Atenção" },
  { value: "informativo", label: "Informativo" },
];

export function matchesAlertStatus(status: string, filter: AlertInboxStatusFilter): boolean {
  if (filter === "todos") return true;
  if (filter === "novos") return status === "OPEN";
  if (filter === "atencao") return status === "ACKNOWLEDGED";
  return status === "RESOLVED" || status === "DISMISSED";
}

export function matchesAlertSeverity(priority: string, filter: AlertInboxSeverityFilter): boolean {
  if (filter === "todos") return true;
  if (filter === "critico") return priority === "CRITICO";
  if (filter === "atencao") return priority === "ALTO" || priority === "MEDIO";
  return priority === "BAIXO";
}

export function filterAlertInbox<T extends AlertInboxItem>(
  items: T[],
  status: AlertInboxStatusFilter,
  severity: AlertInboxSeverityFilter,
): T[] {
  return items.filter((item) => matchesAlertStatus(item.status, status) && matchesAlertSeverity(item.priority, severity));
}

export function alertActionFeedback(action: "acknowledged" | "resolved" | "dismissed"): string {
  if (action === "acknowledged") return "Alerta reconhecido.";
  if (action === "resolved") return "Alerta resolvido.";
  return "Alerta dispensado.";
}
