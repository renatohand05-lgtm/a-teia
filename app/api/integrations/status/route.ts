import { NextResponse } from "next/server";
import { buildIntegrationsStatus } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildIntegrationsStatus());
}
