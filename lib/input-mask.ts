import { parseBrazilianNumber } from "@/lib/format";

export function digitsAndComma(value: string): string {
  return value.replace(/[^\d,]/g, "");
}

/** Formata digitação de moeda sem alterar o valor numérico enviado ao parse existente. */
export function maskMoneyTyping(raw: string): string {
  const cleaned = digitsAndComma(raw);
  if (!cleaned) return "";

  const comma = cleaned.indexOf(",");
  const integerPart = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/^0+(?=\d)/, "") || "0";
  const decimalPart = comma === -1 ? "" : cleaned.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart.length || comma !== -1 ? `${grouped},${decimalPart}` : grouped;
}

export function maskPercentTyping(raw: string): string {
  const masked = maskMoneyTyping(raw);
  return masked;
}

export function displayMoneyInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return maskMoneyTyping(
      Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    );
  }
  const parsed = parseBrazilianNumber(value);
  if (parsed == null) return maskMoneyTyping(value);
  return displayMoneyInput(parsed);
}

export function moneyMaskPreservesParse(raw: string): boolean {
  const masked = maskMoneyTyping(raw);
  const a = parseBrazilianNumber(raw.replace(/^R\$\s*/i, ""));
  const b = parseBrazilianNumber(masked);
  if (raw.trim() === "" || masked === "") return a == null && b == null;
  return a === b;
}
