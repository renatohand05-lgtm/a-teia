/** Valores monetários em centavos inteiros. Nulo = não informado, nunca vira zero. */

export function isInformedCents(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

export function missingMoneyIsNotZero(value: number | null | undefined): boolean {
  return value == null;
}

export function toCents(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function fromCents(cents: number | null | undefined): number | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return Number((cents / 100).toFixed(2));
}

export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function addCents(left: number, right: number): number {
  return Math.trunc(left) + Math.trunc(right);
}

export function subtractCents(left: number, right: number): number {
  return Math.trunc(left) - Math.trunc(right);
}

export function scaleCents(cents: number, numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((Math.trunc(cents) * numerator) / denominator);
}

export function hoursToHundredths(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function fromHourHundredths(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number((value / 100).toFixed(2));
}

/** ROI em basis points. Sem investimento ou retorno informados = nulo, nunca zero inventado. */
export function estimatedRoiBps(returnCents: number | null, investmentCents: number | null): number | null {
  if (returnCents == null || investmentCents == null || investmentCents <= 0) return null;
  return Math.round(((returnCents - investmentCents) * 10_000) / investmentCents);
}

export function paybackMonthsHundredths(
  investmentCents: number | null,
  monthlyReturnCents: number | null,
): number | null {
  if (investmentCents == null || monthlyReturnCents == null || monthlyReturnCents <= 0) return null;
  return Math.round((investmentCents * 100) / monthlyReturnCents);
}
