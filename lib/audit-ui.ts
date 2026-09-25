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
  "company.restore": "Empresa restaurada",
  "company.archive": "Empresa arquivada",
  "decision.deferred": "Decisão adiada",
  "auth.login": "Login",
  "auth.login_denied": "Login negado",
  "security.access_denied": "Acesso negado",
  "security.validation_failed": "Validação recusada",
  "experiment.completed": "Experimento concluído",
  "evidence.created": "Evidência registrada",
  "memory.promoted": "Memória promovida",
  "connection.proposed": "Conexão sugerida",
  "connection.reviewed": "Conexão revisada",
  "connection.approved": "Conexão aprovada",
  "connection.rejected": "Conexão rejeitada",
  "connection.archived": "Conexão arquivada",
  "strategy.created": "Estratégia criada",
  "strategy.reviewed": "Estratégia revisada",
  "strategy.approved": "Estratégia aprovada",
  "strategy.rejected": "Estratégia rejeitada",
  "strategy.converted_to_opportunity": "Estratégia convertida em oportunidade",
  "playbook.created": "Playbook criado",
  "playbook.updated": "Playbook atualizado",
  "playbook.submitted": "Playbook enviado para revisão",
  "playbook.approved": "Playbook validado",
  "playbook.archived": "Playbook arquivado",
  "playbook.application.proposed": "Aplicação de playbook proposta",
  "playbook.application.created": "Aplicação de playbook criada",
  "playbook.application.compatibility.calculated": "Compatibilidade de aplicação calculada",
  "playbook.application.reviewed": "Aplicação de playbook revisada",
  "playbook.application.confirmed": "Aplicação de playbook confirmada",
  "playbook.application.approved": "Aplicação de playbook aprovada",
  "playbook.application.rejected": "Aplicação de playbook rejeitada",
  "playbook.application.plan.created": "Plano de aplicação criado",
  "playbook.application.experiment.created": "Experimento de transferência criado",
  "playbook.application.experiment.started": "Experimento de transferência iniciado",
  "playbook.application.result.recorded": "Resultado de transferência registrado",
  "playbook.application.evidence.created": "Evidência local de transferência criada",
  "playbook.application.memory.proposed": "Memória local de transferência proposta",
  "playbook.application.memory.approved": "Memória local de transferência aprovada",
  "playbook.application.memory.rejected": "Memória local de transferência rejeitada",
  "playbook.application.completed": "Ciclo de transferência concluído",
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
  connection: "Conexão",
  strategy: "Estratégia",
  playbook: "Playbook",
  ai: "Assistente",
  research: "Pesquisa",
  company: "Empresa",
  opportunity: "Oportunidade",
};

const NOISY_AUDIT_ACTIONS = new Set(["cockpit.viewed", "page.viewed", "page.refresh", "page.render"]);

/** Visualização, refresh e render não entram na trilha operacional. `reviewed` permanece. */
export function isNoisyAuditAction(action: string | null | undefined): boolean {
  if (!action) return false;
  if (NOISY_AUDIT_ACTIONS.has(action)) return true;
  return action.endsWith(".viewed") || action.endsWith(".refresh") || action.endsWith(".render");
}

export function auditActionLabel(action: string | null | undefined): string {
  if (!action) return "Evento";
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}

export function auditCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Sistema";
  return AUDIT_CATEGORY_LABELS[category] ?? category;
}

export { auditEntityLabel, auditResourceHref } from "@/lib/journey-ui";

export type AuditUrlFilters = {
  empresa?: string;
  categoria?: string;
  acao?: string;
  usuario?: string;
  de?: string;
  ate?: string;
};

export function parseAuditUrlFilters(search: AuditUrlFilters): AuditUrlFilters {
  return {
    empresa: search.empresa?.trim() || undefined,
    categoria: search.categoria?.trim() || undefined,
    acao: search.acao?.trim() || undefined,
    usuario: search.usuario?.trim() || undefined,
    de: search.de?.trim() || undefined,
    ate: search.ate?.trim() || undefined,
  };
}

export function buildAuditSearch(filters: AuditUrlFilters): string {
  const params = new URLSearchParams();
  if (filters.empresa) params.set("empresa", filters.empresa);
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.acao) params.set("acao", filters.acao);
  if (filters.usuario) params.set("usuario", filters.usuario);
  if (filters.de) params.set("de", filters.de);
  if (filters.ate) params.set("ate", filters.ate);
  const query = params.toString();
  return query ? `/auditoria?${query}` : "/auditoria";
}

export const EMPTY_AUDIT = {
  title: "Nenhum evento encontrado para os filtros selecionados.",
  body: "Ajuste o período, a empresa ou a ação. Nenhum dado de outro owner aparece aqui.",
};
