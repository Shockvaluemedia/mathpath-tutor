import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_PROGRESS } from "@/lib/demo-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    if (DEMO_MODE) {
      const progress = (DEMO_PROGRESS as any)[studentId];
      if (!progress) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      return NextResponse.json(progress);
    }

    // Production
    const { db: prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        skillMastery: { include: { skill: true }, orderBy: { masteryScore: "desc" } },
        lessons: { orderBy: { createdAt: "desc" }, take: 10, include: { focusSkill: true } },
        tutorSessions: { orderBy: { createdAt: "desc" }, take: 5 },
        assessmentResponses: { orderBy: { createdAt: "desc" }, take: 30 },
        parentReports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyLessons = student.lessons.filter((l) => l.createdAt >= weekAgo);
    const weeklyResponses = student.assessmentResponses.filter((r) => r.createdAt >= weekAgo);
    const totalTimeMinutes = Math.round(weeklyResponses.reduce((sum, r) => sum + r.timeSpent, 0) / 60);
    const recentConfidence = weeklyResponses.map((r) => r.confidenceRating);
    const avgConfidence = recentConfidence.length > 0
      ? recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length
      : student.confidenceLevel;

    const masteredSkills = student.skillMastery.filter((sm) => sm.status === "MASTERED");
    const developingSkills = student.skillMastery.filter((sm) => sm.status === "DEVELOPING" || sm.status === "PRACTICING");
    const weakSkills = student.skillMastery.filter((sm) => sm.status === "NOT_STARTED" || sm.masteryScore < 40);

    const olderConfidence = student.assessmentResponses.filter((r) => r.createdAt < weekAgo).slice(0, 10).map((r) => r.confidenceRating);
    const olderAvg = olderConfidence.length > 0 ? olderConfidence.reduce((a, b) => a + b, 0) / olderConfidence.length : avgConfidence;
    const confidenceTrend = avgConfidence > olderAvg + 0.5 ? "improving" : avgConfidence < olderAvg - 0.5 ? "declining" : "stable";

    return NextResponse.json({
      student: { id: student.id, name: student.name, age: student.age, grade: student.grade, gradeBand: student.gradeBand, confidenceLevel: student.confidenceLevel },
      stats: {
        lessonsCompletedThisWeek: weeklyLessons.filter((l) => l.completedAt).length,
        totalLessons: student.lessons.length,
        timeSpentMinutes: totalTimeMinutes,
        masteredSkillsCount: masteredSkills.length,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        confidenceTrend,
        tutorSessionsThisWeek: student.tutorSessions.filter((s) => s.createdAt >= weekAgo).length,
      },
      skills: {
        mastered: masteredSkills.map((sm) => ({ name: sm.skill.name, domain: sm.skill.domain, score: sm.masteryScore })),
        developing: developingSkills.map((sm) => ({ name: sm.skill.name, domain: sm.skill.domain, score: sm.masteryScore })),
        weak: weakSkills.map((sm) => ({ name: sm.skill.name, domain: sm.skill.domain, score: sm.masteryScore })),
      },
      recentLessons: student.lessons.map((l) => ({ id: l.id, title: l.title, skillName: l.focusSkill.name, completed: !!l.completedAt, date: l.createdAt.toISOString() })),
      latestReport: student.parentReports[0] || null,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
