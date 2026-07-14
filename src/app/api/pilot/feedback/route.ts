import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_PROGRESS } from "@/lib/demo-data";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";

const validIntent = new Set(["yes", "maybe", "no"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const studentId = typeof body.studentId === "string" ? body.studentId : "";
    const clarityRating = Number(body.clarityRating);
    const continueIntent = typeof body.continueIntent === "string" && validIntent.has(body.continueIntent)
      ? body.continueIntent
      : "maybe";
    const concern = typeof body.concern === "string" ? body.concern.trim().slice(0, 500) : "";
    const quote = typeof body.quote === "string" ? body.quote.trim().slice(0, 500) : "";

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (!Number.isFinite(clarityRating) || clarityRating < 1 || clarityRating > 5) {
      return NextResponse.json({ error: "Clarity rating must be between 1 and 5" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const progress = (DEMO_PROGRESS as any)[studentId];
      return NextResponse.json({
        feedback: {
          id: `demo-feedback-${Date.now()}`,
          studentId,
          studentName: progress?.student?.name ?? "Learner",
          submittedAt: new Date().toISOString(),
          clarityRating,
          continueIntent,
          concern,
          quote,
        },
      });
    }

    const { db: prisma } = await import("@/lib/db");
    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;

    const learner = await prisma.learner.findUnique({ where: { id: studentId } });
    if (!learner) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const now = new Date();
    const feedback = await prisma.progressReport.create({
      data: {
        learnerId: studentId,
        reportType: "pilot-feedback",
        periodStart: now,
        periodEnd: now,
        data: {
          clarityRating,
          continueIntent,
          concern,
          quote,
        },
      },
    });

    return NextResponse.json({
      feedback: {
        id: feedback.id,
        studentId,
        studentName: learner.name,
        submittedAt: feedback.createdAt.toISOString(),
        clarityRating,
        continueIntent,
        concern,
        quote,
      },
    });
  } catch (error) {
    console.error("Pilot feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
