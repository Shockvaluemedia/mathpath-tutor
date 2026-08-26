import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { buildAndPersistDailyLearningPath, buildDemoDailyLearningPath } from "@/lib/learning/planning";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: learnerId } = await params;
    if (DEMO_MODE) {
      if (!DEMO_STUDENTS.some((student) => student.id === learnerId)) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      return NextResponse.json({ plan: buildDemoDailyLearningPath(learnerId), sample: true });
    }
    const access = await requireRequestLearnerAccess(request, learnerId);
    if (!access.ok) return access.response;
    const plan = await buildAndPersistDailyLearningPath(learnerId);
    return plan
      ? NextResponse.json({ plan, sample: false })
      : NextResponse.json({ error: "Learner not found" }, { status: 404 });
  } catch (error) {
    console.error("Build daily path error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
