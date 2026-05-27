import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, studentId, responses } = body;

    if (!lessonId || !studentId) {
      return NextResponse.json({ error: "Lesson ID and Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({
        success: true,
        completedAt: new Date().toISOString(),
        skillName: "Fractions",
      });
    }

    // Production
    const { db: prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: { completedAt: new Date() },
      include: { focusSkill: true },
    });

    if (responses && responses.length > 0) {
      const correctCount = responses.filter((r: any) => r.isCorrect).length;
      const accuracy = correctCount / responses.length;
      const masteryGain = accuracy * 15;

      await prisma.studentSkillMastery.upsert({
        where: { studentId_skillId: { studentId, skillId: lesson.focusSkillId } },
        update: {
          masteryScore: { increment: Math.min(masteryGain, 100) },
          confidenceScore: { increment: accuracy * 10 },
          status: accuracy >= 0.8 ? "MASTERED" : accuracy >= 0.5 ? "PRACTICING" : "DEVELOPING",
          lastPracticed: new Date(),
        },
        create: {
          studentId,
          skillId: lesson.focusSkillId,
          masteryScore: masteryGain,
          confidenceScore: accuracy * 10,
          status: accuracy >= 0.8 ? "MASTERED" : accuracy >= 0.5 ? "PRACTICING" : "DEVELOPING",
          lastPracticed: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      completedAt: lesson.completedAt,
      skillName: lesson.focusSkill.name,
    });
  } catch (error) {
    console.error("Complete lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
