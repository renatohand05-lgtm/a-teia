import { DEFAULT_AUTOMATION_TIMEZONE } from "@/lib/automation-config";

export function zonedParts(date: Date, timeZone = DEFAULT_AUTOMATION_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    weekday: pick("weekday"),
    hour: Number(pick("hour")),
    isoDate: `${pick("year")}-${pick("month")}-${pick("day")}`,
  };
}

export function slotKey(
  date: Date,
  frequency: "MANUAL" | "DAILY" | "WEEKLY" | "MONTHLY",
  timeZone = DEFAULT_AUTOMATION_TIMEZONE,
) {
  const parts = zonedParts(date, timeZone);
  if (frequency === "MONTHLY") return `${parts.year}-${parts.month}`;
  if (frequency === "WEEKLY") {
    const utc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    const week = new Date(utc);
    const day = week.getUTCDay() || 7;
    week.setUTCDate(week.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(week.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((week.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${week.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }
  return parts.isoDate;
}

export function nextRunAt(
  from: Date,
  frequency: "MANUAL" | "DAILY" | "WEEKLY" | "MONTHLY",
  timeZone = DEFAULT_AUTOMATION_TIMEZONE,
) {
  if (frequency === "MANUAL") return null;
  const hours = frequency === "DAILY" ? 24 : frequency === "WEEKLY" ? 24 * 7 : 24 * 30;
  const next = new Date(from.getTime() + hours * 60 * 60 * 1000);
  void timeZone;
  return next;
}

export function formatInTimezone(date: Date, timeZone = DEFAULT_AUTOMATION_TIMEZONE) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
