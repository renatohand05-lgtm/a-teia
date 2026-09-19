"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { confirmAiProposalAction, rejectAiProposalAction } from "@/app/empresas/ai-actions";
import {
  EXTERNAL_SHORTCUTS,
  type ExecutiveAnswer,
  type ProposedAction,
} from "@/lib/ai-executive-engine";
import {
  PRIMARY_ASSISTANT_SHORTCUTS,
  type ConversationListItem,
  type CoverageChip,
  conversationDate,
  coverageMark,
  diagnosisCta,
  displaySourceType,
  divergenceCopy,
  friendlyAssistantError,
  loadingLabel,
  memoryTransferNote,
  primaryNextActions,
  primarySources,
  providerStatusCopy,
  webStatusCopy,
  whyFromAnswer,
} from "@/lib/assistant-ui";
import { AUTOMATION_SHORTCUTS, isAutomationQuestion } from "@/lib/automation-rules-engine";
import { ALLOCATION_SHORTCUTS, isAllocationQuestion } from "@/lib/resource-allocation-engine";

type CompanyOption = { id: string; name: string };

type ChatItem = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  answer: ExecutiveAnswer | null;
};

export function AssistantView({
  companies,
  companyId,
  companyName,
  companySegment,
  coverage = [],
  periodLabel,
  conversations = [],
  initialMessages = [],
  conversationId,
  providerReady,
  webSearchReady,
  initialPrompt,
}: {
  companies: CompanyOption[];
  companyId?: string;
  companyName?: string;
  companySegment?: string | null;
  coverage?: CoverageChip[];
  periodLabel?: string | null;
  conversations?: ConversationListItem[];
  initialMessages?: ChatItem[];
  conversationId?: string;
  providerReady: boolean;
  webSearchReady: boolean;
  initialPrompt?: string;
}) {
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages);
  const [activeConversation, setActiveConversation] = useState(conversationId ?? "");
  const [input, setInput] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [pending, startTransition] = useTransition();
  const sentInitial = useRef(false);
  const hasCompany = Boolean(companyId || companies.length === 1);
  const resolvedCompanyId = companyId ?? (companies.length === 1 ? companies[0]?.id : undefined);

  const selected = useMemo(
    () => companies.find((item) => item.id === companyId) ?? null,
    [companies, companyId],
  );

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    if (!companyId && companies.length !== 1 && !isAllocationQuestion(message) && !isAutomationQuestion(message) && !/onde|portf[oó]lio|empresas|aten[cç]|paradas|atrasad|fora da meta|faltam dados|mudou/i.test(message)) {
      setError("Selecione uma empresa ou pergunte sobre o portfólio.");
      return;
    }
    setError(null);
    setInput("");
    const userItem: ChatItem = { id: `local-${Date.now()}`, role: "USER", content: message, answer: null };
    setMessages((prev) => [...prev, userItem]);
    setBusy(true);
    setPhase(loadingLabel(useWebSearch));
    const organize = window.setTimeout(() => setPhase("Organizando análise…"), 1400);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          companyId: resolvedCompanyId,
          conversationId: activeConversation || undefined,
          useWebSearch,
        }),
      });
      const json = (await res.json()) as { error?: string; conversationId?: string; answer?: ExecutiveAnswer; content?: string };
      if (!res.ok) {
        setError(friendlyAssistantError(json.error ?? "Não foi possível responder."));
        return;
      }
      if (json.conversationId) setActiveConversation(json.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: json.conversationId ? `${json.conversationId}-${prev.length}` : `ai-${Date.now()}`,
          role: "ASSISTANT",
          content: json.content ?? json.answer?.summary ?? "Sem resposta.",
          answer: json.answer ?? null,
        },
      ]);
    } catch {
      setError(friendlyAssistantError("Falha de rede ao falar com o assistente."));
    } finally {
      window.clearTimeout(organize);
      setBusy(false);
      setPhase(null);
    }
  }

  useEffect(() => {
    if (!initialPrompt || sentInitial.current || !hasCompany) return;
    sentInitial.current = true;
    void send(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara uma vez o atalho do Cockpit/empresa
  }, [initialPrompt, hasCompany]);

  return (
    <div className="mx-auto grid max-w-[1480px] gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="min-w-0 space-y-4">
        <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
            Empresa analisada
          </p>
          {selected || companyName ? (
            <>
              <h2 className="mt-2 text-[20px] font-bold">{selected?.name ?? companyName}</h2>
              {companySegment ? (
                <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
                  {companySegment}
                </p>
              ) : null}
              {periodLabel ? (
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Período: {periodLabel}
                </p>
              ) : null}
              {coverage.length ? (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
                    Dados disponíveis
                  </p>
                  {coverage.map((item) => (
                    <p key={item.label} className="text-[12px]" style={{ color: "var(--text-2)" }}>
                      {item.label} {coverageMark(item.available)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                  A IA só vê dados desta carteira.
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                Selecione a empresa para montar o contexto real.
              </p>
              {companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/empresas/${company.id}/assistente`}
                  className="block rounded-xl border px-3 py-2 text-[13px] font-bold"
                  style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}
                >
                  {company.name}
                </Link>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
            {providerStatusCopy(providerReady)}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
            {webStatusCopy(webSearchReady)}
          </p>
        </section>

        {companyId ? (
          <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
                Conversas
              </p>
              <Link
                href={`/empresas/${companyId}/assistente?nova=1`}
                className="text-[11px] font-bold"
                style={{ color: "var(--gold-soft)" }}
              >
                Nova conversa
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {conversations.length === 0 ? (
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                  Nenhuma conversa nesta empresa.
                </p>
              ) : (
                conversations.map((item) => (
                  <Link
                    key={item.id}
                    href={`/empresas/${companyId}/assistente?conversa=${item.id}`}
                    className="rounded-xl border px-3 py-2 text-left"
                    style={{
                      borderColor: item.id === activeConversation ? "rgba(232,191,122,.35)" : "var(--border)",
                      color: "var(--text-2)",
                    }}
                  >
                    <span className="block truncate text-[12px] font-bold">{item.title || "Conversa"}</span>
                    <span className="block text-[10px]" style={{ color: "var(--text-3)" }}>
                      {companyName ?? "Empresa vinculada"} · {conversationDate(item.updatedAt || item.createdAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
            Perguntas rápidas
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {PRIMARY_ASSISTANT_SHORTCUTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={!hasCompany}
                onClick={() => void send(item.prompt)}
                className="rounded-xl border px-3 py-2 text-left text-[12px] font-bold disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <details className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <summary className="cursor-pointer text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
            Mais atalhos
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {EXTERNAL_SHORTCUTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={!hasCompany}
                onClick={() => void send(item.prompt)}
                className="rounded-xl border px-3 py-2 text-left text-[12px] font-bold disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                {item.label}
              </button>
            ))}
            {AUTOMATION_SHORTCUTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => void send(item.prompt)}
                className="rounded-xl border px-3 py-2 text-left text-[12px] font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                {item.label}
              </button>
            ))}
            {ALLOCATION_SHORTCUTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => void send(item.prompt)}
                className="rounded-xl border px-3 py-2 text-left text-[12px] font-bold"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
      </aside>

      <section className="min-w-0 rounded-[24px] border p-4 sm:p-6" style={{ borderColor: "rgba(232,191,122,.18)", background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))" }}>
        <div className="mb-4">
          <h1 className="m-0 text-[24px] font-bold">Perguntar à A TEIA</h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
            {companyName
              ? `O que está acontecendo em ${companyName}, por quê e o que analisar agora.`
              : "A IA não inventa dados. Sem contexto, ela pede a empresa."}
          </p>
        </div>

        <div className="flex min-h-[420px] flex-col gap-3 overflow-auto rounded-2xl border p-3" style={{ background: "rgba(0,0,0,.28)", borderColor: "var(--border)" }}>
          {messages.length === 0 && !busy ? (
            <p className="m-auto max-w-[520px] text-center text-[13px]" style={{ color: "var(--text-3)" }}>
              Pergunte pelo gargalo, financeiro, oportunidades, execução, experimentos, evidências ou memória. A resposta vem do que está persistido.
            </p>
          ) : null}
          {messages.map((item) => (
            <MessageBubble
              key={item.id}
              item={item}
              companyId={resolvedCompanyId}
              companyName={companyName}
              reviewId={reviewId}
              pending={pending}
              onReview={setReviewId}
              onConfirm={(id) => startTransition(() => confirmAiProposalAction(id))}
              onReject={(id) => startTransition(() => rejectAiProposalAction(id))}
            />
          ))}
          {busy ? (
            <p className="text-[12px]" style={{ color: "var(--gold-soft)" }}>
              {phase ?? loadingLabel(useWebSearch)}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 text-[12px]" style={{ color: "#f0a39c" }}>
            {error}
          </p>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex.: Onde devo agir primeiro?"
            className="min-h-[78px] min-w-0 resize-y rounded-[14px] border px-3.5 py-3 text-[13px] outline-none"
            style={{ background: "rgba(255,255,255,.045)", borderColor: "var(--border)", color: "var(--text-1)" }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={busy}
            className="min-w-[120px] rounded-[14px] px-4 font-extrabold text-[#241a08] disabled:opacity-45"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            {busy ? "Aguarde" : "Perguntar"}
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
          <input type="checkbox" checked={useWebSearch} onChange={(event) => setUseWebSearch(event.target.checked)} />
          Pesquisar também na web
        </label>
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Perguntas internas (faturamento, CMV, ranking) continuam só no banco. Fonte externa nunca vira evidência.
        </p>
      </section>
    </div>
  );
}

function MessageBubble({
  item,
  companyId,
  companyName,
  reviewId,
  pending,
  onReview,
  onConfirm,
  onReject,
}: {
  item: ChatItem;
  companyId?: string;
  companyName?: string;
  reviewId: string | null;
  pending: boolean;
  onReview: (id: string | null) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  if (item.role === "USER") {
    return (
      <div className="max-w-[80%] self-end rounded-2xl px-3.5 py-3 text-[13px] font-semibold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
        {item.content}
      </div>
    );
  }
  const answer = item.answer;
  const why = answer ? whyFromAnswer(answer) : null;
  const actions = answer ? primaryNextActions(answer.nextActions) : { primary: null, secondary: [] };
  const sources = answer ? primarySources(answer.externalSources) : [];
  const note = answer ? divergenceCopy(answer) : null;
  const diagnosis = answer ? diagnosisCta(companyId, answer.missing) : null;
  const fallback = answer?.provider === "deterministic" && answer.unavailableReason;

  return (
    <div className="max-w-[92%] min-w-0 self-start space-y-3 rounded-2xl border p-3.5" style={{ background: "rgba(255,255,255,.05)", borderColor: "var(--border)" }}>
      {answer?.researchUsed ? (
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Pesquisa externa utilizada
        </p>
      ) : null}

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Resposta direta
        </p>
        <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap">{answer?.summary ?? item.content}</p>
      </div>

      {why && why !== answer?.summary ? (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
            Por que
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {why}
          </p>
        </div>
      ) : null}

      {answer?.data.length || answer?.external.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {answer.data.length ? (
            <div className="min-w-0 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Seu negócio
              </p>
              <ul className="mt-1 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                {answer.data.slice(0, 4).map((row, index) => (
                  <li key={`biz-${index}`}>{row.text}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {answer.external.length || answer.researchUsed ? (
            <div className="min-w-0 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                Referência externa
              </p>
              {answer.external.length ? (
                <ul className="mt-1 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
                  {answer.external.slice(0, 4).map((row, index) => (
                    <li key={`ext-${index}`}>{row.text}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
                  Sem referência externa utilizada nesta conclusão.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {answer?.inferences.length ? (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
            Leitura da A TEIA
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {answer.inferences[0]?.text}
          </p>
        </div>
      ) : null}

      {note ? (
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          {note}
        </p>
      ) : null}

      {actions.primary ? (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
            Próxima ação
          </p>
          <p className="mt-1 text-[13px] font-semibold">{actions.primary}</p>
          {actions.secondary.map((itemAction) => (
            <p key={itemAction} className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
              {itemAction}
            </p>
          ))}
        </div>
      ) : null}

      {answer?.missing.length ? (
        <div>
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            {answer.missing.includes("diagnóstico 360°") && !answer.data.some((row) => /Score 360/i.test(row.text))
              ? "Esta empresa ainda não possui Diagnóstico 360°."
              : `Não há dado suficiente para responder com segurança em: ${answer.missing.join(", ")}.`}
          </p>
          {diagnosis ? (
            <Link href={diagnosis.href} className="mt-2 inline-block text-[12px] font-bold" style={{ color: "var(--gold-soft)" }}>
              {diagnosis.label}
            </Link>
          ) : null}
        </div>
      ) : null}

      {fallback ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Briefing determinístico a partir dos dados persistidos — não foi produzido por IA generativa.
        </p>
      ) : null}
      {answer?.unavailableReason ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {friendlyAssistantError(answer.unavailableReason)}
        </p>
      ) : null}
      {answer?.researchUnavailable ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {friendlyAssistantError(answer.researchUnavailable)}
        </p>
      ) : null}
      {answer?.temporalWarning ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {answer.temporalWarning}
        </p>
      ) : null}

      {answer?.data.some((row) => memoryTransferNote(row.text, companyName)) ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Aprendizado de outra operação. Origem e limitações aparecem no dado. Não é garantia de resultado aqui.
        </p>
      ) : null}

      {sources.length ? (
        <div className="grid gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
            Fontes / dados utilizados
          </p>
          {sources.map((source) => (
            <article key={`${source.url ?? source.title}-${source.rank}`} className="min-w-0 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                {displaySourceType(source)}
              </p>
              <p className="mt-1 truncate text-[13px] font-bold">{source.title}</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {source.domain ?? source.publisher ?? "domínio indisponível"}
                {source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ""}
              </p>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-bold" style={{ color: "var(--gold-soft)" }}>
                  Abrir fonte
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : answer?.sources.length ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Dados utilizados: {answer.sources.map((source) => `${source.kind} (${source.label})`).join(" · ")}
        </p>
      ) : null}

      {answer ? (
        <button
          type="button"
          onClick={() => setShowAnalysis((value) => !value)}
          className="text-[11px] font-extrabold"
          style={{ color: "var(--gold-soft)" }}
        >
          {showAnalysis ? "Ocultar classificação" : "Ver classificação"}
        </button>
      ) : null}
      {answer && showAnalysis ? <AnswerBlocks answer={answer} /> : null}

      {answer?.proposedActions.map((action) => (
        <ProposalCard
          key={action.id ?? action.title}
          action={action}
          reviewId={reviewId}
          pending={pending}
          onReview={onReview}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      ))}
    </div>
  );
}

function AnswerBlocks({ answer }: { answer: ExecutiveAnswer }) {
  const blocks = [
    { title: "Dado", items: answer.data.map((item) => item.text) },
    { title: "Inferência", items: answer.inferences.map((item) => item.text) },
    { title: "Hipótese", items: answer.hypotheses.map((item) => item.text) },
    { title: "Evidência", items: answer.evidence.map((item) => item.text) },
  ].filter((block) => block.items.length);
  return (
    <div className="space-y-2">
      {blocks.map((block) => (
        <div key={block.title}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
            {block.title}
          </p>
          <ul className="mt-1 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {block.items.map((item, index) => (
              <li key={`${block.title}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ProposalCard({
  action,
  reviewId,
  pending,
  onReview,
  onConfirm,
  onReject,
}: {
  action: ProposedAction;
  reviewId: string | null;
  pending: boolean;
  onReview: (id: string | null) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (!action.id) return null;
  const reviewing = reviewId === action.id;
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "rgba(232,191,122,.25)", background: "rgba(232,191,122,.08)" }}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
        Ação sugerida — humano decide
      </p>
      <p className="mt-1 text-[13px] font-bold">{action.title}</p>
      <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
        {action.rationale}
      </p>
      {!reviewing ? (
        <button
          type="button"
          onClick={() => onReview(action.id!)}
          className="mt-3 rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08]"
          style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
        >
          Revisar proposta
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(action.id!)}
            className="rounded-xl px-3 py-2 text-[12px] font-extrabold text-[#241a08] disabled:opacity-45"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            Confirmar criação
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              onReject(action.id!);
              onReview(null);
            }}
            className="rounded-xl border px-3 py-2 text-[12px] font-bold"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}
