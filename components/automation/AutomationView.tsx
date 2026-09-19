"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  acknowledgeAlertAction,
  createAutomationAction,
  dismissAlertAction,
  enableAutomationAction,
  readNotificationAction,
  resolveAlertAction,
  runAutomationAction,
} from "@/app/automacoes/actions";
import { EmptyState } from "@/components/ui/States";
import { AUTOMATION_SHORTCUTS } from "@/lib/automation-rules-engine";
import {
  EMPTY_ALERT,
  EMPTY_AUTOMATION,
  alertPriorityLabel,
  alertStatusLabel,
  automationKindLabel,
  conditionLabel,
  frequencyLabel,
  groupAutomations,
  runNowDisclaimer,
  runNowResultCopy,
  type AutomationBucket,
} from "@/lib/automation-ui";
import { formatInTimezone } from "@/lib/timezone";
import type { AutomationWorkspace } from "@/services/automationService";

const BUCKETS: AutomationBucket[] = ["ATIVAS", "PAUSADAS", "RASCUNHOS", "COM PROBLEMA"];

export function AutomationView({
  workspace,
  companyId,
}: {
  workspace: AutomationWorkspace;
  companyId?: string;
}) {
  const [, start] = useTransition();
  const [confirmRunId, setConfirmRunId] = useState<string | null>(null);
  const lastStatus = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const item of workspace.executions) {
      if (item.automationId && map[item.automationId] == null) map[item.automationId] = item.status;
    }
    return map;
  }, [workspace.executions]);
  const groups = groupAutomations(workspace.automations, lastStatus);
  const lastRun = workspace.executions[0] ?? null;
  const openAlerts = workspace.alerts.filter((item) => item.status === "OPEN");
  const selectedTemplate = workspace.templates[0];

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <section className="rounded-[24px] border p-6" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
          Automações
        </p>
        <h1 className="mt-2 text-[26px] font-bold">O que a A TEIA está acompanhando automaticamente?</h1>
        <p className="mt-2 max-w-3xl text-[14px]" style={{ color: "var(--text-2)" }}>
          Regras determinísticas geram alerta. Nenhuma movimentação financeira e nenhuma ação externa.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Ativas" value={String(workspace.activeCount)} hint={`${workspace.automations.length} no total`} />
        <Mini label="Alertas abertos" value={String(openAlerts.length)} hint="Condição detectada, não conclusão" />
        <Mini label="Próxima execução" value={workspace.nextRun ? formatInTimezone(new Date(workspace.nextRun)) : "Sem dados"} hint="Horário de Brasília" />
        <Mini label="Execuções" value={String(workspace.executions.length)} hint={`${workspace.failures} com problema`} />
        <Mini label="Não lidas" value={String(workspace.unread)} hint="Somente no app" />
      </section>

      <form action={createAutomationAction} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Criar acompanhamento
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
            O que acompanhar?
            <select name="templateKey" required className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
              {workspace.templates.map((item) => (
                <option key={item.key} value={item.key}>{item.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>
            Empresa
            <select name="companyId" defaultValue={companyId ?? ""} className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
              <option value="">Portfólio (todas)</option>
              {workspace.companies.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>Frequência</span>
            {selectedTemplate ? frequencyLabel(selectedTemplate.frequency) : "Todos os dias"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>Ação</span>
            Gerar alerta
          </p>
        </div>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          A regra nasce desligada. Revise e confirme a ativação. A IA não liga sozinha.
        </p>
        <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
          Revisar e criar desligada
        </button>
      </form>

      <section>
        <Header title="Regras" subtitle="Ativas, pausadas, rascunhos e com problema." />
        {workspace.automations.length ? (
          <div className="space-y-5">
            {BUCKETS.map((bucket) =>
              groups[bucket].length ? (
                <div key={bucket}>
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                    {bucket} · {groups[bucket].length}
                  </p>
                  <ul className="space-y-2">
                    {groups[bucket].map((item) => {
                      const last = workspace.executions.find((row) => row.automationId === item.id);
                      return (
                        <li key={item.id} className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--border)" }}>
                          <p className="text-[13px] font-bold">{item.title}</p>
                          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                            {item.companyName ?? "Portfólio"} · {conditionLabel(item.condition)} · {frequencyLabel(item.frequency)} · {automationKindLabel(item.kind)}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                            Última: {item.lastRunAt ? formatInTimezone(new Date(item.lastRunAt)) : "ainda não executou"}
                            {item.nextRunAt ? ` · Próxima: ${formatInTimezone(new Date(item.nextRunAt))}` : ""}
                            {last ? ` · ${runNowResultCopy({ itemsProcessed: last.itemsProcessed, alertsCreated: last.alertsCreated })}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => enableAutomationAction(item.id, !item.enabled))}>
                              {item.enabled ? "Pausar" : "Ativar"}
                            </button>
                            {confirmRunId === item.id ? (
                              <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                                {runNowDisclaimer()}{" "}
                                <button type="button" className="font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => { setConfirmRunId(null); start(() => runAutomationAction(item.id)); }}>
                                  Confirmar
                                </button>
                              </span>
                            ) : (
                              <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => setConfirmRunId(item.id)}>
                                Executar agora
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <EmptyState title={EMPTY_AUTOMATION.title} body={EMPTY_AUTOMATION.body} />
        )}
      </section>

      {lastRun ? (
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Última execução: {runNowResultCopy({ itemsProcessed: lastRun.itemsProcessed, alertsCreated: lastRun.alertsCreated })}
        </p>
      ) : null}

      <section id="alertas">
        <Header title="Alertas" subtitle="Detectado → Aberto → Reconhecido → Resolvido ou Dispensado. Histórico preservado." />
        {workspace.alerts.length ? (
          <ul className="space-y-2">
            {workspace.alerts.map((item) => (
              <li key={item.id} className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
                  {alertPriorityLabel(item.priority)} · {alertStatusLabel(item.status)} · {item.companyName ?? "Portfólio"}
                </p>
                <p className="text-[13px] font-bold">{item.title}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{item.message}</p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {formatInTimezone(new Date(item.detectedAt))} · origem {item.ruleKey.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Condição detectada. Não prova fraude, perda ou falha de gestão.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.href ? <Link href={item.href} className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>Próxima ação</Link> : null}
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => acknowledgeAlertAction(item.id))}>Reconhecer</button>
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => resolveAlertAction(item.id))}>Resolver</button>
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => dismissAlertAction(item.id))}>Dispensar</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={EMPTY_ALERT.title} body={EMPTY_ALERT.body} />
        )}
      </section>

      <section id="notificacoes">
        <Header title="Inbox" subtitle="Somente avisos internos. Sem e-mail, WhatsApp ou Slack." />
        {workspace.notifications.length ? (
          <ul className="space-y-2">
            {workspace.notifications.map((item) => (
              <li key={item.id} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[13px] font-bold">{item.title}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{item.body}</p>
                {!item.readAt ? (
                  <button type="button" className="mt-1 text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => readNotificationAction(item.id))}>
                    Marcar como lida
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum aviso interno." body="Quando uma regra dispara, o alerta aparece aqui." />
        )}
      </section>

      <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.28)", background: "rgba(232,191,122,.06)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>Perguntar à A TEIA</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AUTOMATION_SHORTCUTS.map((item) => (
            <Link key={item.prompt} href={`/assistente?pergunta=${encodeURIComponent(item.prompt)}`} className="rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: "rgba(232,191,122,.3)", color: "var(--gold-soft)" }}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="m-0 flex items-center gap-2 text-[20px] font-bold">
        <span className="inline-block h-5 w-1 rounded" style={{ background: "linear-gradient(180deg,var(--gold),var(--silver))" }} />
        {title}
      </h2>
      <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>{subtitle}</p>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="mt-1 text-[18px] font-black">{value}</p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>{hint}</p>
    </div>
  );
}
