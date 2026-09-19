"use client";

import Link from "next/link";
import { useTransition } from "react";
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
import { formatInTimezone } from "@/lib/timezone";
import type { AutomationWorkspace } from "@/services/automationService";

export function AutomationView({
  workspace,
  companyId,
}: {
  workspace: AutomationWorkspace;
  companyId?: string;
}) {
  const [, start] = useTransition();

  return (
    <div className="mx-auto max-w-[1480px] space-y-8">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Automações ativas" value={String(workspace.activeCount)} hint={`${workspace.automations.length} no total`} />
        <Mini label="Alertas ativos" value={String(workspace.alerts.filter((item) => item.status === "OPEN" || item.status === "ACKNOWLEDGED").length)} hint="Histórico preservado" />
        <Mini label="Rotinas agendadas" value={String(workspace.automations.filter((item) => item.enabled && item.frequency !== "MANUAL").length)} hint={workspace.nextRun ? `Próxima: ${formatInTimezone(new Date(workspace.nextRun))}` : "Nenhuma"} />
        <Mini label="Execuções recentes" value={String(workspace.executions.length)} hint={`${workspace.failures} falha(s)`} />
        <Mini label="Não lidas" value={String(workspace.unread)} hint="Somente in-app" />
      </section>

      <form action={createAutomationAction} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Criar automação
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <select name="templateKey" required className="rounded-xl border bg-transparent px-3 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
            {workspace.templates.map((item) => (
              <option key={item.key} value={item.key}>{item.title}</option>
            ))}
          </select>
          <select name="companyId" defaultValue={companyId ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--text-1)" }}>
            <option value="">Portfólio (todas as empresas)</option>
            {workspace.companies.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
            Revisar e criar desligada
          </button>
        </div>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          A automação nasce desligada. Ative depois. A IA não liga regra sozinha.
        </p>
      </form>

      <section>
        <Header title="Automações" subtitle="Regras determinísticas. Timezone America/São Paulo." />
        {workspace.automations.length ? (
          <ul className="space-y-2">
            {workspace.automations.map((item) => (
              <li key={item.id} className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-[13px] font-bold">{item.title}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  {item.kind} · {item.frequency} · {item.companyName ?? "Portfólio"} · {item.enabled ? "ativa" : "desligada"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => enableAutomationAction(item.id, !item.enabled))}>
                    {item.enabled ? "Desativar" : "Ativar"}
                  </button>
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => runAutomationAction(item.id))}>
                    Executar agora
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Crie sua primeira automação." body="Use um template. Nada é ativado em silêncio." />
        )}
      </section>

      <section id="alertas">
        <Header title="Alertas" subtitle="Deduplicados. Histórico não é apagado ao resolver." />
        {workspace.alerts.length ? (
          <ul className="space-y-2">
            {workspace.alerts.map((item) => (
              <li key={item.id} className="rounded-2xl border px-3 py-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-extrabold" style={{ color: "var(--gold-soft)" }}>
                  {item.priority} · {item.status} · {item.companyName ?? "Portfólio"} · {item.ruleKey}
                </p>
                <p className="text-[13px] font-bold">{item.title}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{item.message}</p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>Detectado {formatInTimezone(new Date(item.detectedAt))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.href ? <Link href={item.href} className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }}>Abrir contexto</Link> : null}
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => acknowledgeAlertAction(item.id))}>Reconhecer</button>
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => resolveAlertAction(item.id))}>Resolver</button>
                  <button type="button" className="text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => dismissAlertAction(item.id))}>Dispensar</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum alerta ativo." body="As regras só disparam com dados persistidos." />
        )}
      </section>

      <section id="notificacoes">
        <Header title="Notificações in-app" subtitle="E-mail, WhatsApp e Slack existem só como canal futuro. Não há envio fingido." />
        {workspace.notifications.length ? (
          <ul className="space-y-2">
            {workspace.notifications.map((item) => (
              <li key={item.id} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                <p className="text-[13px] font-bold">{item.title}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{item.body}</p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{item.readAt ? "Lida" : "Não lida"}</p>
                {!item.readAt ? (
                  <button type="button" className="mt-1 text-[11px] font-extrabold" style={{ color: "var(--gold-soft)" }} onClick={() => start(() => readNotificationAction(item.id))}>
                    Marcar como lida
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma notificação." body="Alertas geram aviso interno quando a regra dispara." />
        )}
      </section>

      <section id="resumos">
        <Header title="Execuções" subtitle="Idempotentes. Sem stack trace cru." />
        {workspace.executions.length ? (
          <ul className="space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {workspace.executions.map((item) => (
              <li key={item.id}>
                {formatInTimezone(new Date(item.startedAt))} · {item.status}
                {item.failureKind ? ` · ${item.failureKind}` : ""} · {item.summary ?? "sem resumo"}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma execução registrada." body="Ative uma automação ou execute agora." />
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
