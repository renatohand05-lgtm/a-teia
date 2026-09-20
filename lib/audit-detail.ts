import { sanitizeAuditValue } from "@/lib/security/sanitize";

const HIDDEN_KEY = /(password|token|secret|cookie|authorization|api[_-]?key|connectionstring|database_url|session)/i;

export function presentAuditMetadata(value: unknown, maxEntries = 12): Array<{ key: string; value: string }> {
  const sanitized = sanitizeAuditValue(value);
  if (sanitized == null || sanitized === "") return [];
  if (typeof sanitized !== "object") {
    return [{ key: "Detalhe", value: String(sanitized).slice(0, 240) }];
  }
  const entries = Object.entries(sanitized as Record<string, unknown>)
    .filter(([key]) => !HIDDEN_KEY.test(key))
    .slice(0, maxEntries)
    .map(([key, nested]) => ({
      key,
      value: formatAuditLeaf(nested),
    }))
    .filter((item) => item.value && item.value !== "[redacted]");
  return entries;
}

function formatAuditLeaf(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.slice(0, 180);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? `${value.length} itens` : "—";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).slice(0, 4);
    return keys.length ? keys.join(", ") : "—";
  }
  return String(value).slice(0, 180);
}

export function auditOriginLabel(origin: string | null | undefined): string {
  const labels: Record<string, string> = {
    USER: "Usuário",
    SYSTEM: "Sistema",
    AI: "IA",
    RESEARCH: "Pesquisa",
    IMPORT: "Importação",
  };
  return origin ? (labels[origin] ?? origin) : "—";
}
