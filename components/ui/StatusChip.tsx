import type { ModuleStatus } from "@/lib/cockpit";
import { MODULE_STATUS_LABEL } from "@/lib/cockpit";

const TONE: Record<ModuleStatus, { color: string; border: string; background: string }> = {
  SEM_DADOS: {
    color: "var(--text-3)",
    border: "rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
  },
  INICIADO: {
    color: "var(--silver)",
    border: "rgba(199,210,224,.28)",
    background: "rgba(199,210,224,.08)",
  },
  EM_ANDAMENTO: {
    color: "var(--gold-soft)",
    border: "rgba(232,191,122,.35)",
    background: "rgba(232,191,122,.1)",
  },
  CONCLUIDO: {
    color: "#73df96",
    border: "rgba(52,199,111,.28)",
    background: "rgba(52,199,111,.1)",
  },
  ATENCAO: {
    color: "#f0a39c",
    border: "rgba(224,86,76,.35)",
    background: "rgba(224,86,76,.1)",
  },
};

export function StatusChip({ status }: { status: ModuleStatus }) {
  const tone = TONE[status];
  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
      style={{ color: tone.color, borderColor: tone.border, background: tone.background }}
    >
      {MODULE_STATUS_LABEL[status]}
    </span>
  );
}
