import { NextResponse } from "next/server";
import { buildHealthPayload } from "@/lib/release";

export async function GET() {
  return NextResponse.json(buildHealthPayload());
}
