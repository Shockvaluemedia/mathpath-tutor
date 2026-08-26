import { NextRequest, NextResponse } from "next/server";
import { requireRequestRole } from "@/lib/auth-middleware";
import { DEMO_MODE } from "@/lib/demo-data";
import { buildDemoOperatorLearningSystemSnapshot, buildOperatorLearningSystemSnapshot } from "@/lib/learning/evaluation";

export async function GET(request: NextRequest) {
  if (DEMO_MODE) return NextResponse.json(buildDemoOperatorLearningSystemSnapshot());
  const auth = requireRequestRole(request, ["ADMIN"]);
  if (!auth.ok) return auth.response;
  const requested = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const periodDays = Number.isFinite(requested) ? Math.min(90, Math.max(7, Math.round(requested))) : 14;
  return NextResponse.json(await buildOperatorLearningSystemSnapshot(periodDays));
}
