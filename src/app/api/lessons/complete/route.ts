import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";

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

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;

    const lesson = await prisma.learningModule.findFirst({
      where: { id: lessonId, learnerId: studentId },
      include: { skill: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const responseList = Array.isArray(responses) ? responses : [];
    const completedAt = new Date();
    const accuracy = responseList.length > 0
      ? responseList.filter((response: { isCorrect?: boolean }) => response.isCorrect).length / responseList.length
      : null;

    await prisma.learningModule.update({
      where: { id: lesson.id },
      data: {
        completedAt,
        score: accuracy === null ? undefined : accuracy * 100,
      },
    });

    if (accuracy !== null) {
      const masteryGain = accuracy * 15;
      const existingMastery = await prisma.learnerSkillMastery.findUnique({
        where: {
          learnerId_skillId: { learnerId: studentId, skillId: lesson.skillId },
        },
      });
      const status = accuracy >= 0.8
        ? "MASTERED"
        : accuracy >= 0.5
          ? "PRACTICING"
          : "DEVELOPING";

      await prisma.learnerSkillMastery.upsert({
        where: {
          learnerId_skillId: { learnerId: studentId, skillId: lesson.skillId },
        },
        update: {
          masteryScore: Math.min((existingMastery?.masteryScore ?? 0) + masteryGain, 100),
          confidenceScore: Math.min((existingMastery?.confidenceScore ?? 0) + accuracy * 10, 100),
          status,
          attempts: { increment: 1 },
          lastPracticed: new Date(),
        },
        create: {
          learnerId: studentId,
          skillId: lesson.skillId,
          masteryScore: masteryGain,
          confidenceScore: accuracy * 10,
          status,
          attempts: 1,
          lastPracticed: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      completedAt,
      skillName: lesson.skill.name,
    });
  } catch (error) {
    console.error("Complete lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
