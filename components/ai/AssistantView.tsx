"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { confirmAiProposalAction, rejectAiProposalAction } from "@/app/empresas/ai-actions";
import { EXECUTIVE_SHORTCUTS, EXTERNAL_SHORTCUTS, type ExecutiveAnswer, type ProposedAction } from "@/lib/ai-executive-engine";

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
  initialMessages = [],
  conversationId,
  providerReady,
  webSearchReady,
}: {
  companies: CompanyOption[];
  companyId?: string;
  companyName?: string;
  initialMessages?: ChatItem[];
  conversationId?: string;
  providerReady: boolean;
  webSearchReady: boolean;
}) {
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages);
  const [activeConversation, setActiveConversation] = useState(conversationId ?? "");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasCompany = Boolean(companyId || companies.length === 1);

  const selected = useMemo(
    () => companies.find((item) => item.id === companyId) ?? null,
    [companies, companyId],
  );

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    if (!companyId && companies.length !== 1) {
      setError("Selecione uma empresa para a IA usar dados reais.");
      return;
    }
    setError(null);
    setInput("");
    const userItem: ChatItem = { id: `local-${Date.now()}`, role: "USER", content: message, answer: null };
    setMessages((prev) => [...prev, userItem]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          companyId: companyId ?? companies[0]?.id,
          conversationId: activeConversation || undefined,
          useWebSearch,
        }),
      });
      const json = (await res.json()) as { error?: string; conversationId?: string; answer?: ExecutiveAnswer; content?: string };
      if (!res.ok) {
        setError(json.error ?? "Não foi possível responder.");
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
      setError("Falha de rede ao falar com o assistente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1480px] gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-2xl border p-4" style={{ borderColor: "rgba(232,191,122,.22)", background: "linear-gradient(145deg,#111216,#08090b)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--gold-soft)" }}>
            Assistente IA
          </p>
          <h2 className="mt-2 text-[20px] font-bold">Contexto da empresa</h2>
          {selected ? (
            <p className="mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
              Analisando <b style={{ color: "var(--text-1)" }}>{selected.name}</b>. A IA só vê dados desta carteira.
            </p>
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
            {providerReady
              ? "Provedor configurado no servidor. Fatos continuam determinísticos."
              : "IA indisponível — credencial não configurada. O briefing determinístico segue ativo."}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
            {webSearchReady
              ? "Pesquisa web disponível quando a pergunta exigir fonte externa."
              : "Pesquisa externa indisponível — credencial Tavily não configurada. Dados internos seguem ativos."}
          </p>
        </section>
        <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
            Atalhos executivos
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {EXECUTIVE_SHORTCUTS.map((item) => (
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
        <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
            Inteligência externa
          </p>
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
          </div>
        </section>
      </aside>

      <section className="rounded-[24px] border p-4 sm:p-6" style={{ borderColor: "rgba(232,191,122,.18)", background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))" }}>
        <div className="mb-4">
          <h1 className="m-0 text-[24px] font-bold">Perguntar à A TEIA</h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
            {companyName ? `Conversa sobre ${companyName}.` : "A IA não inventa dados. Sem contexto, ela pede a empresa."}
          </p>
        </div>

        <div className="flex min-h-[420px] flex-col gap-3 overflow-auto rounded-2xl border p-3" style={{ background: "rgba(0,0,0,.28)", borderColor: "var(--border)" }}>
          {messages.length === 0 ? (
            <p className="m-auto max-w-[520px] text-center text-[13px]" style={{ color: "var(--text-3)" }}>
              Pergunte pelo gargalo, financeiro, oportunidades, execução, experimentos, evidências ou memória. Cada afirmação vem classificada.
            </p>
          ) : null}
          {messages.map((item) => (
            <MessageBubble
              key={item.id}
              item={item}
              reviewId={reviewId}
              pending={pending}
              onReview={setReviewId}
              onConfirm={(id) => startTransition(() => confirmAiProposalAction(id))}
              onReject={(id) => startTransition(() => rejectAiProposalAction(id))}
            />
          ))}
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
            className="min-h-[78px] resize-y rounded-[14px] border px-3.5 py-3 text-[13px] outline-none"
            style={{ background: "rgba(255,255,255,.045)", borderColor: "var(--border)", color: "var(--text-1)" }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={busy}
            className="min-w-[120px] rounded-[14px] px-4 font-extrabold text-[#241a08] disabled:opacity-45"
            style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}
          >
            {busy ? "..." : "Perguntar"}
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
  reviewId,
  pending,
  onReview,
  onConfirm,
  onReject,
}: {
  item: ChatItem;
  reviewId: string | null;
  pending: boolean;
  onReview: (id: string | null) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [showSources, setShowSources] = useState(false);
  if (item.role === "USER") {
    return (
      <div className="max-w-[80%] self-end rounded-2xl px-3.5 py-3 text-[13px] font-semibold text-[#241a08]" style={{ background: "linear-gradient(135deg, var(--gold-soft), var(--gold-deep))" }}>
        {item.content}
      </div>
    );
  }
  const answer = item.answer;
  return (
    <div className="max-w-[92%] self-start space-y-3 rounded-2xl border p-3.5" style={{ background: "rgba(255,255,255,.05)", borderColor: "var(--border)" }}>
      {answer?.researchUsed ? (
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          Pesquisa externa utilizada
        </p>
      ) : null}
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{answer?.summary ?? item.content}</p>
      {answer?.unavailableReason ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {answer.unavailableReason}
        </p>
      ) : null}
      {answer?.researchUnavailable ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {answer.researchUnavailable}
        </p>
      ) : null}
      {answer?.temporalWarning ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {answer.temporalWarning}
        </p>
      ) : null}
      {answer?.researchDebug ? (
        <pre className="overflow-auto rounded-lg p-2 text-[10px]" style={{ background: "rgba(0,0,0,.35)", color: "var(--text-3)" }}>
          {`queryOriginal: ${answer.researchDebug.queryOriginal}
queryExpanded: ${answer.researchDebug.queryExpanded}
resultsReceived: ${answer.researchDebug.resultsReceived}
resultsAccepted: ${answer.researchDebug.resultsAccepted}
resultsRejected: ${answer.researchDebug.resultsRejected.join(" | ") || "—"}`}
        </pre>
      ) : null}
      {answer ? <AnswerBlocks answer={answer} /> : null}
      {answer?.externalSources.length ? (
        <div>
          <button
            type="button"
            onClick={() => setShowSources((value) => !value)}
            className="text-[11px] font-extrabold"
            style={{ color: "var(--gold-soft)" }}
          >
            {showSources ? "Ocultar fontes" : "Ver fontes"}
          </button>
          {showSources ? (
            <div className="mt-2 grid gap-2">
              {answer.externalSources.map((source) => (
                <article key={`${source.url ?? source.title}-${source.rank}`} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,.03)" }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
                    Fonte · {source.confidenceLabel}
                  </p>
                  <p className="mt-1 text-[13px] font-bold">{source.title}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {source.domain ?? "domínio indisponível"}
                    {source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : " · sem data"}
                  </p>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-bold" style={{ color: "var(--gold-soft)" }}>
                      Abrir fonte
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
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
    { title: "Dados da empresa", items: answer.data.map((item) => `${item.kind} · ${item.text}`) },
    { title: "Evidências internas", items: answer.evidence.map((item) => `${item.kind} · ${item.text}`) },
    { title: "Inteligência externa", items: answer.external.map((item) => `${item.sourceLabel} · ${item.text}`) },
    { title: "Análise", items: answer.inferences.map((item) => `${item.kind} · ${item.text}`) },
    { title: "Hipóteses", items: answer.hypotheses.map((item) => `${item.kind} · ${item.text}`) },
  ].filter((block) => block.items.length);
  return (
    <div className="space-y-2">
      {answer.divergent && answer.divergenceNote ? (
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          {answer.divergenceNote}
        </p>
      ) : null}
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
      {answer.sources.length ? (
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Fontes internas: {answer.sources.map((source) => `${source.kind} (${source.label})`).join(" · ")}
        </p>
      ) : null}
      {answer.nextActions.length ? (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
            Próximas ações sugeridas
          </p>
          <ul className="mt-1 space-y-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {answer.nextActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
        Ação sugerida
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
