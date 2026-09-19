import Link from "next/link";
import {
  MemoryConfidenceBadge,
  MemoryFamilyBadge,
  MemoryOriginBadge,
  MemoryPolarityBadge,
  MemoryStatusBadge,
} from "@/components/companies/MemoryBadges";
import { formatDateBR } from "@/lib/format";
import { memoryValidationLabel, transferabilityCopy } from "@/lib/memory-ui";
import type { MemoryDTO } from "@/services/memoryService";
import type { RelatedMemoryDTO } from "@/services/memoryService";

export function MemoryCard({
  href,
  item,
  extra,
  sameCompany = true,
}: {
  href: string;
  item: MemoryDTO | RelatedMemoryDTO;
  extra?: string;
  sameCompany?: boolean;
}) {
  const transfer = transferabilityCopy(sameCompany);
  return (
    <Link href={href} className="block rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black">{item.title}</div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {item.lesson}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MemoryStatusBadge status={item.status} />
          <MemoryOriginBadge origin={item.origin} />
          <MemoryPolarityBadge polarity={item.polarity} />
          <MemoryConfidenceBadge confidence={item.confidence} />
          <MemoryFamilyBadge family={item.family} />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3" style={{ color: "var(--text-2)" }}>
        <Fact label="Onde" value={`${item.companyName ?? "Empresa"}${item.segment ? ` · ${item.segment}` : ""}`} />
        <Fact label="Quando" value={formatDateBR("createdAt" in item ? item.createdAt : null)} />
        <Fact label="Validação" value={memoryValidationLabel(item.validated, item.origin)} />
        <Fact label="Reutilizar" value={sameCompany ? "Mesmo contexto" : transfer.title} />
      </dl>
      {extra ? <p className="mt-2 text-[12px]" style={{ color: "var(--text-3)" }}>{extra}</p> : null}
      {!item.validated ? (
        <p className="mt-2 text-[11px]" style={{ color: "var(--text-3)" }}>
          Sem sustentação aprovada esta memória não aparece como validada.
        </p>
      ) : null}
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
