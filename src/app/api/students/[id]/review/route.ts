import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_PROGRESS } from "@/lib/demo-data";
import { calculateReviewSchedule } from "@/lib/spaced-repetition";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import {
  getLearnerReviewQueue,
  rebuildLearnerReviewSchedules,
  resolveReviewQuestion,
  selectReviewQuestion,
} from "@/lib/learning/retention";
import { areMathAnswersEquivalent } from "@/lib/math/validators";
import { generateProblem, persistProblemInstance } from "@/lib/math/problem-generators";
import { recordLearningEvidenceBatchAndUpdateMastery } from "@/lib/learning/mastery";
import { evaluateInterventionsAfterEvidence } from "@/lib/learning/interventions";

const DAY_MS = 86_400_000;

function urgency(nextReviewAt: Date, now: Date) {
  const hoursUntilDue = (nextReviewAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntilDue < -24) return "overdue" as const;
  if (hoursUntilDue <= 0) return "due-today" as const;
  if (hoursUntilDue <= 24) return "due-soon" as const;
  return "stable" as const;
}

function demoReview(studentId: string) {
  const progress = DEMO_PROGRESS[studentId as keyof typeof DEMO_PROGRESS];
  if (!progress) return null;
  const allSkills = [
    ...progress.skills.mastered.map((skill, index) => ({ id: `m-${index}`, ...skill, masteryScore: skill.score, lastPracticed: new Date(Date.now() - (index + 3) * DAY_MS).toISOString() })),
    ...progress.skills.developing.map((skill, index) => ({ id: `d-${index}`, ...skill, masteryScore: skill.score, lastPracticed: new Date(Date.now() - (index + 1) * DAY_MS).toISOString() })),
    ...progress.skills.weak.map((skill, index) => ({ id: `w-${index}`, ...skill, masteryScore: skill.score, lastPracticed: new Date(Date.now() - (index + 2) * DAY_MS).toISOString() })),
  ];
  const schedule = calculateReviewSchedule(allSkills);
  const questions = schedule.items
    .filter((item) => item.urgency !== "stable")
    .map((item) => selectReviewQuestion(item.skillId, item.skillName, 0))
    .filter((question) => question !== null)
    .slice(0, 5);
  return { schedule, questions };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    if (DEMO_MODE) {
      const response = demoReview(studentId);
      return response
        ? NextResponse.json(response)
        : NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;
    let schedules = await getLearnerReviewQueue(studentId);
    if (schedules.length === 0) {
      await rebuildLearnerReviewSchedules(studentId);
      schedules = await getLearnerReviewQueue(studentId);
    }
    const mastery = await prisma.learnerSkillMastery.findMany({
      where: { learnerId: studentId, skillId: { in: schedules.map((schedule) => schedule.skillId) } },
      select: { skillId: true, masteryScore: true },
    });
    const masteryBySkill = new Map(mastery.map((state) => [state.skillId, state.masteryScore]));
    const now = new Date();
    const items = schedules.map((schedule) => ({
      skillId: schedule.skillId,
      skillName: schedule.skill.name,
      domain: schedule.skill.domain.name,
      masteryScore: masteryBySkill.get(schedule.skillId) ?? 0,
      daysSinceReview: Math.max(0, Math.floor((now.getTime() - (schedule.lastReviewAt ?? schedule.createdAt).getTime()) / DAY_MS)),
      urgency: urgency(schedule.nextReviewAt, now),
      nextReviewDate: schedule.nextReviewAt.toISOString(),
      interval: Math.round(schedule.intervalDays),
      retentionConfidence: schedule.retentionConfidence,
      reasonCodes: schedule.reasonCodes,
    }));
    const questions = (await Promise.all(schedules
      .filter((schedule) => urgency(schedule.nextReviewAt, now) !== "stable")
      .slice(0, 5)
      .map(async (schedule) => {
        const difficulty = Math.min(5, Math.max(1, Math.ceil(schedule.skill.difficulty / 2)));
        const problem = generateProblem({
          targetSkillId: schedule.skillId,
          skillSlug: schedule.skill.slug,
          skillName: schedule.skill.name,
          difficulty,
          seed: `review:${schedule.id}:${schedule.retrievalCount}`,
        });
        if (!problem) return selectReviewQuestion(schedule.skillId, schedule.skill.name, schedule.retrievalCount);
        const instance = await persistProblemInstance({ learnerId: studentId, problem });
        return {
          id: instance.id,
          skillId: schedule.skillId,
          skillName: schedule.skill.name,
          question: instance.prompt,
          hints: [],
          difficulty: instance.difficulty,
          answerType: instance.answerType,
          representationType: instance.representationType,
        };
      }))).filter((question) => question !== null);
    return NextResponse.json({
      schedule: {
        items,
        totalDue: items.filter((item) => item.urgency !== "stable").length,
        overdueCount: items.filter((item) => item.urgency === "overdue").length,
        scheduleVersion: "math-retention-v1",
      },
      questions,
    });
  } catch (error) {
    console.error("Get review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const { questionId, answer, attemptId } = body;
    if (
      typeof questionId !== "string" || questionId.length > 250 ||
      typeof answer !== "string" || answer.length > 500 ||
      typeof attemptId !== "string" || attemptId.length < 1 || attemptId.length > 100
    ) {
      return NextResponse.json({ error: "Question, answer, and attempt ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const demo = demoReview(studentId);
      const matched = demo?.schedule.items
        .map((item) => ({ item, question: resolveReviewQuestion(questionId, item.skillId, item.skillName) }))
        .find((candidate) => candidate.question !== null);
      if (!matched?.question) return NextResponse.json({ error: "Review question not found" }, { status: 404 });
      return NextResponse.json({
        correct: areMathAnswersEquivalent(answer, matched.question.answer).equivalent,
        correctAnswer: matched.question.answer,
        explanation: matched.question.explanation,
        evidence: { mode: "demo", persisted: false },
      });
    }

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;
    const schedules = await getLearnerReviewQueue(studentId);
    const persistedProblem = await prisma.problemInstance.findFirst({
      where: {
        id: questionId,
        learnerId: studentId,
        targetSkillId: { in: schedules.map((schedule) => schedule.skillId) },
      },
      select: {
        id: true,
        targetSkillId: true,
        prompt: true,
        correctAnswer: true,
        explanation: true,
        difficulty: true,
        answeredAt: true,
      },
    });
    if (persistedProblem?.answeredAt) {
      return NextResponse.json({ error: "Review problem already submitted" }, { status: 409 });
    }
    const persistedSchedule = persistedProblem
      ? schedules.find((schedule) => schedule.skillId === persistedProblem.targetSkillId)
      : null;
    const matched = persistedProblem && persistedSchedule
      ? {
          schedule: persistedSchedule,
          question: {
            id: persistedProblem.id,
            question: persistedProblem.prompt,
            answer: persistedProblem.correctAnswer,
            explanation: persistedProblem.explanation,
            difficulty: persistedProblem.difficulty,
          },
        }
      : questionId.startsWith("retention:") ? schedules
          .map((schedule) => ({ schedule, question: resolveReviewQuestion(questionId, schedule.skillId, schedule.skill.name) }))
          .find((candidate) => candidate.question !== null)
        : undefined;
    if (!matched?.question) {
      return NextResponse.json({ error: "Review question not found" }, { status: 404 });
    }

    const now = new Date();
    const verification = areMathAnswersEquivalent(answer, matched.question.answer);
    const hintsUsed = Number.isFinite(body.hintsUsed) ? Math.min(20, Math.max(0, Math.round(body.hintsUsed))) : 0;
    const responseTimeMs = Number.isFinite(body.responseTimeMs)
      ? Math.min(30 * 60 * 1000, Math.max(0, Math.round(body.responseTimeMs)))
      : undefined;
    const previousAt = matched.schedule.lastReviewAt ?? matched.schedule.createdAt;
    const result = await recordLearningEvidenceBatchAndUpdateMastery([{
      idempotencyKey: `retention:${studentId}:${attemptId}`,
      learnerId: studentId,
      skillId: matched.schedule.skillId,
      evidenceType: "RETENTION",
      outcome: verification.equivalent ? "CORRECT" : "INCORRECT",
      assistanceLevel: hintsUsed > 0 ? "HINTED" : "INDEPENDENT",
      sourceType: "retention-review",
      sourceId: attemptId,
      learnerAnswer: answer,
      correctAnswer: matched.question.answer,
      hintsUsed,
      responseTimeMs,
      expectedResponseTimeMs: Math.round(45_000 + matched.question.difficulty * 15_000),
      difficulty: matched.question.difficulty,
      delayDays: Math.max(0, (now.getTime() - previousAt.getTime()) / DAY_MS),
      instructionalStrategy: "REVIEW",
      metadata: { questionId, verification: `SERVER_${verification.method}` },
      occurredAt: now,
    }]);
    if (persistedProblem && result.insertedEvidenceCount > 0) {
      await prisma.problemInstance.update({
        where: { id: persistedProblem.id },
        data: { answeredAt: now },
      });
    }
    if (result.insertedEvidenceCount > 0) {
      await evaluateInterventionsAfterEvidence({ learnerId: studentId, sourceType: "retention-review", sourceId: attemptId });
    }
    const refreshed = await prisma.skillReviewSchedule.findUnique({
      where: { learnerId_skillId: { learnerId: studentId, skillId: matched.schedule.skillId } },
      select: { nextReviewAt: true, intervalDays: true, retentionConfidence: true, reasonCodes: true },
    });
    return NextResponse.json({
      correct: verification.equivalent,
      correctAnswer: matched.question.answer,
      explanation: matched.question.explanation,
      evidence: { inserted: result.insertedEvidenceCount, type: "RETENTION" },
      nextReview: refreshed,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
