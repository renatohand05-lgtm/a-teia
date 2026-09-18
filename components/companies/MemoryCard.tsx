import Link from "next/link";
import {
  MemoryConfidenceBadge,
  MemoryFamilyBadge,
  MemoryOriginBadge,
  MemoryPolarityBadge,
  MemoryStatusBadge,
} from "@/components/companies/MemoryBadges";
import type { MemoryDTO } from "@/services/memoryService";
import type { RelatedMemoryDTO } from "@/services/memoryService";

export function MemoryCard({
  href,
  item,
  extra,
}: {
  href: string;
  item: MemoryDTO | RelatedMemoryDTO;
  extra?: string;
}) {
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
      <p className="mt-3 text-[12px]" style={{ color: "var(--text-3)" }}>
        {item.companyName ?? "Empresa"} · KPI {item.kpi ?? "—"} · {item.validated ? "Aprendizado validado" : "Não validado para recomendação"}
        {extra ? ` · ${extra}` : ""}
      </p>
    </Link>
  );
}
