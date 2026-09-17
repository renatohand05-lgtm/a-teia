export type OnboardingStatusValue = "DRAFT" | "COMPLETE";

export function deriveOnboardingStatus(input: {
  name: string;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  revenueMonthly?: number | null;
  teamSize?: number | null;
  channels?: string | null;
  primaryObjective?: string | null;
  perceivedBottleneck?: string | null;
}): OnboardingStatusValue {
  const filled = [
    input.name.trim().length >= 2,
    Boolean(input.segment?.trim()),
    Boolean(input.city?.trim() || input.state?.trim()),
    input.revenueMonthly !== null && input.revenueMonthly !== undefined,
    input.teamSize !== null && input.teamSize !== undefined,
    Boolean(input.channels?.trim()),
    Boolean(input.primaryObjective?.trim()),
    Boolean(input.perceivedBottleneck?.trim()),
  ];
  return filled.every(Boolean) ? "COMPLETE" : "DRAFT";
}
