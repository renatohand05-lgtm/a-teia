const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
]);

export type UrlInspection =
  | { ok: true; url: URL; domain: string; protocol: "http:" | "https:" }
  | { ok: false; reason: string };

function isPrivateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  if (octets.some((part) => part > 255)) return true;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const value = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (value === "::1" || value === "0:0:0:0:0:0:0:1") return true;
  if (value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80")) return true;
  return false;
}

export function inspectExternalUrl(raw: string): UrlInspection {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "URL vazia." };
  if (/^(file|javascript|data|ftp|ws|wss):/i.test(trimmed)) {
    return { ok: false, reason: "Protocolo não permitido." };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "URL inválida." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Somente HTTP/HTTPS são permitidos." };
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "Host inválido." };
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost")) {
    return { ok: false, reason: "Host local bloqueado." };
  }
  if (host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, reason: "Host interno bloqueado." };
  }
  if (isPrivateIpv4(host) || isBlockedIpv6(host)) {
    return { ok: false, reason: "IP privado ou de metadados bloqueado." };
  }
  return {
    ok: true,
    url: parsed,
    domain: host.replace(/^www\./, ""),
    protocol: parsed.protocol,
  };
}

export function isSafeExternalUrl(url: string): boolean {
  return inspectExternalUrl(url).ok;
}
