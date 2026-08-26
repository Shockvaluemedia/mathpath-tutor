import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_DIAGNOSTIC_QUESTIONS,
  DEMO_MODE,
} from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import {
  findAssessmentQuestion,
  type SecuredDiagnosticQuestion,
} from "@/lib/learning/diagnostics/question-bank";
import { buildAssessmentEvidence } from "@/lib/learning/evidence";
import { recordLearningEvidenceBatchAndUpdateMastery } from "@/lib/learning/mastery";
import { recordMisconceptionEvidence } from "@/lib/learning/misconceptions";
import {
  MATH_MISCONCEPTION_CATALOG,
  detectMisconceptionSignatures,
} from "@/lib/math/misconceptions";
import { areMathAnswersEquivalent } from "@/lib/math/validators";
import type { EvaluationResult } from "@/lib/types";
import type { LearningEvidenceRecord } from "@/lib/learning/mastery";
import { evaluateInterventionsAfterEvidence } from "@/lib/learning/interventions";

interface SubmittedDiagnosticResponse {
  questionId?: unknown;
  skillId?: unknown;
  question?: unknown;
  studentAnswer?: unknown;
  learnerAnswer?: unknown;
  correctAnswer?: unknown;
  timeSpent?: unknown;
  responseTimeMs?: unknown;
  hintsUsed?: unknown;
  confidenceRating?: unknown;
}

function asRecord(value: unknown): SubmittedDiagnosticResponse {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as SubmittedDiagnosticResponse
    : {};
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asBoundedString(value: unknown, maximumLength: number): string | undefined {
  return asString(value)?.slice(0, maximumLength);
}

function clampInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(maximum, Math.max(minimum, value)));
}

function fallbackEvaluation(
  isCorrect: boolean,
  skillSlug: string,
  mistakeType: string | null = null
): EvaluationResult {
  return {
    isCorrect,
    mistakeType: isCorrect ? null : mistakeType ?? "conceptual",
    skillAffected: skillSlug,
    explanation: isCorrect
      ? "The response matches the stored answer key."
      : "The response does not match the stored answer key and needs follow-up.",
    nextAction: isCorrect ? "advance" : "reinforce",
  };
}

function authoritativeEvaluation(
  interpretation: EvaluationResult,
  isCorrect: boolean,
  skillSlug: string
): EvaluationResult {
  const nextAction = isCorrect
    ? "advance"
    : interpretation.nextAction === "advance"
      ? "reinforce"
      : interpretation.nextAction;
  return {
    ...interpretation,
    isCorrect,
    skillAffected: skillSlug,
    mistakeType: isCorrect ? null : interpretation.mistakeType ?? "conceptual",
    nextAction,
  };
}

async function updateMisconceptionHypotheses(input: {
  learnerId: string;
  skillId: string;
  skillSlug: string;
  responseId: string;
  question: string;
  learnerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}) {
  if (input.isCorrect) {
    const activeStates = await prisma.learnerMisconception.findMany({
      where: {
        learnerId: input.learnerId,
        status: { in: ["SUSPECTED", "LIKELY", "CONFIRMED", "RESOLVING"] },
        misconception: { skillId: input.skillId, isActive: true },
      },
      select: { misconception: { select: { code: true } } },
    });
    for (const state of activeStates) {
      await recordMisconceptionEvidence({
        learnerId: input.learnerId,
        misconceptionCode: state.misconception.code,
        direction: "CONTRADICTS",
        sourceType: "assessment-response",
        sourceId: input.responseId,
        observedAnswer: input.learnerAnswer,
        expectedAnswer: input.correctAnswer,
        weight: 0.5,
        metadata: { reasonCode: "CORRECT_RESPONSE_ON_HYPOTHESIS_SKILL" },
      });
    }
    return;
  }

  const matches = detectMisconceptionSignatures({
    skillId: input.skillId,
    skillSlug: input.skillSlug,
    question: input.question,
    learnerAnswer: input.learnerAnswer,
    correctAnswer: input.correctAnswer,
    isCorrect: false,
  }, MATH_MISCONCEPTION_CATALOG);
  if (matches.length === 0) return;

  const knownDefinitions = await prisma.misconception.findMany({
    where: { code: { in: matches.map((match) => match.code) }, isActive: true },
    select: { code: true },
  });
  const knownCodes = new Set(knownDefinitions.map((definition) => definition.code));
  for (const match of matches) {
    if (!knownCodes.has(match.code)) continue;
    await recordMisconceptionEvidence({
      learnerId: input.learnerId,
      misconceptionCode: match.code,
      direction: "SUPPORTS",
      sourceType: "assessment-response",
      sourceId: input.responseId,
      observedAnswer: match.evidence.observedAnswer,
      expectedAnswer: match.evidence.expectedAnswer,
      weight: match.confidence,
      metadata: {
        reasonCode: match.reasonCode,
        signatureType: match.evidence.signatureType,
      },
    });
  }
}

function demoQuestions(): SecuredDiagnosticQuestion[] {
  return Object.values(DEMO_DIAGNOSTIC_QUESTIONS).flat() as SecuredDiagnosticQuestion[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, studentId } = body;
    const submittedResponses = Array.isArray(body.responses) ? body.responses : [];

    if (!assessmentId || !studentId || submittedResponses.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (submittedResponses.length > 20) {
      return NextResponse.json({ error: "Too many responses in one request" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const questions = new Map(demoQuestions().map((question) => [question.id, question]));
      const evaluations = submittedResponses.map((rawResponse) => {
        const response = asRecord(rawResponse);
        const questionId = asString(response.questionId) ?? "";
        const question = questions.get(questionId);
        const learnerAnswer = asString(response.studentAnswer ?? response.learnerAnswer) ?? "";
        const isCorrect = question
          ? areMathAnswersEquivalent(learnerAnswer, question.correctAnswer).equivalent
          : false;
        return {
          ...fallbackEvaluation(isCorrect, question?.skillId ?? "unknown"),
          verified: Boolean(question),
          questionId,
        };
      });
      return NextResponse.json({
        evaluations,
        evidence: { mode: "demo", persisted: false },
      });
    }

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      select: { id: true, age: true, developmentalStage: true },
    });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, learnerId: studentId },
      select: { id: true, assessmentType: true, metadata: true, completedAt: true },
    });
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    if (assessment.completedAt) {
      return NextResponse.json({ error: "Assessment is already complete" }, { status: 409 });
    }
    const assessmentMetadata = assessment.metadata && typeof assessment.metadata === "object" && !Array.isArray(assessment.metadata)
      ? assessment.metadata as Record<string, unknown>
      : {};
    const requiresServerKey = assessmentMetadata.scoringAuthority === "SERVER_ANSWER_KEY";

    const mathDomain = await prisma.subjectDomain.findUnique({
      where: { slug: "mathematics" },
      select: { id: true },
    });
    if (!mathDomain) {
      return NextResponse.json({ error: "Domain not configured" }, { status: 500 });
    }

    const evaluations: Array<EvaluationResult & { verified: boolean; questionId?: string }> = [];
    const evidence: LearningEvidenceRecord[] = [];
    for (const rawResponse of submittedResponses) {
      const response = asRecord(rawResponse);
      const questionId = asString(response.questionId);
      const storedQuestion = questionId
        ? findAssessmentQuestion(assessment.metadata, questionId)
        : undefined;
      if (requiresServerKey && !storedQuestion) {
        return NextResponse.json(
          { error: "Question is not part of this assessment" },
          { status: 422 }
        );
      }

      const verified = Boolean(storedQuestion);
      const skillSlug = storedQuestion?.skillId ?? asBoundedString(response.skillId, 120);
      if (!skillSlug) continue;
      let skill = await prisma.learningSkill.findUnique({
        where: { domainId_slug: { domainId: mathDomain.id, slug: skillSlug } },
      });
      if (!skill && storedQuestion) {
        skill = await prisma.learningSkill.upsert({
          where: { domainId_slug: { domainId: mathDomain.id, slug: skillSlug } },
          create: {
            domainId: mathDomain.id,
            name: storedQuestion.skillName,
            slug: storedQuestion.skillId,
            description: `Diagnostic skill: ${storedQuestion.skillName}`,
            stageMin: "EARLY_CHILDHOOD",
            stageMax: "ADULT",
            gradeMin: 0,
            gradeMax: 12,
          },
          update: {},
        });
      }
      if (!skill) continue;

      const learnerAnswer = asBoundedString(
        response.studentAnswer ?? response.learnerAnswer,
        500
      ) ?? "";
      const correctAnswer = storedQuestion?.correctAnswer ?? asBoundedString(response.correctAnswer, 500) ?? "";
      const equivalence = areMathAnswersEquivalent(learnerAnswer, correctAnswer);
      const isCorrect = verified ? equivalence.equivalent : false;
      const question = storedQuestion?.question ?? asBoundedString(response.question, 2_000) ?? "";
      const timeSpentFromMilliseconds = typeof response.responseTimeMs === "number"
        ? Math.round(response.responseTimeMs / 1000)
        : 0;
      const timeSpent = clampInteger(
        response.timeSpent,
        0,
        30 * 60,
        clampInteger(timeSpentFromMilliseconds, 0, 30 * 60, 0)
      );
      const hintsUsed = clampInteger(response.hintsUsed, 0, 20, 0);
      const confidenceRating = clampInteger(response.confidenceRating, 1, 10, 5);

      const existingResponse = questionId
        ? await prisma.assessmentResponse.findUnique({
            where: { assessmentId_questionId: { assessmentId, questionId } },
          })
        : null;
      if (
        existingResponse && (
          existingResponse.learnerId !== studentId ||
          existingResponse.skillId !== skill.id ||
          (verified && (
            existingResponse.verificationMethod !== "SERVER_ANSWER_KEY" ||
            existingResponse.question !== question ||
            existingResponse.correctAnswer !== correctAnswer
          ))
        )
      ) {
        return NextResponse.json(
          { error: "Stored assessment response conflicts with its question key" },
          { status: 409 }
        );
      }
      let evaluation: EvaluationResult;
      if (existingResponse) {
        evaluation = fallbackEvaluation(
          existingResponse.isCorrect,
          skill.slug,
          existingResponse.mistakeType
        );
      } else if (verified) {
        try {
          const { evaluateResponse } = await import("@/lib/ai");
          const interpretation = await evaluateResponse({
            questionId: questionId!,
            skillId: skill.slug,
            question,
            learnerAnswer,
            correctAnswer,
            isCorrect,
            timeSpent,
            hintsUsed,
            confidenceRating,
          }, learner.age, learner.developmentalStage);
          evaluation = authoritativeEvaluation(interpretation, isCorrect, skill.slug);
        } catch {
          evaluation = fallbackEvaluation(isCorrect, skill.slug);
        }
      } else {
        evaluation = fallbackEvaluation(false, skill.slug, "unverified");
      }

      const responseData = {
        assessmentId,
        questionId: questionId ?? null,
        learnerId: studentId,
        skillId: skill.id,
        question,
        learnerAnswer,
        correctAnswer,
        isCorrect: verified ? isCorrect : false,
        timeSpent,
        hintsUsed,
        confidenceRating,
        mistakeType: evaluation.mistakeType,
        verificationMethod: verified ? "SERVER_ANSWER_KEY" : "UNVERIFIED_LEGACY",
        metadata: {
          answerEquivalenceMethod: verified ? equivalence.method : "UNVERIFIED",
          evidenceModelVersion: "evidence-v1",
        },
      };
      const persistedResponse = existingResponse ?? (verified && questionId
        ? await prisma.assessmentResponse.upsert({
            where: { assessmentId_questionId: { assessmentId, questionId } },
            create: responseData,
            update: {},
          })
        : await prisma.assessmentResponse.create({ data: responseData }));

      if (!existingResponse && verified) {
        await updateMisconceptionHypotheses({
          learnerId: studentId,
          skillId: skill.id,
          skillSlug: skill.slug,
          responseId: persistedResponse.id,
          question,
          learnerAnswer: persistedResponse.learnerAnswer,
          correctAnswer: persistedResponse.correctAnswer,
          isCorrect: persistedResponse.isCorrect,
        });
      }

      evidence.push(buildAssessmentEvidence(studentId, skill.id, {
        responseId: persistedResponse.id,
        idempotencyKey: verified && questionId
          ? `assessment:${assessment.id}:question:${questionId}`
          : undefined,
        questionId,
        learnerAnswer: persistedResponse.learnerAnswer,
        correctAnswer: persistedResponse.correctAnswer,
        isCorrect: persistedResponse.isCorrect,
        verified: persistedResponse.verificationMethod === "SERVER_ANSWER_KEY",
        hintsUsed: persistedResponse.hintsUsed,
        responseTimeMs: persistedResponse.timeSpent * 1000,
        confidenceRating: persistedResponse.confidenceRating,
        difficulty: storedQuestion?.difficulty,
        assessmentType: assessment.assessmentType,
        mistakeType: persistedResponse.mistakeType,
      }));
      evaluations.push({
        ...fallbackEvaluation(
          persistedResponse.isCorrect,
          skill.slug,
          persistedResponse.mistakeType
        ),
        ...evaluation,
        isCorrect: persistedResponse.verificationMethod === "SERVER_ANSWER_KEY"
          ? persistedResponse.isCorrect
          : false,
        verified: persistedResponse.verificationMethod === "SERVER_ANSWER_KEY",
        questionId,
      });
    }

    const masteryResult = await recordLearningEvidenceBatchAndUpdateMastery(evidence);
    if (masteryResult.insertedEvidenceCount > 0) {
      await evaluateInterventionsAfterEvidence({ learnerId: studentId, sourceType: "diagnostic", sourceId: assessmentId });
    }
    return NextResponse.json({
      evaluations,
      evidence: {
        inserted: masteryResult.insertedEvidenceCount,
        accepted: evidence.length,
      },
      mastery: masteryResult.projections,
    });
  } catch (error) {
    console.error("Submit diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
