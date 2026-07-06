import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_PROGRESS } from "@/lib/demo-data";
import { buildEmptySprintReport, buildSprintReport } from "@/lib/sprint";

async function getStudentId(request: NextRequest) {
  if (request.method === "GET") {
    return request.nextUrl.searchParams.get("studentId");
  }

  const body = await request.json().catch(() => ({}));
  return typeof body.studentId === "string" ? body.studentId : null;
}

async function getSprintReport(request: NextRequest) {
  const studentId = await getStudentId(request);

  if (!studentId) {
    return NextResponse.json({ error: "Student ID required" }, { status: 400 });
  }

  if (DEMO_MODE) {
    const progress = (DEMO_PROGRESS as any)[studentId];
    return NextResponse.json({
      report: progress ? buildSprintReport(progress) : buildEmptySprintReport(studentId),
    });
  }

  const { db: prisma } = await import("@/lib/db");
  const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

  const token = getTokenFromHeader(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const learner = await prisma.learner.findUnique({
    where: { id: studentId },
    include: {
      profile: true,
      skillMastery: { include: { skill: true }, orderBy: { masteryScore: "desc" } },
      modules: { orderBy: { createdAt: "desc" }, take: 20, include: { skill: true } },
      sessions: { orderBy: { createdAt: "desc" }, take: 20 },
      assessmentResponses: { orderBy: { createdAt: "desc" }, take: 40 },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!learner) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sprintModules = learner.modules.filter((module: any) => module.createdAt >= twoWeeksAgo);
  const sprintResponses = learner.assessmentResponses.filter((response: any) => response.createdAt >= twoWeeksAgo);
  const sprintSessions = learner.sessions.filter((session: any) => session.createdAt >= twoWeeksAgo);
  const recentConfidence = sprintResponses.map((response: any) => response.confidenceRating);
  const avgConfidence = recentConfidence.length > 0
    ? recentConfidence.reduce((sum: number, value: number) => sum + value, 0) / recentConfidence.length
    : learner.profile?.confidenceLevel ?? 5;

  const progress = {
    student: {
      id: learner.id,
      name: learner.name,
      grade: learner.grade,
      confidenceLevel: learner.profile?.confidenceLevel ?? 5,
    },
    stats: {
      lessonsCompletedThisWeek: sprintModules.filter((module: any) => module.completedAt).length,
      totalLessons: learner.modules.length,
      timeSpentMinutes: Math.round(sprintResponses.reduce((sum: number, response: any) => sum + response.timeSpent, 0) / 60),
      masteredSkillsCount: learner.skillMastery.filter((skill: any) => skill.status === "MASTERED").length,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      confidenceTrend: "stable" as const,
      tutorSessionsThisWeek: sprintSessions.length,
    },
    skills: {
      mastered: learner.skillMastery
        .filter((skill: any) => skill.status === "MASTERED")
        .map((skill: any) => ({ name: skill.skill.name, domain: skill.skill.domainId ?? "Math", score: skill.masteryScore })),
      developing: learner.skillMastery
        .filter((skill: any) => skill.status === "DEVELOPING" || skill.status === "PRACTICING")
        .map((skill: any) => ({ name: skill.skill.name, domain: skill.skill.domainId ?? "Math", score: skill.masteryScore })),
      weak: learner.skillMastery
        .filter((skill: any) => skill.status === "NOT_STARTED" || skill.masteryScore < 40)
        .map((skill: any) => ({ name: skill.skill.name, domain: skill.skill.domainId ?? "Math", score: skill.masteryScore })),
    },
    latestReport: learner.reports[0]?.data ?? null,
  };

  return NextResponse.json({ report: buildSprintReport(progress) });
}

export async function GET(request: NextRequest) {
  try {
    return await getSprintReport(request);
  } catch (error) {
    console.error("Get sprint report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await getSprintReport(request);
  } catch (error) {
    console.error("Create sprint report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
