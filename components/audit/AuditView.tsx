"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/States";
import { auditOriginLabel, presentAuditMetadata } from "@/lib/audit-detail";
import {
  EMPTY_AUDIT,
  auditActionLabel,
  auditCategoryLabel,
  auditEntityLabel,
  auditResourceHref,
  buildAuditSearch,
  type AuditUrlFilters,
} from "@/lib/audit-ui";
import { formatDateTimeBR } from "@/lib/format";

export type AuditEventView = {
  id: string;
  createdAt: string;
  actorName: string;
  companyId: string | null;
  companyName: string | null;
  category: string;
  action: string;
  entity: string;
  entityId: string | null;
  success: boolean;
  origin: string;
  metadata: unknown;
};

export function AuditView({
  events,
  companies,
  filters = {},
}: {
  events: AuditEventView[];
  companies: { id: string; name: string }[];
  filters?: AuditUrlFilters;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(filters.empresa ?? "");
  const [category, setCategory] = useState(filters.categoria ?? "");
  const [action, setAction] = useState(filters.acao ?? "");
  const [actor, setActor] = useState(filters.usuario ?? "");
  const [from, setFrom] = useState(filters.de ?? "");
  const [to, setTo] = useState(filters.ate ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function persist(next: AuditUrlFilters) {
    router.replace(buildAuditSearch(next), { scroll: false });
  }

  const categories = useMemo(() => Array.from(new Set(events.map((item) => item.category))).sort(), [events]);
  const actions = useMemo(() => Array.from(new Set(events.map((item) => item.action))).sort(), [events]);
  const actors = useMemo(() => Array.from(new Set(events.map((item) => item.actorName))).sort(), [events]);

  const filtered = events.filter((item) => {
    if (companyId && item.companyName !== companies.find((company) => company.id === companyId)?.name) return false;
    if (category && item.category !== category) return false;
    if (action && item.action !== action) return false;
    if (actor && item.actorName !== actor) return false;
    if (from && new Date(item.createdAt) < new Date(from)) return false;
    if (to && new Date(item.createdAt) > new Date(`${to}T23:59:59`)) return false;
    return true;
  });

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <section className="rounded-[24px] border p-6" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
          Auditoria
        </p>
        <h1 className="mt-2 text-[26px] font-bold">Quem fez o quê, quando e em qual recurso?</h1>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Filter label="Período inicial">
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              persist({ empresa: companyId, categoria: category, acao: action, usuario: actor, de: event.target.value, ate: to });
            }}
            className="w-full bg-transparent text-[13px]"
          />
        </Filter>
        <Filter label="Período final">
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              persist({ empresa: companyId, categoria: category, acao: action, usuario: actor, de: from, ate: event.target.value });
            }}
            className="w-full bg-transparent text-[13px]"
          />
        </Filter>
        <Filter label="Empresa">
          <select
            value={companyId}
            aria-label="Empresa"
            onChange={(event) => {
              setCompanyId(event.target.value);
              persist({ empresa: event.target.value, categoria: category, acao: action, usuario: actor, de: from, ate: to });
            }}
            className="w-full bg-transparent text-[13px]"
          >
            <option value="">Todas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </Filter>
        <Filter label="Usuário">
          <select
            value={actor}
            aria-label="Usuário"
            onChange={(event) => {
              setActor(event.target.value);
              persist({ empresa: companyId, categoria: category, acao: action, usuario: event.target.value, de: from, ate: to });
            }}
            className="w-full bg-transparent text-[13px]"
          >
            <option value="">Todos</option>
            {actors.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </Filter>
        <Filter label="Categoria">
          <select
            value={category}
            aria-label="Categoria"
            onChange={(event) => {
              setCategory(event.target.value);
              persist({ empresa: companyId, categoria: event.target.value, acao: action, usuario: actor, de: from, ate: to });
            }}
            className="w-full bg-transparent text-[13px]"
          >
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>{auditCategoryLabel(item)}</option>
            ))}
          </select>
        </Filter>
        <Filter label="Ação">
          <select
            value={action}
            aria-label="Ação"
            onChange={(event) => {
              setAction(event.target.value);
              persist({ empresa: companyId, categoria: category, acao: event.target.value, usuario: actor, de: from, ate: to });
            }}
            className="w-full bg-transparent text-[13px]"
          >
            <option value="">Todas</option>
            {actions.map((item) => (
              <option key={item} value={item}>{auditActionLabel(item)}</option>
            ))}
          </select>
        </Filter>
      </section>

      {filtered.length === 0 ? (
        <EmptyState title={EMPTY_AUDIT.title} body={EMPTY_AUDIT.body} />
      ) : (
        <div>
          <div className="hidden overflow-hidden rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
            <table className="teia-table">
              <thead style={{ color: "var(--text-3)" }}>
                <tr className="border-b text-[10px] uppercase tracking-[0.08em]" style={{ borderColor: "var(--border)" }}>
                  <th className="px-4 py-3">Data/hora</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className="cursor-pointer border-b last:border-0"
                    style={{
                      borderColor: "var(--border)",
                      background: selected?.id === item.id ? "rgba(232,191,122,0.08)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTimeBR(item.createdAt)}</td>
                    <td className="px-4 py-3">{item.actorName}</td>
                    <td className="px-4 py-3">{auditActionLabel(item.action)}</td>
                    <td className="px-4 py-3">{auditEntityLabel(item.entity)}</td>
                    <td className="px-4 py-3">{item.companyName ?? "—"}</td>
                    <td className="px-4 py-3">{item.success ? "Sucesso" : "Falha"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="rounded-2xl border px-3 py-3 text-left"
                style={{ borderColor: selected?.id === item.id ? "rgba(232,191,122,.35)" : "var(--border)" }}
              >
                <p className="text-[13px] font-bold">{auditActionLabel(item.action)}</p>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  {item.actorName} · {item.companyName ?? "Sem empresa"} · {item.success ? "Sucesso" : "Falha"}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{formatDateTimeBR(item.createdAt)}</p>
              </button>
            ))}
          </div>

          <Drawer open={Boolean(selectedId && selected)} title="Detalhe do evento" onClose={() => setSelectedId(null)}>
            {selected ? (
              <div className="space-y-3">
                <Detail label="Data/hora" value={formatDateTimeBR(selected.createdAt)} />
                <Detail label="Ator" value={selected.actorName} />
                <Detail label="Empresa" value={selected.companyName ?? "—"} />
                <Detail label="Ação" value={auditActionLabel(selected.action)} />
                <Detail label="Recurso" value={auditEntityLabel(selected.entity)} />
                <Detail label="Resultado" value={selected.success ? "Sucesso" : "Falha"} />
                <Detail label="Origem" value={auditOriginLabel(selected.origin)} />
                {auditResourceHref({ entity: selected.entity, entityId: selected.entityId, companyId: selected.companyId }) ? (
                  <Link
                    href={auditResourceHref({ entity: selected.entity, entityId: selected.entityId, companyId: selected.companyId }) ?? "/auditoria"}
                    className="inline-flex text-[12px] font-bold"
                    style={{ color: "var(--gold-soft)" }}
                  >
                    Abrir recurso
                  </Link>
                ) : null}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
                    Metadata
                  </p>
                  {presentAuditMetadata(selected.metadata).length ? (
                    <dl className="mt-2 space-y-2">
                      {presentAuditMetadata(selected.metadata).map((item) => (
                        <div key={item.key}>
                          <dt className="text-[11px]" style={{ color: "var(--text-3)" }}>{item.key}</dt>
                          <dd className="text-[13px]" style={{ color: "var(--text-1)" }}>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-1 text-[13px]" style={{ color: "var(--text-3)" }}>Sem metadata adicional.</p>
                  )}
                </div>
              </div>
            ) : null}
          </Drawer>
        </div>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="rounded-2xl border px-3 py-2" style={{ borderColor: "var(--border)" }}>
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
        {value}
      </p>
    </div>
  );
}
