"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/States";

export type AuditEventView = {
  id: string;
  createdAt: string;
  actorName: string;
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
}: {
  events: AuditEventView[];
  companies: { id: string; name: string }[];
}) {
  const [companyId, setCompanyId] = useState("");
  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(events.map((item) => item.category))).sort(), [events]);
  const actions = useMemo(() => Array.from(new Set(events.map((item) => item.action))).sort(), [events]);

  const filtered = events.filter((item) => {
    if (companyId && item.companyName !== companies.find((company) => company.id === companyId)?.name) return false;
    if (category && item.category !== category) return false;
    if (action && item.action !== action) return false;
    if (result === "ok" && !item.success) return false;
    if (result === "fail" && item.success) return false;
    if (from && new Date(item.createdAt) < new Date(from)) return false;
    if (to && new Date(item.createdAt) > new Date(`${to}T23:59:59`)) return false;
    return true;
  });

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Filter label="Período inicial">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-full bg-transparent text-[13px]" />
        </Filter>
        <Filter label="Período final">
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-full bg-transparent text-[13px]" />
        </Filter>
        <Filter label="Empresa">
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="w-full bg-transparent text-[13px]">
            <option value="">Todas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label="Categoria">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full bg-transparent text-[13px]">
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label="Evento">
          <select value={action} onChange={(event) => setAction(event.target.value)} className="w-full bg-transparent text-[13px]">
            <option value="">Todos</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label="Resultado">
          <select value={result} onChange={(event) => setResult(event.target.value)} className="w-full bg-transparent text-[13px]">
            <option value="">Todos</option>
            <option value="ok">Sucesso</option>
            <option value="fail">Falha</option>
          </select>
        </Filter>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum evento de auditoria"
          body="Quando houver logins, decisões, alocações, automações ou consultas da IA, o histórico aparece aqui."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-left text-[12.5px]">
              <thead style={{ color: "var(--text-3)" }}>
                <tr className="border-b text-[10px] uppercase tracking-[0.08em]" style={{ borderColor: "var(--border)" }}>
                  <th className="px-4 py-3">Data/hora</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Recurso</th>
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
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{item.actorName}</td>
                    <td className="px-4 py-3">{item.companyName ?? "—"}</td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">{item.action}</td>
                    <td className="px-4 py-3">{item.entity}</td>
                    <td className="px-4 py-3">{item.success ? "Sucesso" : "Falha"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <aside className="rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Detalhe do evento
              </p>
              <Detail label="Actor" value={selected.actorName} />
              <Detail label="Action" value={selected.action} />
              <Detail label="Resource" value={`${selected.entity}${selected.entityId ? ` · ${selected.entityId}` : ""}`} />
              <Detail label="Company" value={selected.companyName ?? "—"} />
              <Detail label="Timestamp" value={new Date(selected.createdAt).toLocaleString("pt-BR")} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
                  Metadata
                </p>
                <pre className="mt-1 overflow-auto rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-2)" }}>
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </aside>
          ) : null}
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
