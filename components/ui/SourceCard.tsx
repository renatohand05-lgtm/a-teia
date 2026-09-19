import { KNOWLEDGE_LABELS } from "@/lib/knowledge";
import type { KnowledgeKind } from "@prisma/client";

export function SourceCard({
  title,
  body,
  kind,
  url,
}: {
  title: string;
  body: string;
  kind?: KnowledgeKind;
  url?: string | null;
}) {
  return (
    <article className="surface-card px-3.5 py-3 text-[12px]" style={{ color: "var(--text-2)" }}>
      {kind ? (
        <p className="teia-eyebrow mb-1">{KNOWLEDGE_LABELS[kind]}</p>
      ) : null}
      <p className="font-semibold" style={{ color: "var(--text-1)" }}>
        {title}
      </p>
      <p className="mt-1 leading-relaxed">{body}</p>
      {url ? (
        <a href={url} className="mt-2 inline-block text-[11px] font-semibold" style={{ color: "var(--text-2)" }} rel="noreferrer" target="_blank">
          Abrir fonte
        </a>
      ) : null}
    </article>
  );
}
