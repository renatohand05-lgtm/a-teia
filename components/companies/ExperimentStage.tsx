import { isDraftStatus } from "@/lib/experiment-engine";
import {
  currentExperimentStage,
  displayClassification,
  displayExperimentStatus,
  EXPERIMENT_PROGRESS_STAGES,
} from "@/lib/experiment-ui";
import { RiskBadge } from "@/components/ui/RiskBadge";

export function ExperimentStage({
  status,
  hasMeasurements,
  hasFinalResult,
  hasEvidence,
}: {
  status: string;
  hasMeasurements: boolean;
  hasFinalResult?: boolean;
  hasEvidence: boolean;
}) {
  const current = currentExperimentStage({
    status,
    hasMeasurements,
    hasFinalResult: Boolean(hasFinalResult),
    hasEvidence,
  });
  const index = EXPERIMENT_PROGRESS_STAGES.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em]">
      {EXPERIMENT_PROGRESS_STAGES.map((stage, i) => (
        <li key={stage} className="flex items-center gap-2">
          <span style={{ color: i <= index ? "var(--gold-soft)" : "var(--text-3)" }}>{stage}</span>
          {i < EXPERIMENT_PROGRESS_STAGES.length - 1 ? <span style={{ color: "var(--text-3)" }}>→</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function ExperimentStatusBadge({ status }: { status: string }) {
  const label = displayExperimentStatus(status);
  const tone = status === "COMPLETED" ? "good" : status === "RUNNING" ? "warn" : isDraftStatus(status) || status === "READY" ? "neutral" : "bad";
  return <RiskBadge label={label} tone={tone} />;
}

export function ExperimentClassBadge({ classification }: { classification: string | null }) {
  if (!classification) return <RiskBadge label="Sem leitura ainda" />;
  const tone = classification === "VALIDATED" ? "good" : classification === "REFUTED" ? "bad" : "warn";
  return <RiskBadge label={displayClassification(classification)} tone={tone} />;
}
