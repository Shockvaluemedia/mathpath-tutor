import type { LearningEvidenceRecord } from "../mastery/types";

export interface LessonResponseEvidenceInput {
  questionId?: string;
  sectionKey?: string;
  questionIndex?: number;
  learnerAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  verified: boolean;
  hintsUsed?: number;
  responseTimeMs?: number;
  representation?: string;
}

export interface AssessmentResponseEvidenceInput {
  responseId: string;
  idempotencyKey?: string;
  questionId?: string;
  learnerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  verified: boolean;
  hintsUsed?: number;
  responseTimeMs?: number;
  confidenceRating?: number;
  difficulty?: number;
  assessmentType?: string;
  mistakeType?: string | null;
}

function clampInteger(value: number | undefined, minimum: number, maximum: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.round(Math.min(maximum, Math.max(minimum, value)));
}

function lessonAssistance(sectionKey: string, hintsUsed: number): LearningEvidenceRecord["assistanceLevel"] {
  if (hintsUsed > 0) return "HINTED";
  if (sectionKey === "guidedPractice" || sectionKey === "warmup") return "GUIDED";
  if (sectionKey === "miniLesson") return "WORKED_EXAMPLE";
  return "INDEPENDENT";
}

function lessonStrategy(sectionKey: string): string {
  const strategies: Record<string, string> = {
    warmup: "REVIEW",
    miniLesson: "WORKED_EXAMPLE",
    guidedPractice: "GUIDED_PRACTICE",
    independentPractice: "INDEPENDENT_PRACTICE",
    challenge: "CHALLENGE",
    reflection: "TEACH_BACK",
  };
  return strategies[sectionKey] ?? "INDEPENDENT_PRACTICE";
}

function lessonDifficulty(sectionKey: string): number {
  const difficulty: Record<string, number> = {
    warmup: 1.5,
    miniLesson: 2,
    guidedPractice: 2.5,
    independentPractice: 3,
    challenge: 4,
    reflection: 2,
  };
  return difficulty[sectionKey] ?? 3;
}

export function buildLessonEvidence(
  learnerId: string,
  skillId: string,
  lessonId: string,
  responses: LessonResponseEvidenceInput[],
  occurredAt = new Date()
): LearningEvidenceRecord[] {
  if (responses.length === 0) {
    return [{
      idempotencyKey: `lesson:${lessonId}:exposure`,
      learnerId,
      skillId,
      evidenceType: "EXPOSURE",
      outcome: "UNGRADED",
      assistanceLevel: "NONE",
      sourceType: "learning-module",
      sourceId: lessonId,
      instructionalStrategy: "EXPOSURE",
      metadata: { reasonCode: "LESSON_COMPLETED_WITHOUT_GRADED_RESPONSES" },
      occurredAt,
    }];
  }

  return responses.map((response, index) => {
    const sectionKey = response.sectionKey ?? "unknown";
    const questionIndex = response.questionIndex ?? index;
    const questionId = response.questionId ?? `${sectionKey}:${questionIndex}`;
    const hintsUsed = clampInteger(response.hintsUsed, 0, 20) ?? 0;
    const responseTimeMs = clampInteger(response.responseTimeMs, 0, 30 * 60 * 1000);

    return {
      idempotencyKey: `lesson:${lessonId}:${questionId}`,
      learnerId,
      skillId,
      evidenceType: "PRACTICE",
      outcome: response.verified
        ? response.isCorrect ? "CORRECT" : "INCORRECT"
        : "UNGRADED",
      assistanceLevel: lessonAssistance(sectionKey, hintsUsed),
      sourceType: "learning-module",
      sourceId: lessonId,
      learnerAnswer: response.learnerAnswer,
      correctAnswer: response.verified ? response.correctAnswer : undefined,
      hintsUsed,
      responseTimeMs,
      expectedResponseTimeMs: sectionKey === "challenge" ? 120_000 : 75_000,
      difficulty: lessonDifficulty(sectionKey),
      instructionalStrategy: lessonStrategy(sectionKey),
      representation: response.representation,
      metadata: {
        questionId,
        questionIndex,
        sectionKey,
        verification: response.verified ? "SERVER_LESSON_ANSWER_KEY" : "UNVERIFIED_LEGACY_RESPONSE",
      },
      occurredAt,
    };
  });
}

export function buildAssessmentEvidence(
  learnerId: string,
  skillId: string,
  input: AssessmentResponseEvidenceInput,
  occurredAt = new Date()
): LearningEvidenceRecord {
  const hintsUsed = clampInteger(input.hintsUsed, 0, 20) ?? 0;
  const difficulty = input.difficulty === undefined
    ? undefined
    : Math.min(5, Math.max(1, input.difficulty));
  const normalizedAssessmentType = input.assessmentType?.toLowerCase();
  const evidenceType = normalizedAssessmentType === "review"
    ? "RETENTION"
    : normalizedAssessmentType === "transfer"
      ? "TRANSFER"
      : "ASSESSMENT";

  return {
    idempotencyKey: input.idempotencyKey ?? `assessment-response:${input.responseId}`,
    learnerId,
    skillId,
    evidenceType,
    outcome: input.verified
      ? input.isCorrect ? "CORRECT" : "INCORRECT"
      : "UNGRADED",
    assistanceLevel: hintsUsed > 0 ? "HINTED" : "INDEPENDENT",
    sourceType: "assessment-response",
    sourceId: input.responseId,
    learnerAnswer: input.learnerAnswer,
    correctAnswer: input.verified ? input.correctAnswer : undefined,
    hintsUsed,
    responseTimeMs: clampInteger(input.responseTimeMs, 0, 30 * 60 * 1000),
    expectedResponseTimeMs: Math.round(45_000 + (difficulty ?? 3) * 15_000),
    confidenceRating: input.confidenceRating === undefined
      ? undefined
      : Math.min(10, Math.max(1, input.confidenceRating)),
    difficulty,
    metadata: {
      assessmentType: input.assessmentType ?? "diagnostic",
      questionId: input.questionId,
      mistakeType: input.mistakeType ?? undefined,
      verification: input.verified ? "SERVER_ASSESSMENT_ANSWER_KEY" : "UNVERIFIED_LEGACY_RESPONSE",
    },
    occurredAt,
  };
}
