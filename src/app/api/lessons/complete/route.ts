import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import {
  getActiveSprintEnrollment,
  recordSprintEvent,
} from "@/lib/sprint-events";
import { buildLessonEvidence, verifyLessonResponses } from "@/lib/learning/evidence";
import { recordLearningEvidenceBatchAndUpdateMastery } from "@/lib/learning/mastery";
import { evaluateInterventionsAfterEvidence } from "@/lib/learning/interventions";

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
        evidence: { mode: "demo", persisted: false },
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

    const responseList = Array.isArray(responses) ? responses.slice(0, 100) : [];
    const completedAt = new Date();
    const verifiedResponses = verifyLessonResponses(lesson.content, responseList);
    const evidence = buildLessonEvidence(
      studentId,
      lesson.skillId,
      lesson.id,
      verifiedResponses,
      completedAt
    );
    const gradedEvidence = evidence.filter((record) => record.outcome !== "UNGRADED");
    const accuracy = gradedEvidence.length > 0
      ? gradedEvidence.filter((record) => record.outcome === "CORRECT").length / gradedEvidence.length
      : null;

    const masteryResult = await recordLearningEvidenceBatchAndUpdateMastery(evidence);

    await prisma.learningModule.update({
      where: { id: lesson.id },
      data: {
        completedAt,
        score: accuracy === null ? null : accuracy * 100,
      },
    });

    const enrollment = await getActiveSprintEnrollment(studentId);
    if (enrollment) {
      await recordSprintEvent({
        enrollmentId: enrollment.id,
        name: "lesson_completed",
        idempotencyKey: `${enrollment.id}:lesson_completed:${lesson.id}`,
        metadata: {
          lessonId: lesson.id,
          skillId: lesson.skillId,
          score: accuracy === null ? null : Math.round(accuracy * 100),
        },
      });
    }
    if (masteryResult.insertedEvidenceCount > 0) {
      await evaluateInterventionsAfterEvidence({ learnerId: studentId, sourceType: "lesson", sourceId: lesson.id });
    }

    return NextResponse.json({
      success: true,
      completedAt,
      skillName: lesson.skill.name,
      evidence: {
        inserted: masteryResult.insertedEvidenceCount,
        graded: gradedEvidence.length,
        ungraded: evidence.length - gradedEvidence.length,
      },
      mastery: masteryResult.projections[0]?.state ?? null,
    });
  } catch (error) {
    console.error("Complete lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
