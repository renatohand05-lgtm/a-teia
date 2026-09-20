"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  acknowledgeAlertAction,
  dismissAlertAction,
  resolveAlertAction,
} from "@/app/automacoes/actions";
import { EmptyState } from "@/components/ui/States";
import { ALERT_SEVERITY_FILTERS, ALERT_STATUS_FILTERS, alertActionFeedback, filterAlertInbox, type AlertInboxSeverityFilter, type AlertInboxStatusFilter } from "@/lib/alert-inbox";
import { assistantHref } from "@/lib/assistant-ui";
import { EMPTY_ALERT, alertPriorityLabel, alertStatusLabel } from "@/lib/automation-ui";
import { formatDateTimeBR } from "@/lib/format";
import type { AlertDTO } from "@/services/automationService";

export function AlertInbox({ alerts }: { alerts: AlertDTO[] }) {
  const [status, setStatus] = useState<AlertInboxStatusFilter>("todos");
  const [severity, setSeverity] = useState<AlertInboxSeverityFilter>("todos");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => filterAlertInbox(alerts, status, severity), [alerts, status, severity]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <section className="rounded-2xl border px-5 py-5" style={{ borderColor: "var(--border)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
          Inbox
        </p>
        <h1 className="mt-1 text-[24px] font-bold">Alertas</h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
          Condição detectada. Reconhecer, resolver ou dispensar é ação humana.
        </p>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status do alerta">
        {ALERT_STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatus(item.value)}
            className="rounded-xl border px-3 py-1.5 text-[12px] font-bold"
            style={{
              borderColor: status === item.value ? "rgba(232,191,122,.45)" : "var(--border)",
              color: status === item.value ? "var(--gold-soft)" : "var(--text-2)",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Severidade">
        {ALERT_SEVERITY_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setSeverity(item.value)}
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={{ color: severity === item.value ? "var(--text-1)" : "var(--text-3)" }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {feedback ? (
        <p className="text-[13px]" style={{ color: "var(--success, #7dcea0)" }}>
          {feedback}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={alerts.length ? "Nenhum alerta neste recorte." : EMPTY_ALERT.title}
          body={alerts.length ? "Ajuste o status ou a severidade." : EMPTY_ALERT.body}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: item.priority === "CRITICO" ? "#f09a93" : "var(--text-3)" }}>
                  {alertPriorityLabel(item.priority)}
                </span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                  {alertStatusLabel(item.status)}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {item.companyName ?? "Portfólio"}
                </span>
              </div>
              <p className="mt-1 text-[14px] font-bold">{item.title}</p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
                {item.message}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                {formatDateTimeBR(item.detectedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.status === "OPEN" ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="text-[12px] font-bold disabled:opacity-50"
                    style={{ color: "var(--gold-soft)" }}
                    onClick={() =>
                      start(async () => {
                        await acknowledgeAlertAction(item.id);
                        setFeedback(alertActionFeedback("acknowledged"));
                      })
                    }
                  >
                    Reconhecer
                  </button>
                ) : null}
                {item.status === "OPEN" || item.status === "ACKNOWLEDGED" ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className="text-[12px] font-semibold disabled:opacity-50"
                      style={{ color: "var(--text-2)" }}
                      onClick={() =>
                        start(async () => {
                          await resolveAlertAction(item.id);
                          setFeedback(alertActionFeedback("resolved"));
                        })
                      }
                    >
                      Resolver
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="text-[12px] font-semibold disabled:opacity-50"
                      style={{ color: "var(--text-2)" }}
                      onClick={() =>
                        start(async () => {
                          await dismissAlertAction(item.id);
                          setFeedback(alertActionFeedback("dismissed"));
                        })
                      }
                    >
                      Dispensar
                    </button>
                  </>
                ) : null}
                {item.href ? (
                  <Link href={item.href} className="text-[12px] font-semibold" style={{ color: "var(--text-2)" }}>
                    Abrir recurso
                  </Link>
                ) : null}
                <Link
                  href={assistantHref(item.companyId, `Explique este alerta: ${item.title}`)}
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-3)" }}
                >
                  Explicar com IA
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
