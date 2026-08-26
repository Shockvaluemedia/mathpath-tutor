export interface SecuredDiagnosticQuestion {
  id: string;
  skillId: string;
  skillName: string;
  question: string;
  difficulty: number;
  hints: string[];
  correctAnswer: string;
  answerType: "multiple-choice" | "free-response" | "numeric" | "open-ended";
  options?: string[];
  gradeBand?: string;
}

export type PublicDiagnosticQuestion = Omit<SecuredDiagnosticQuestion, "correctAnswer">;

export interface StoredAssessmentQuestion {
  id: string;
  skillId: string;
  skillName: string;
  question: string;
  correctAnswer: string;
  difficulty: number;
  hints: string[];
  answerType: SecuredDiagnosticQuestion["answerType"];
  options?: string[];
  gradeBand?: string;
}

const ANSWER_TYPES = new Set<SecuredDiagnosticQuestion["answerType"]>([
  "multiple-choice",
  "free-response",
  "numeric",
  "open-ended",
]);

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asMetadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function normalizeDiagnosticQuestions(
  rawQuestions: unknown[],
  batchId: string
): SecuredDiagnosticQuestion[] {
  return rawQuestions.flatMap((rawQuestion, index) => {
    const raw = asMetadataRecord(rawQuestion);
    const skillId = asString(raw.skillId);
    const skillName = asString(raw.skillName) ?? skillId;
    const question = asString(raw.question);
    const correctAnswer = asString(raw.correctAnswer);
    if (!skillId || !skillName || !question || correctAnswer === undefined) return [];

    const rawDifficulty = typeof raw.difficulty === "number" ? raw.difficulty : 3;
    const difficulty = Math.min(5, Math.max(1, rawDifficulty));
    const requestedAnswerType = asString(raw.answerType) as SecuredDiagnosticQuestion["answerType"] | undefined;
    const requestedOptions = asStringArray(raw.options);
    const answerType = requestedAnswerType === "multiple-choice" && requestedOptions.length < 2
      ? "free-response"
      : requestedAnswerType && ANSWER_TYPES.has(requestedAnswerType)
      ? requestedAnswerType
      : "free-response";
    const originalId = asString(raw.id) ?? String(index + 1);
    const gradeBand = asString(raw.gradeBand) ?? asString(raw.stage);

    return [{
      id: `${batchId}:${index + 1}:${originalId}`,
      skillId,
      skillName,
      question,
      difficulty,
      hints: asStringArray(raw.hints),
      correctAnswer,
      answerType,
      options: answerType === "multiple-choice" ? requestedOptions : undefined,
      gradeBand,
    }];
  });
}

export function buildAssessmentQuestionBank(
  questions: SecuredDiagnosticQuestion[]
): StoredAssessmentQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    skillId: question.skillId,
    skillName: question.skillName,
    question: question.question,
    correctAnswer: question.correctAnswer,
    difficulty: question.difficulty,
    hints: question.hints,
    answerType: question.answerType,
    options: question.options,
    gradeBand: question.gradeBand,
  }));
}

export function readAssessmentQuestionBank(metadata: unknown): StoredAssessmentQuestion[] {
  const rawBank = asMetadataRecord(metadata).questionBank;
  if (!Array.isArray(rawBank)) return [];

  return rawBank.flatMap((entry) => {
    const raw = asMetadataRecord(entry);
    const id = asString(raw.id);
    const skillId = asString(raw.skillId);
    const skillName = asString(raw.skillName) ?? skillId;
    const question = asString(raw.question);
    const correctAnswer = asString(raw.correctAnswer);
    const difficulty = typeof raw.difficulty === "number"
      ? Math.min(5, Math.max(1, raw.difficulty))
      : 3;
    const requestedAnswerType = asString(raw.answerType) as SecuredDiagnosticQuestion["answerType"] | undefined;
    const options = asStringArray(raw.options);
    const answerType = requestedAnswerType === "multiple-choice" && options.length < 2
      ? "free-response"
      : requestedAnswerType && ANSWER_TYPES.has(requestedAnswerType)
        ? requestedAnswerType
        : "free-response";
    if (!id || !skillId || !skillName || !question || correctAnswer === undefined) return [];
    return [{
      id,
      skillId,
      skillName,
      question,
      correctAnswer,
      difficulty,
      hints: asStringArray(raw.hints),
      answerType,
      options: answerType === "multiple-choice" ? options : undefined,
      gradeBand: asString(raw.gradeBand),
    }];
  });
}

export function mergeAssessmentQuestionBank(
  existing: StoredAssessmentQuestion[],
  incoming: StoredAssessmentQuestion[]
): StoredAssessmentQuestion[] {
  const merged = new Map(existing.map((question) => [question.id, question]));
  for (const question of incoming) {
    const previous = merged.get(question.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(question)) {
      throw new Error(`Assessment question ID collision: ${question.id}`);
    }
    merged.set(question.id, question);
  }
  return [...merged.values()];
}

export function metadataWithQuestionBank(
  metadata: unknown,
  questionBank: StoredAssessmentQuestion[]
): Record<string, unknown> {
  return {
    ...asMetadataRecord(metadata),
    questionBank,
    scoringAuthority: "SERVER_ANSWER_KEY",
    evidenceModelVersion: "evidence-v1",
  };
}

export function stripDiagnosticAnswerKeys(
  questions: SecuredDiagnosticQuestion[]
): PublicDiagnosticQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    skillId: question.skillId,
    skillName: question.skillName,
    question: question.question,
    difficulty: question.difficulty,
    hints: question.hints,
    answerType: question.answerType,
    options: question.options,
    gradeBand: question.gradeBand,
  }));
}

export function findAssessmentQuestion(
  metadata: unknown,
  questionId: string
): StoredAssessmentQuestion | undefined {
  return readAssessmentQuestionBank(metadata).find((question) => question.id === questionId);
}

export function restoreSecuredDiagnosticQuestion(
  question: StoredAssessmentQuestion
): SecuredDiagnosticQuestion {
  return { ...question };
}
