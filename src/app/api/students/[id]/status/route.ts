import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

export interface StudentStatus {
  id: string;
  name: string;
  grade: number;
  stage: string;
  diagnosticStatus: "not_started" | "link_sent" | "in_progress" | "completed";
  diagnosticLink: string | null;
  diagnosticLinkSentAt: string | null;
  diagnosticStartedAt: string | null;
  diagnosticCompletedAt: string | null;
  lastActiveAt: string | null;
  lessonsCompleted: number;
  currentStreak: number;
  needsAction: string | null; // what the parent should do next
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    if (DEMO_MODE) {
      // For demo, return a status based on the student ID
      const isNew = studentId.startsWith("demo-student-") === false && studentId.startsWith("learner-");
      return NextResponse.json({
        id: studentId,
        name: isNew ? "New Student" : "Demo Student",
        grade: 5,
        stage: "ELEMENTARY",
        diagnosticStatus: isNew ? "not_started" : "completed",
        diagnosticLink: isNew ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/d/demo123` : null,
        diagnosticLinkSentAt: isNew ? new Date(Date.now() - 3600000).toISOString() : null,
        diagnosticStartedAt: isNew ? null : new Date(Date.now() - 86400000).toISOString(),
        diagnosticCompletedAt: isNew ? null : new Date(Date.now() - 86400000).toISOString(),
        lastActiveAt: isNew ? null : new Date().toISOString(),
        lessonsCompleted: isNew ? 0 : 12,
        currentStreak: isNew ? 0 : 4,
        needsAction: isNew ? "Diagnostic not started — send a reminder or start it together" : null,
      } as StudentStatus);
    }

    // Production
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        assessments: { orderBy: { startedAt: "desc" }, take: 1 },
        modules: { where: { completedAt: { not: null } } },
      },
    });

    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const assessment = learner.assessments[0];
    let diagnosticStatus: StudentStatus["diagnosticStatus"] = "not_started";
    if (assessment?.completedAt) diagnosticStatus = "completed";
    else if (assessment?.startedAt) diagnosticStatus = "in_progress";

    // Determine what action the parent should take
    let needsAction: string | null = null;
    if (diagnosticStatus === "not_started") {
      needsAction = "Send the diagnostic link to your child so they can get started";
    } else if (diagnosticStatus === "in_progress") {
      needsAction = "Your child started the diagnostic but hasn't finished — encourage them to complete it";
    }

    const status: StudentStatus = {
      id: learner.id,
      name: learner.name,
      grade: learner.grade,
      stage: learner.developmentalStage,
      diagnosticStatus,
      diagnosticLink: null, // Would come from a links table in production
      diagnosticLinkSentAt: null,
      diagnosticStartedAt: assessment?.startedAt?.toISOString() || null,
      diagnosticCompletedAt: assessment?.completedAt?.toISOString() || null,
      lastActiveAt: learner.modules[0]?.completedAt?.toISOString() || assessment?.startedAt?.toISOString() || null,
      lessonsCompleted: learner.modules.length,
      currentStreak: 0, // Would calculate from module dates
      needsAction,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Get student status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
