export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "allocation.simulated": "Alocação simulada",
  "allocation.recalculated": "Alocação recalculada",
  "allocation.proposal_created": "Proposta de alocação criada",
  "allocation.proposal_reviewed": "Proposta de alocação revisada",
  "allocation.sent_to_decision": "Alocação enviada para decisão",
  "allocation.approved": "Alocação aprovada",
  "allocation.rejected": "Alocação rejeitada",
  "automation.created": "Automação criada",
  "automation.enabled": "Automação ativada",
  "automation.disabled": "Automação pausada",
  "automation.executed": "Automação executada",
  "automation.failed": "Automação falhou",
  "alert.created": "Alerta criado",
  "alert.acknowledged": "Alerta reconhecido",
  "alert.resolved": "Alerta resolvido",
  "alert.dismissed": "Alerta dispensado",
  "notification.read": "Notificação lida",
  "decision.approved": "Decisão aprovada",
  "decision.rejected": "Decisão rejeitada",
  "decision.deferred": "Decisão adiada",
  "auth.login": "Login",
  "auth.login_denied": "Login negado",
  "security.access_denied": "Acesso negado",
  "security.validation_failed": "Validação recusada",
  "experiment.completed": "Experimento concluído",
  "evidence.created": "Evidência registrada",
  "memory.promoted": "Memória promovida",
};

export const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  allocation: "Alocação",
  automation: "Automação",
  alert: "Alerta",
  notification: "Notificação",
  decision: "Decisão",
  auth: "Acesso",
  security: "Segurança",
  experiment: "Experimento",
  evidence: "Evidência",
  memory: "Memória",
  ai: "Assistente",
  research: "Pesquisa",
  company: "Empresa",
  opportunity: "Oportunidade",
};

export function auditActionLabel(action: string | null | undefined): string {
  if (!action) return "Evento";
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}

export function auditCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Sistema";
  return AUDIT_CATEGORY_LABELS[category] ?? category;
}

export { auditEntityLabel, auditResourceHref } from "@/lib/journey-ui";

export const EMPTY_AUDIT = {
  title: "Nenhum evento encontrado para os filtros selecionados.",
  body: "Ajuste o período, a empresa ou a ação. Nenhum dado de outro owner aparece aqui.",
};
