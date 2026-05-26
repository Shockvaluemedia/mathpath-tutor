import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_PROGRESS } from "@/lib/demo-data";
import { calculateReviewSchedule, getReviewQuestions } from "@/lib/spaced-repetition";

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

      // Build skills list from progress data with simulated last-practiced dates
      const allSkills = [
        ...progress.skills.mastered.map((s: any, i: number) => ({
          id: `m-${i}`,
          name: s.name,
          domain: s.domain,
          masteryScore: s.score,
          lastPracticed: new Date(Date.now() - (i + 3) * 86400000).toISOString(), // 3-6 days ago
        })),
        ...progress.skills.developing.map((s: any, i: number) => ({
          id: `d-${i}`,
          name: s.name,
          domain: s.domain,
          masteryScore: s.score,
          lastPracticed: new Date(Date.now() - (i + 1) * 86400000).toISOString(), // 1-3 days ago
        })),
        ...progress.skills.weak.map((s: any, i: number) => ({
          id: `w-${i}`,
          name: s.name,
          domain: s.domain,
          masteryScore: s.score,
          lastPracticed: new Date(Date.now() - (i + 2) * 86400000).toISOString(), // 2-4 days ago
        })),
      ];

      const schedule = calculateReviewSchedule(allSkills);
      const dueItems = schedule.items.filter((i) => i.urgency !== "stable");
      const questions = getReviewQuestions(dueItems, 5);

      return NextResponse.json({
        schedule,
        questions,
      });
    }

    // Production
    const { prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        skillMastery: { include: { skill: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const skills = student.skillMastery.map((sm) => ({
      id: sm.skillId,
      name: sm.skill.name,
      domain: sm.skill.domain,
      masteryScore: sm.masteryScore,
      lastPracticed: sm.lastPracticed?.toISOString() || null,
    }));

    const schedule = calculateReviewSchedule(skills);
    const dueItems = schedule.items.filter((i) => i.urgency !== "stable");
    const questions = getReviewQuestions(dueItems, 5);

    return NextResponse.json({ schedule, questions });
  } catch (error) {
    console.error("Get review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
