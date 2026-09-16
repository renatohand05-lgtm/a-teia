export type CompanySignals = {
  revenueMonthly: number | null;
  marginPercent: number | null;
  perceivedBottlenecks: string | null;
  objectives: string | null;
};

export function cockpitPriorityFromCompany(company: CompanySignals): {

  score: number;
  zone: "critical" | "growth" | "watch" | "stable";
  reason: string;
} {
  const margin = company.marginPercent ?? 10;
  const hasRevenue = (company.revenueMonthly ?? 0) > 0;
  let score = 40;
  const reasons: string[] = [];

  if (!hasRevenue) {
    score += 20;
    reasons.push("faturamento ainda não informado");
  }
  if (margin < 8) {
    score += 18;
    reasons.push("margem pressionada");
  }
  if (company.perceivedBottlenecks) {
    score += 12;
    reasons.push("gargalo percebido registrado");
  }
  if (company.objectives) {
    score += 6;
  }

  score = Math.max(0, Math.min(100, score));
  const zone =
    margin < 0 || score >= 78 ? "critical" : score >= 62 ? "watch" : hasRevenue && margin >= 15 ? "stable" : "growth";

  return {
    score,
    zone,
    reason: reasons.slice(0, 3).join(" · ") || "prioridade inicial pela carteira cadastrada",
  };
}
