import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_PROGRESS } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: learnerId } = await params;

    if (DEMO_MODE) {
      const progress = (DEMO_PROGRESS as any)[learnerId];
      if (!progress) {
        return NextResponse.json({ error: "Learner not found" }, { status: 404 });
      }
      return NextResponse.json(progress);
    }

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.findUnique({
      where: { id: learnerId },
      include: {
        profile: true,
        skillMastery: { include: { skill: true }, orderBy: { masteryScore: "desc" } },
        modules: { orderBy: { createdAt: "desc" }, take: 10, include: { skill: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 5 },
        assessmentResponses: { orderBy: { createdAt: "desc" }, take: 30 },
        reports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const weeklyModules = learner.modules.filter((m) => m.createdAt >= weekAgo);
    const weeklyResponses = learner.assessmentResponses.filter((r) => r.createdAt >= weekAgo);
    const totalTimeMinutes = Math.round(weeklyResponses.reduce((sum, r) => sum + r.timeSpent, 0) / 60);
    const recentConfidence = weeklyResponses.map((r) => r.confidenceRating);
    const avgConfidence = recentConfidence.length > 0
      ? recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length
      : learner.profile?.confidenceLevel || 5;

    const masteredSkills = learner.skillMastery.filter((sm) => sm.status === "MASTERED");
    const developingSkills = learner.skillMastery.filter((sm) => sm.status === "DEVELOPING" || sm.status === "PRACTICING");
    const weakSkills = learner.skillMastery.filter((sm) => sm.status === "NOT_STARTED" || sm.status === "EMERGING" || sm.masteryScore < 40);

    const confidenceTrend = avgConfidence > 6 ? "improving" : avgConfidence < 4 ? "declining" : "stable";

    return NextResponse.json({
      student: {
        id: learner.id,
        name: learner.name,
        age: learner.age,
        grade: learner.grade,
        gradeBand: learner.developmentalStage,
        confidenceLevel: learner.profile?.confidenceLevel || 5,
      },
      stats: {
        lessonsCompletedThisWeek: weeklyModules.filter((m) => m.completedAt).length,
        totalLessons: learner.modules.length,
        timeSpentMinutes: totalTimeMinutes,
        masteredSkillsCount: masteredSkills.length,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        confidenceTrend,
        tutorSessionsThisWeek: learner.sessions.filter((s) => s.createdAt >= weekAgo).length,
      },
      skills: {
        mastered: masteredSkills.map((sm) => ({ name: sm.skill.name, domain: sm.skill.domainId, score: sm.masteryScore })),
        developing: developingSkills.map((sm) => ({ name: sm.skill.name, domain: sm.skill.domainId, score: sm.masteryScore })),
        weak: weakSkills.map((sm) => ({ name: sm.skill.name, domain: sm.skill.domainId, score: sm.masteryScore })),
      },
      recentLessons: learner.modules.map((m) => ({
        id: m.id,
        title: m.title,
        skillName: m.skill.name,
        completed: !!m.completedAt,
        date: m.createdAt.toISOString(),
      })),
      latestReport: learner.reports[0] || null,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
