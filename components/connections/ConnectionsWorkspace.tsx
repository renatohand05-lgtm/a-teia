"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import {
  CONNECTION_CLASSIFICATIONS,
  CONNECTION_STATUSES,
  CONNECTION_TYPES,
  connectionClassLabel,
  connectionStatusLabel,
  connectionTypeLabel,
  displayConnectionScore,
} from "@/lib/connection-engine";
import { prepareConnectionMap, mapScaleForCount } from "@/lib/connection-map";
import type { ConnectionDTO } from "@/services/connectionService";

export type ConnectionNode = {
  id: string;
  name: string;
  segment: string | null;
  bottleneck: string | null;
  diagnosisScore: number | null;
  opportunities: Array<{ id: string; title: string }>;
  memories: Array<{ id: string; title: string }>;
};

type Kpis = {
  companies: number;
  suggested: number;
  analysis: number;
  testing: number;
  validated: number;
  strategies: number;
};

const STATUS_TONE: Record<string, string> = {
  SUGERIDA: "rgba(255,255,255,.35)",
  EM_ANALISE: "#8cb4ff",
  APROVADA: "var(--gold-soft)",
  EM_TESTE: "#e8bf7a",
  VALIDADA: "#8fe3ab",
  REJEITADA: "rgba(224,86,76,.7)",
  ARQUIVADA: "rgba(255,255,255,.2)",
};

export function ConnectionsWorkspace({
  connections,
  companies,
  kpis,
  filters,
}: {
  connections: ConnectionDTO[];
  companies: ConnectionNode[];
  kpis: Kpis;
  filters: Record<string, string | undefined>;
}) {
  const [mode, setMode] = useState<"mapa" | "lista">("mapa");
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hideLow, setHideLow] = useState(true);
  const [zoom, setZoom] = useState(1);
  const node = companies.find((item) => item.id === nodeId) ?? null;
  const edge = connections.find((item) => item.id === edgeId) ?? null;
  const persistedIds = useMemo(() => new Set(connections.map((item) => item.id)), [connections]);
  const prepared = useMemo(
    () =>
      prepareConnectionMap({
        companies,
        connections: connections.filter((item) => persistedIds.has(item.id)),
        focusId: filters.empresa && filters.empresa !== "ALL" ? filters.empresa : null,
        search,
        hideLowRelevance: hideLow,
      }),
    [companies, connections, filters.empresa, hideLow, persistedIds, search],
  );

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--gold-soft)" }}>
          Conexões
        </p>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">Mapa da Teia</h1>
        <p className="max-w-[720px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Descubra onde empresas, aprendizados e oportunidades podem gerar valor em conjunto.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Empresas" value={kpis.companies} />
        <Kpi label="Conexões sugeridas" value={kpis.suggested} />
        <Kpi label="Em análise" value={kpis.analysis} />
        <Kpi label="Em teste" value={kpis.testing} />
        <Kpi label="Validadas" value={kpis.validated} />
        <Kpi label="Estratégias geradas" value={kpis.strategies} />
      </div>

      <form className="flex flex-wrap gap-2 text-[12px]" action="/conexoes">
        <select name="empresa" defaultValue={filters.empresa ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Todas as empresas</option>
          {companies.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select name="tipo" defaultValue={filters.tipo ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Todos os tipos</option>
          {CONNECTION_TYPES.map((item) => (
            <option key={item} value={item}>{connectionTypeLabel(item)}</option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Todos os status</option>
          {CONNECTION_STATUSES.map((item) => (
            <option key={item} value={item}>{connectionStatusLabel(item)}</option>
          ))}
        </select>
        <select name="classificacao" defaultValue={filters.classificacao ?? "ALL"} className="rounded-lg border bg-transparent px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <option value="ALL">Todas as origens</option>
          {CONNECTION_CLASSIFICATIONS.map((item) => (
            <option key={item} value={item}>{connectionClassLabel(item)}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border px-3 py-2 font-bold" style={{ borderColor: "var(--border)" }}>
          Filtrar
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setMode("mapa")} className="hidden rounded-full px-3 py-1.5 text-[12px] font-bold md:inline" style={mode === "mapa" ? goldChip : ghostChip}>
          Mapa
        </button>
        <button type="button" onClick={() => setMode("lista")} className="rounded-full px-3 py-1.5 text-[12px] font-bold" style={mode === "lista" ? goldChip : ghostChip}>
          Lista
        </button>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar empresa ou segmento"
          className="min-w-[180px] flex-1 rounded-lg border bg-transparent px-3 py-2 text-[12px]"
          style={{ borderColor: "var(--border)" }}
        />
        <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
          <input type="checkbox" checked={hideLow} onChange={(event) => setHideLow(event.target.checked)} />
          Esconder baixa relevância
        </label>
      </div>
      <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{prepared.hint}</p>

      <div className="md:hidden">
        <ConnectionTable connections={connections} />
      </div>
      <div className="hidden md:block">
        {mode === "mapa" ? (
          <NetworkMap
            companies={prepared.nodes.map((item) => companies.find((company) => company.id === item.id)).filter((item): item is ConnectionNode => Boolean(item))}
            clusters={prepared.clusters}
            connections={prepared.edges.map((item) => connections.find((row) => row.id === item.id)).filter((item): item is ConnectionDTO => Boolean(item))}
            zoom={zoom}
            onZoom={setZoom}
            onNode={setNodeId}
            onEdge={setEdgeId}
          />
        ) : (
          <ConnectionTable connections={connections} />
        )}
      </div>

      <Drawer open={Boolean(node)} title={node?.name ?? "Empresa"} onClose={() => setNodeId(null)}>
        {node ? (
          <div className="space-y-3 text-[13px]" style={{ color: "var(--text-2)" }}>
            <p>Segmento: {node.segment || "Não informado"}</p>
            <p>Diagnóstico: {node.diagnosisScore != null ? node.diagnosisScore : "Sem dados"}</p>
            <p>Principais gargalos: {node.bottleneck || "Sem dados"}</p>
            <p>Oportunidades: {node.opportunities.length ? node.opportunities.map((item) => item.title).join(" · ") : "Sem dados"}</p>
            <p>Memórias: {node.memories.length ? node.memories.map((item) => item.title).join(" · ") : "Sem dados"}</p>
            <Link href={`/empresas/${node.id}`} className="inline-flex font-bold" style={{ color: "var(--gold-soft)" }}>
              Abrir empresa
            </Link>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={Boolean(edge)} title="Conexão" onClose={() => setEdgeId(null)}>
        {edge ? (
          <div className="space-y-3 text-[13px]" style={{ color: "var(--text-2)" }}>
            <p>{edge.fromName} → {edge.toName}</p>
            <p>Tipo: {connectionTypeLabel(edge.type)}</p>
            <p>Score: {displayConnectionScore(edge.score, edge.scorePartial).value} · {displayConnectionScore(edge.score, edge.scorePartial).caption}</p>
            <p>Classificação: {connectionClassLabel(edge.classification)}</p>
            <p>Por que existe: {edge.hypothesis || "Hipótese operacional persistida."}</p>
            <p>Dados usados: {edge.usedCompanyFields.join(", ") || "Sem dados"}</p>
            <p>Limitações: {edge.limitations}</p>
            <p>Próxima ação: {edge.nextAction}</p>
            <Link href={`/conexoes/${edge.id}`} className="inline-flex font-bold" style={{ color: "var(--gold-soft)" }}>
              Abrir detalhe
            </Link>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="mt-1 text-[22px] font-black tabular-nums">{value}</p>
    </div>
  );
}

function NetworkMap({
  companies,
  clusters,
  connections,
  zoom,
  onZoom,
  onNode,
  onEdge,
}: {
  companies: ConnectionNode[];
  clusters: Array<{ key: string; label: string; count: number }>;
  connections: ConnectionDTO[];
  zoom: number;
  onZoom: (value: number) => void;
  onNode: (id: string) => void;
  onEdge: (id: string) => void;
}) {
  const scale = mapScaleForCount(companies.length + clusters.length);
  const size = scale.size;
  const cx = size / 2;
  const cy = size / 2;
  const markers = [
    ...companies.map((company) => ({ kind: "company" as const, ...company })),
    ...clusters.map((cluster) => ({ kind: "cluster" as const, id: `cluster-${cluster.key}`, name: `${cluster.label} (${cluster.count})`, segment: cluster.label, bottleneck: null, diagnosisScore: null, opportunities: [], memories: [] })),
  ];
  const radius = markers.length <= 1 ? 0 : scale.radius;
  const points = markers.map((item, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(markers.length, 1) - Math.PI / 2;
    return { ...item, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  const byId = new Map(points.filter((item) => item.kind === "company").map((item) => [item.id, item]));

  if (!companies.length) {
    return (
      <div className="surface-card p-6 text-[13px]" style={{ color: "var(--text-2)" }}>
        Cadastre empresas reais para montar o mapa. Nenhuma ligação é inventada.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-[12px]">
        <button type="button" className="rounded-lg border px-2 py-1" style={{ borderColor: "var(--border)" }} onClick={() => onZoom(Math.min(2.2, zoom + 0.2))}>Zoom +</button>
        <button type="button" className="rounded-lg border px-2 py-1" style={{ borderColor: "var(--border)" }} onClick={() => onZoom(Math.max(0.6, zoom - 0.2))}>Zoom −</button>
        <button type="button" className="rounded-lg border px-2 py-1" style={{ borderColor: "var(--border)" }} onClick={() => onZoom(1)}>Fit</button>
        <button type="button" className="rounded-lg border px-2 py-1" style={{ borderColor: "var(--border)" }} onClick={() => onZoom(1)}>Reset</button>
      </div>
      <div className="overflow-auto rounded-[22px] border p-3" style={{ borderColor: "rgba(232,191,122,.2)", background: "radial-gradient(circle at 50% 45%, rgba(232,191,122,.08), #09090c 62%)" }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[720px]" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }} role="img" aria-label="Mapa persistido de conexões">
          {connections.map((item) => {
            const from = byId.get(item.fromId);
            const to = byId.get(item.toId);
            if (!from || !to) return null;
            return (
              <g key={item.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={STATUS_TONE[item.status] ?? "rgba(232,191,122,.45)"}
                  strokeWidth={item.status === "VALIDADA" ? 3 : 1.6}
                  strokeDasharray={item.status === "SUGERIDA" ? "6 6" : undefined}
                />
                <circle
                  cx={(from.x + to.x) / 2}
                  cy={(from.y + to.y) / 2}
                  r={8}
                  fill="#0c0d10"
                  stroke={STATUS_TONE[item.status] ?? "var(--gold-soft)"}
                  className="cursor-pointer"
                  onClick={() => onEdge(item.id)}
                />
              </g>
            );
          })}
          {points.map((item) => (
            <g key={item.id} className="cursor-pointer" onClick={() => item.kind === "company" ? onNode(item.id) : undefined}>
              <circle cx={item.x} cy={item.y} r={item.kind === "cluster" ? 22 : scale.nodeRadius} fill="#14151a" stroke="var(--gold)" strokeWidth="1.5" />
              <text x={item.x} y={item.y + 32} textAnchor="middle" fill="var(--text-1)" fontSize="11" fontWeight="700">
                {item.name.slice(0, 18)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function ConnectionTable({ connections }: { connections: ConnectionDTO[] }) {
  if (!connections.length) {
    return (
      <div className="surface-card p-6">
        <p className="font-bold">Nenhuma conexão persistida</p>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
          O mapa só mostra relações gravadas. Similaridade não inventa ligação.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border md:block" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead style={{ color: "var(--text-3)" }}>
            <tr className="text-[10px] uppercase tracking-[0.08em]">
              <th className="px-3 py-3">Origem</th>
              <th className="px-3 py-3">Destino</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Classificação</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Potencial</th>
              <th className="px-3 py-3">Próxima ação</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((item) => {
              const score = displayConnectionScore(item.score, item.scorePartial);
              return (
                <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-3">{item.fromName}</td>
                  <td className="px-3 py-3">{item.toName}</td>
                  <td className="px-3 py-3">{connectionTypeLabel(item.type)}</td>
                  <td className="px-3 py-3">{score.value}</td>
                  <td className="px-3 py-3">{connectionClassLabel(item.classification)}</td>
                  <td className="px-3 py-3">{connectionStatusLabel(item.status)}</td>
                  <td className="px-3 py-3">{item.potential == null ? "Sem dados" : item.potential}</td>
                  <td className="px-3 py-3">
                    <Link href={`/conexoes/${item.id}`} className="font-bold" style={{ color: "var(--gold-soft)" }}>
                      {item.nextAction || "Revisar"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {connections.map((item) => {
          const score = displayConnectionScore(item.score, item.scorePartial);
          return (
            <Link key={item.id} href={`/conexoes/${item.id}`} className="surface-card block p-4">
              <p className="font-bold">{item.fromName} → {item.toName}</p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                {connectionTypeLabel(item.type)} · {connectionStatusLabel(item.status)} · {score.value}
              </p>
              <p className="mt-2 text-[12px]" style={{ color: "var(--text-2)" }}>{item.nextAction || "Revisar"}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

const goldChip = {
  color: "#241a08",
  background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))",
};
const ghostChip = {
  color: "var(--text-2)",
  background: "rgba(255,255,255,.04)",
};
