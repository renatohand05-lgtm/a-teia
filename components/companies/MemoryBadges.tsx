import {
  MEMORY_CONFIDENCE_LABELS,
  MEMORY_ORIGIN_LABELS,
  MEMORY_POLARITY_LABELS,
  MEMORY_STATUS_LABELS,
  familyLabel,
  type MemoryConfidenceLevel,
  type MemoryOrigin,
  type MemoryPolarity,
  type MemoryStatus,
} from "@/lib/memory-engine";

export function MemoryOriginBadge({ origin }: { origin: MemoryOrigin | string }) {
  return <Badge text={MEMORY_ORIGIN_LABELS[origin as MemoryOrigin] ?? origin} />;
}

export function MemoryStatusBadge({ status }: { status: MemoryStatus | string }) {
  return <Badge text={MEMORY_STATUS_LABELS[status as MemoryStatus] ?? status} />;
}

export function MemoryPolarityBadge({ polarity }: { polarity: MemoryPolarity | string | null }) {
  if (!polarity) return <Badge text="Sem classificação" />;
  return <Badge text={MEMORY_POLARITY_LABELS[polarity as MemoryPolarity] ?? polarity} />;
}

export function MemoryConfidenceBadge({ confidence }: { confidence: MemoryConfidenceLevel | string }) {
  return <Badge text={`Confiança ${MEMORY_CONFIDENCE_LABELS[confidence as MemoryConfidenceLevel] ?? confidence}`} />;
}

export function MemoryFamilyBadge({ family }: { family: string | null }) {
  return <Badge text={familyLabel(family)} />;
}

function Badge({ text }: { text: string }) {
  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em]"
      style={{ borderColor: "var(--border)", color: "var(--gold-soft)" }}
    >
      {text}
    </span>
  );
}
