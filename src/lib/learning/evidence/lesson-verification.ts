import { areMathAnswersEquivalent } from "@/lib/math/validators";
import type { LessonResponseEvidenceInput } from "./builders";

const LESSON_SECTION_KEYS = new Set([
  "warmup",
  "miniLesson",
  "guidedPractice",
  "independentPractice",
  "challenge",
  "reflection",
]);

export interface SubmittedLessonResponse {
  questionId?: unknown;
  sectionKey?: unknown;
  questionIndex?: unknown;
  learnerAnswer?: unknown;
  answer?: unknown;
  hintsUsed?: unknown;
  responseTimeMs?: unknown;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStoredAnswer(
  lessonContent: unknown,
  sectionKey: string,
  questionIndex: number
): string | undefined {
  if (!lessonContent || typeof lessonContent !== "object" || Array.isArray(lessonContent)) {
    return undefined;
  }
  const section = (lessonContent as Record<string, unknown>)[sectionKey];
  if (!section || typeof section !== "object" || Array.isArray(section)) return undefined;
  const questions = (section as Record<string, unknown>).questions;
  if (!Array.isArray(questions)) return undefined;
  const question = questions[questionIndex];
  if (!question || typeof question !== "object" || Array.isArray(question)) return undefined;
  const answer = (question as Record<string, unknown>).answer;
  if (typeof answer === "string" || typeof answer === "number") return String(answer);
  return undefined;
}

function getStoredRepresentation(
  lessonContent: unknown,
  sectionKey: string
): string | undefined {
  if (!lessonContent || typeof lessonContent !== "object" || Array.isArray(lessonContent)) return undefined;
  const section = (lessonContent as Record<string, unknown>)[sectionKey];
  if (!section || typeof section !== "object" || Array.isArray(section)) return undefined;
  const representation = (section as Record<string, unknown>).representation;
  return typeof representation === "string" && representation.trim()
    ? representation.trim().slice(0, 80)
    : undefined;
}

export function verifyLessonResponses(
  lessonContent: unknown,
  submittedResponses: unknown[]
): LessonResponseEvidenceInput[] {
  const verifiedByQuestion = new Map<string, LessonResponseEvidenceInput>();
  const legacyResponses: LessonResponseEvidenceInput[] = [];

  for (const [fallbackIndex, rawResponse] of submittedResponses.entries()) {
    const response = rawResponse && typeof rawResponse === "object" && !Array.isArray(rawResponse)
      ? rawResponse as SubmittedLessonResponse
      : {};
    const sectionKey = typeof response.sectionKey === "string"
      ? response.sectionKey
      : undefined;
    const questionIndex = asFiniteNumber(response.questionIndex);
    const normalizedQuestionIndex = questionIndex === undefined
      ? undefined
      : Math.trunc(questionIndex);
    const learnerAnswerValue = response.learnerAnswer ?? response.answer;
    const learnerAnswer = typeof learnerAnswerValue === "string" || typeof learnerAnswerValue === "number"
      ? String(learnerAnswerValue)
      : "";
    const hintsUsed = asFiniteNumber(response.hintsUsed);
    const responseTimeMs = asFiniteNumber(response.responseTimeMs);

    if (
      !sectionKey ||
      !LESSON_SECTION_KEYS.has(sectionKey) ||
      normalizedQuestionIndex === undefined ||
      normalizedQuestionIndex < 0
    ) {
      legacyResponses.push({
        questionId: `legacy:${fallbackIndex}`,
        learnerAnswer,
        verified: false,
        hintsUsed,
        responseTimeMs,
      });
      continue;
    }

    const questionId = `${sectionKey}:${normalizedQuestionIndex}`;
    const correctAnswer = getStoredAnswer(
      lessonContent,
      sectionKey,
      normalizedQuestionIndex
    );
    if (correctAnswer === undefined) {
      legacyResponses.push({
        questionId: `legacy:${fallbackIndex}:${questionId}`,
        sectionKey,
        questionIndex: normalizedQuestionIndex,
        learnerAnswer,
        verified: false,
        hintsUsed,
        responseTimeMs,
      });
      continue;
    }

    verifiedByQuestion.set(questionId, {
      questionId,
      sectionKey,
      questionIndex: normalizedQuestionIndex,
      learnerAnswer,
      correctAnswer,
      isCorrect: areMathAnswersEquivalent(learnerAnswer, correctAnswer).equivalent,
      verified: true,
      hintsUsed,
      responseTimeMs,
      representation: getStoredRepresentation(lessonContent, sectionKey),
    });
  }

  return [...verifiedByQuestion.values(), ...legacyResponses];
}
