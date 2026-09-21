export const MAP_NODE_SOFT_LIMIT = 24;
export const MAP_NODE_HARD_LIMIT = 50;
export const MAP_LOW_RELEVANCE_SCORE = 40;

export type MapCompany = {
  id: string;
  name: string;
  segment: string | null;
};

export type MapEdge = {
  id: string;
  fromId: string;
  toId: string;
  status: string;
  score: number | null;
  scorePartial: boolean;
};

export type MapCluster = {
  key: string;
  label: string;
  count: number;
  companyIds: string[];
};

export type PreparedConnectionMap = {
  mode: "nodes" | "clustered";
  nodes: MapCompany[];
  clusters: MapCluster[];
  edges: MapEdge[];
  truncated: boolean;
  totalCompanies: number;
  shownCompanies: number;
  hiddenLowRelevance: number;
  preferList: boolean;
  hint: string;
};

export function isLowRelevanceEdge(edge: MapEdge): boolean {
  if (edge.status === "REJEITADA" || edge.status === "ARQUIVADA") return true;
  if (edge.score == null) return false;
  return edge.status === "SUGERIDA" && edge.score < MAP_LOW_RELEVANCE_SCORE;
}

export function clusterCompaniesBySegment(companies: MapCompany[]): MapCluster[] {
  const groups = new Map<string, MapCluster>();
  for (const company of companies) {
    const key = company.segment?.trim() || "sem-segmento";
    const current = groups.get(key) ?? { key, label: company.segment?.trim() || "Sem segmento", count: 0, companyIds: [] };
    current.count += 1;
    current.companyIds.push(company.id);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export function mapScaleForCount(count: number): { size: number; radius: number; nodeRadius: number } {
  if (count <= 1) return { size: 420, radius: 0, nodeRadius: 22 };
  if (count <= 5) return { size: 520, radius: 150, nodeRadius: 18 };
  if (count <= 20) return { size: 640, radius: 220, nodeRadius: 14 };
  return { size: 720, radius: 250, nodeRadius: 11 };
}

export function shouldPreferList(totalCompanies: number): boolean {
  return totalCompanies >= MAP_NODE_HARD_LIMIT;
}

export function prepareConnectionMap(input: {
  companies: MapCompany[];
  connections: MapEdge[];
  focusId?: string | null;
  search?: string | null;
  hideLowRelevance?: boolean;
  maxNodes?: number;
}): PreparedConnectionMap {
  const maxNodes = input.maxNodes ?? MAP_NODE_SOFT_LIMIT;
  const search = input.search?.trim().toLowerCase() ?? "";
  let nodes = input.companies.filter((company) => {
    if (!search) return true;
    return company.name.toLowerCase().includes(search) || (company.segment ?? "").toLowerCase().includes(search);
  });

  if (input.focusId) {
    const neighborIds = new Set<string>([input.focusId]);
    for (const edge of input.connections) {
      if (edge.fromId === input.focusId) neighborIds.add(edge.toId);
      if (edge.toId === input.focusId) neighborIds.add(edge.fromId);
    }
    nodes = nodes.filter((company) => neighborIds.has(company.id));
  }

  let edges = input.connections.filter((edge) => nodes.some((item) => item.id === edge.fromId) && nodes.some((item) => item.id === edge.toId));
  const low = edges.filter(isLowRelevanceEdge);
  if (input.hideLowRelevance) {
    edges = edges.filter((edge) => !isLowRelevanceEdge(edge));
  }

  const preferList = shouldPreferList(input.companies.length);
  if (nodes.length <= maxNodes) {
    return {
      mode: "nodes",
      nodes,
      clusters: [],
      edges,
      truncated: false,
      totalCompanies: input.companies.length,
      shownCompanies: nodes.length,
      hiddenLowRelevance: input.hideLowRelevance ? low.length : 0,
      preferList,
      hint: preferList ? "Carteira grande: use lista, busca e foco em empresa." : "Mapa mostra somente ligações persistidas.",
    };
  }

  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.fromId, (degree.get(edge.fromId) ?? 0) + 1);
    degree.set(edge.toId, (degree.get(edge.toId) ?? 0) + 1);
  }
  const ranked = [...nodes].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
  const keep = new Set<string>();
  if (input.focusId) keep.add(input.focusId);
  for (const company of ranked) {
    if (keep.size >= maxNodes) break;
    keep.add(company.id);
  }
  const visible = nodes.filter((company) => keep.has(company.id));
  const overflow = nodes.filter((company) => !keep.has(company.id));
  const clusters = clusterCompaniesBySegment(overflow);
  const visibleIds = new Set(visible.map((item) => item.id));
  return {
    mode: "clustered",
    nodes: visible,
    clusters,
    edges: edges.filter((edge) => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId)),
    truncated: true,
    totalCompanies: input.companies.length,
    shownCompanies: visible.length,
    hiddenLowRelevance: input.hideLowRelevance ? low.length : 0,
    preferList,
    hint: `Mostrando ${visible.length} de ${input.companies.length} empresas. Use busca, foco ou a lista.`,
  };
}

export function mapShowsOnlyPersisted(renderedIds: string[], persistedIds: string[]): boolean {
  const allowed = new Set(persistedIds);
  return renderedIds.every((id) => allowed.has(id));
}
