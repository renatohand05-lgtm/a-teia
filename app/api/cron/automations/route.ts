import { NextResponse } from "next/server";
import { authorizeCronRequest, isSchedulerConfigured } from "@/lib/cron-auth";
import { withCronLock } from "@/lib/cron-lock";
import { HUMAN_MESSAGES } from "@/lib/human-messages";
import { consumeNamedLimit } from "@/lib/security/rate-limit";
import { writeAudit } from "@/services/auditService";
import { runDueAutomations } from "@/services/automationService";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!authorizeCronRequest(request)) {
    await writeAudit({
      action: "security.access_denied",
      entity: "Cron",
      success: false,
      newValue: { reason: "cron_unauthorized" },
    }).catch(() => undefined);
    return NextResponse.json({ ok: false, error: HUMAN_MESSAGES.cronUnauthorized, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const limited = consumeNamedLimit("cron", "scheduler");
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: HUMAN_MESSAGES.rateLimited, code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const locked = await withCronLock(() => runDueAutomations());
  if (locked.skipped) {
    await writeAudit({
      action: "automation.executed",
      entity: "Cron",
      success: true,
      newValue: { skipped: true, reason: "already_running" },
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      skipped: true,
      scheduler: isSchedulerConfigured() ? "configured" : "not_configured",
    });
  }

  await writeAudit({
    action: "automation.executed",
    entity: "Cron",
    success: true,
    newValue: { processed: locked.result.processed },
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    scheduler: isSchedulerConfigured() ? "configured" : "not_configured",
    processed: locked.result.processed,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
