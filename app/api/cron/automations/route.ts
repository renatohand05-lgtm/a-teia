import { NextResponse } from "next/server";
import { authorizeCronRequest, isSchedulerConfigured } from "@/lib/cron-auth";
import { runDueAutomations } from "@/services/automationService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueAutomations();
  return NextResponse.json({
    ok: true,
    scheduler: isSchedulerConfigured() ? "configured" : "not_configured",
    processed: result.processed,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
