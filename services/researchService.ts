import "server-only";

import { createHash } from "node:crypto";
import { AuditSource, KnowledgeKind, ResearchStatus } from "@prisma/client";
import { type ExecutiveCompany, type ExecutiveFinance, type ProposedAction } from "@/lib/ai-executive-engine";
import { RESEARCH_LIMITS } from "@/lib/research-config";
import {
  buildResearchQuery,
  emptyResearchApply,
  isTemporalQuery,
  limitQueries,
  normalizeSource,
  proposeExternalOpportunity,
  shouldUseExternalResearch,
  wrapExternalAsData,
  type NormalizedSource,
  type ResearchApplyInput,
  type ResearchKind,
} from "@/lib/research-engine";
import { filterRelevantSources, hasTrustworthyBenchmark, selectSourcesForIntent } from "@/lib/research-filter";
import { appEnvironment } from "@/lib/release";
import { resolveWebSearchProvider } from "@/lib/research-providers";
import { IntegrationError, friendlyIntegrationMessage } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/services/auditService";

export type MarketIntelSummary = {
  recentResearchCount: number;
  recentSourceCount: number;
};

export type ResearchRunResult = ResearchApplyInput & {
  proposedOpportunity: ProposedAction | null;
  externalContext: string | null;
  researchDebug?: {
    queryOriginal: string;
    queryExpanded: string;
    resultsReceived: number;
    resultsAccepted: number;
    resultsRejected: string[];
  } | null;
};

function toRunResult(input: ResearchApplyInput): ResearchRunResult {
  return {
    ...input,
    proposedOpportunity: null,
    externalContext: null,
  };
}

function hashCacheKey(userId: string, companyId: string | undefined, query: string): string {
  return createHash("sha256")
    .update(`${userId}|${companyId ?? ""}|${query.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 32);
}

async function assertOwnedCompany(userId: string, companyId?: string | null) {
  if (!companyId) return;
  const company = await prisma.company.findFirst({ where: { id: companyId, ownerId: userId }, select: { id: true } });
  if (!company) throw new Error("Empresa não encontrada.");
}

export async function getResearchSession(userId: string, sessionId: string) {
  const session = await prisma.researchSession.findFirst({
    where: { id: sessionId, userId },
    include: { findings: true, company: { select: { ownerId: true } } },
  });
  if (!session) throw new Error("Pesquisa não encontrada.");
  if (session.company && session.company.ownerId !== userId) throw new Error("Pesquisa não encontrada.");
  return session;
}

export async function getRecentMarketIntel(ownerId: string): Promise<MarketIntelSummary> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.researchSession.findMany({
    where: {
      userId: ownerId,
      usedWeb: true,
      status: ResearchStatus.COMPLETED,
      createdAt: { gte: since },
    },
    select: { sourceCount: true },
  });
  return {
    recentResearchCount: sessions.length,
    recentSourceCount: sessions.reduce((sum, item) => sum + item.sourceCount, 0),
  };
}

export async function runExternalResearch(input: {
  userId: string;
  question: string;
  companyId?: string;
  conversationId?: string;
  forceWeb?: boolean;
  company?: ExecutiveCompany | null;
  finance?: ExecutiveFinance | null;
}): Promise<ResearchRunResult> {
  await assertOwnedCompany(input.userId, input.companyId);
  const decision = shouldUseExternalResearch({ question: input.question, forceWeb: input.forceWeb });

  if (!decision.use) {
    return toRunResult({
      ...emptyResearchApply(),
      skipped: true,
      researchKind: decision.researchKind,
      finance: input.finance,
      company: input.company,
    });
  }

  const plan = buildResearchQuery(input.question, input.company);
  const query = limitQueries([plan.query])[0] ?? null;
  if (!query) {
    return toRunResult({
      ...emptyResearchApply(),
      skipped: true,
      unavailable: "Consulta externa vazia após o limite de queries.",
      researchKind: decision.researchKind,
    });
  }

  const provider = resolveWebSearchProvider();
  await writeAudit({
    actorId: input.userId,
    action: "research.started",
    entity: "ResearchSession",
    newValue: {
      companyId: input.companyId ?? null,
      intent: decision.intent,
      provider: provider?.id ?? "none",
      queryLength: query.length,
    },
    origin: AuditSource.RESEARCH,
  });

  if (!provider) {
    const session = await prisma.researchSession.create({
      data: {
        userId: input.userId,
        companyId: input.companyId ?? null,
        conversationId: input.conversationId ?? null,
        question: input.question,
        query,
        provider: "none",
        status: ResearchStatus.FAILED,
        usedWeb: false,
        sourceCount: 0,
        skippedReason: "provider_unavailable",
        conclusion: friendlyIntegrationMessage("TAVILY_MISSING"),
        ranAt: new Date(),
      },
    });
    await writeAudit({
      actorId: input.userId,
      action: "research.failed",
      entity: "ResearchSession",
      entityId: session.id,
      newValue: { reason: "TAVILY_MISSING" },
      origin: AuditSource.RESEARCH,
    });
    return toRunResult({
      used: false,
      unavailable: friendlyIntegrationMessage("TAVILY_MISSING"),
      skipped: false,
      sources: [],
      query,
      researchKind: decision.researchKind,
      finance: input.finance,
      company: input.company,
      sessionId: session.id,
    });
  }

  const cacheKey = hashCacheKey(input.userId, input.companyId, query);
  const ttl = isTemporalQuery(query) ? RESEARCH_LIMITS.temporalCacheTtlMs : RESEARCH_LIMITS.cacheTtlMs;
  const cached = await prisma.researchSession.findFirst({
    where: {
      userId: input.userId,
      cacheKey,
      status: ResearchStatus.COMPLETED,
      usedWeb: true,
      createdAt: { gte: new Date(Date.now() - ttl) },
    },
    include: { findings: true },
    orderBy: { createdAt: "desc" },
  });

  if (cached) {
    const sources = refineHits(findingsToSources(cached.findings, query), plan);
    return bundleFromSources({
      sources: sources.selected,
      query,
      researchKind: decision.researchKind,
      finance: input.finance,
      company: input.company,
      sessionId: cached.id,
      cached: true,
      temporalWarning: isTemporalQuery(query)
        ? "Resultado em cache. Assunto pode ser temporal; a data da consulta está nas fontes."
        : null,
      trustworthyBenchmark: hasTrustworthyBenchmark(sources.selected),
      queryOriginal: plan.original,
      rejectedTitles: sources.rejected.map((item) => item.title),
      resultsReceived: sources.received,
    });
  }

  try {
    const raw = await provider.search(query);
    const accessedAt = new Date().toISOString();
    const normalized = raw
      .map((hit) => normalizeSource(hit, query, accessedAt))
      .filter((item): item is NormalizedSource => Boolean(item));
    const sources = refineHits(normalized, plan);
    const selected = sources.selected;
    const session = await prisma.researchSession.create({
      data: {
        userId: input.userId,
        companyId: input.companyId ?? null,
        conversationId: input.conversationId ?? null,
        question: input.question,
        query,
        cacheKey,
        provider: provider.id,
        status: ResearchStatus.COMPLETED,
        usedWeb: true,
        sourceCount: selected.length,
        conclusion: selected.length
          ? `Pesquisa externa concluída com ${selected.length} fonte(s) relevante(s) de ${normalized.length} recebida(s). Fonte externa não é evidência interna.`
          : "Pesquisa executada, mas nenhuma fonte relevante foi aproveitada.",
        ranAt: new Date(),
        findings: {
          create: selected.map((item) => ({
            kind: KnowledgeKind.EXTERNAL_SOURCE,
            title: item.title,
            url: item.url,
            body: item.snippet,
            snippet: item.snippet,
            publisher: item.publisher,
            domain: item.domain,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
            accessedAt: new Date(item.accessedAt),
            sourceType: item.sourceType,
            freshness: item.freshness,
            rank: item.rank,
            query: item.query,
          })),
        },
      },
    });
    await writeAudit({
      actorId: input.userId,
      action: "research.completed",
      entity: "ResearchSession",
      entityId: session.id,
      newValue: {
        provider: provider.id,
        received: normalized.length,
        accepted: selected.length,
        rejected: sources.rejected.length,
      },
      origin: AuditSource.RESEARCH,
    });
    return bundleFromSources({
      sources: selected,
      query,
      researchKind: decision.researchKind,
      finance: input.finance,
      company: input.company,
      sessionId: session.id,
      trustworthyBenchmark: hasTrustworthyBenchmark(selected),
      queryOriginal: plan.original,
      rejectedTitles: sources.rejected.map((item) => item.title),
      resultsReceived: sources.received,
    });
  } catch (error) {
    const code = error instanceof IntegrationError ? error.code : "TAVILY_PROVIDER_ERROR";
    const unavailable = friendlyIntegrationMessage(code);
    const session = await prisma.researchSession.create({
      data: {
        userId: input.userId,
        companyId: input.companyId ?? null,
        conversationId: input.conversationId ?? null,
        question: input.question,
        query,
        provider: provider.id,
        status: ResearchStatus.FAILED,
        usedWeb: false,
        sourceCount: 0,
        skippedReason: code,
        conclusion: unavailable,
        ranAt: new Date(),
      },
    });
    await writeAudit({
      actorId: input.userId,
      action: "research.failed",
      entity: "ResearchSession",
      entityId: session.id,
      newValue: { reason: code, status: error instanceof IntegrationError ? error.status : null },
      origin: AuditSource.RESEARCH,
    });
    return toRunResult({
      used: false,
      unavailable,
      skipped: false,
      sources: [],
      query,
      researchKind: decision.researchKind,
      finance: input.finance,
      company: input.company,
      sessionId: session.id,
    });
  }
}

function findingsToSources(
  findings: Array<{
    title: string;
    url: string | null;
    snippet: string | null;
    body: string | null;
    publisher: string | null;
    domain: string | null;
    publishedAt: Date | null;
    accessedAt: Date | null;
    sourceType: string | null;
    freshness: string | null;
    rank: number | null;
    query: string | null;
  }>,
  query: string,
): NormalizedSource[] {
  return findings
    .filter((item) => item.url)
    .map((item) => {
      const hit = {
        title: item.title,
        url: item.url ?? "",
        snippet: item.snippet ?? item.body ?? "",
        publishedAt: item.publishedAt?.toISOString() ?? null,
        publisher: item.publisher,
      };
      return normalizeSource(hit, item.query ?? query, item.accessedAt?.toISOString());
    })
    .filter((item): item is NormalizedSource => Boolean(item))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function refineHits(items: NormalizedSource[], plan: ReturnType<typeof buildResearchQuery>) {
  const filtered = filterRelevantSources(items, plan);
  const selected = selectSourcesForIntent(filtered.accepted, plan.intent);
  return {
    selected,
    rejected: [...filtered.rejected, ...filtered.accepted.slice(selected.length)],
    received: items.length,
  };
}

function bundleFromSources(input: {
  sources: NormalizedSource[];
  query: string;
  researchKind: ResearchKind;
  finance?: ExecutiveFinance | null;
  company?: ExecutiveCompany | null;
  sessionId: string;
  cached?: boolean;
  temporalWarning?: string | null;
  trustworthyBenchmark?: boolean;
  queryOriginal?: string | null;
  rejectedTitles?: string[];
  resultsReceived?: number;
}): ResearchRunResult {
  const applyInput: ResearchApplyInput = {
    used: true,
    unavailable: null,
    skipped: false,
    sources: input.sources,
    query: input.query,
    researchKind: input.researchKind,
    finance: input.finance,
    company: input.company,
    sessionId: input.sessionId,
    cached: input.cached,
    temporalWarning: input.temporalWarning ?? null,
    trustworthyBenchmark: input.trustworthyBenchmark,
    queryOriginal: input.queryOriginal ?? null,
    rejectedTitles: input.rejectedTitles ?? [],
  };
  const debug =
    appEnvironment() === "production"
      ? null
      : {
          queryOriginal: input.queryOriginal ?? input.query,
          queryExpanded: input.query,
          resultsReceived: input.resultsReceived ?? input.sources.length + (input.rejectedTitles?.length ?? 0),
          resultsAccepted: input.sources.length,
          resultsRejected: input.rejectedTitles ?? [],
        };
  return {
    ...applyInput,
    proposedOpportunity: proposeExternalOpportunity(input.company, input.sources, input.researchKind),
    externalContext: wrapExternalAsData({
      query: input.query,
      sources: input.sources.map((item) => ({
        title: item.title,
        url: item.url,
        domain: item.domain,
        publishedAt: item.publishedAt,
        accessedAt: item.accessedAt,
        snippet: item.snippet?.slice(0, 220),
        sourceType: item.sourceType,
      })),
    }),
    researchDebug: debug,
  };
}

/** Compatibilidade: persiste sessão sem disparar busca quando a pergunta é interna. */
export async function prepareResearch(input: {
  userId: string;
  question: string;
  companyId?: string;
  decisionId?: string;
  depth?: "quick" | "deep";
}) {
  await assertOwnedCompany(input.userId, input.companyId);
  const decision = shouldUseExternalResearch({ question: input.question });
  const session = await prisma.researchSession.create({
    data: {
      userId: input.userId,
      companyId: input.companyId,
      decisionId: input.decisionId,
      question: input.question,
      depth: input.depth ?? "deep",
      status: ResearchStatus.PREPARED,
      usedWeb: false,
      skippedReason: decision.use ? null : "internal_only",
      conclusion: decision.use
        ? "Pesquisa registrada. A busca dispara no Assistente quando o provedor estiver configurado."
        : decision.reason,
    },
  });
  return {
    sessionId: session.id,
    status: session.status,
    liveSearch: Boolean(resolveWebSearchProvider()),
    question: session.question,
    conclusion: session.conclusion ?? "",
    findings: [],
  };
}
