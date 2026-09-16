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
    <div
      className="rounded-[14px] border px-3.5 py-3 text-[11.5px]"
      style={{ background: "rgba(255,255,255,.03)", borderColor: "var(--border)", color: "var(--text-2)" }}
    >
      <b className="mb-1 block" style={{ color: "var(--text-1)" }}>
        {title}
      </b>
      {kind ? (
        <span className="mb-1.5 inline-block text-[9px] font-extrabold tracking-[0.08em]" style={{ color: "var(--gold-soft)" }}>
          {KNOWLEDGE_LABELS[kind]}
        </span>
      ) : null}
      <p className="m-0 leading-relaxed">{body}</p>
      {url ? (
        <a href={url} className="mt-1 block break-all text-[10px]" style={{ color: "var(--blue-soft)" }}>
          {url}
        </a>
      ) : null}
    </div>
  );
}
