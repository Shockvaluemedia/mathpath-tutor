export type AnswerEquivalenceMethod = "NUMERIC" | "FRACTION" | "NORMALIZED_TEXT";

export interface AnswerEquivalenceResult {
  equivalent: boolean;
  method: AnswerEquivalenceMethod;
  normalizedLearnerAnswer: string;
  normalizedCorrectAnswer: string;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/\s+/g, "")
    .replace(/^([a-z])=/, "")
    .replace(/^\((.*)\)$/, "$1");
}

function parseFraction(value: string): number | null {
  const match = value.match(/^(-?\d+)\/(-?\d+)$/);
  if (!match) return null;
  const denominator = Number(match[2]);
  if (denominator === 0) return null;
  return Number(match[1]) / denominator;
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/^\$/, "").replace(/,/g, "");
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScalar(value: string): { value: number; method: "NUMERIC" | "FRACTION" } | null {
  const fraction = parseFraction(value);
  if (fraction !== null) return { value: fraction, method: "FRACTION" };
  const number = parseNumber(value);
  return number === null ? null : { value: number, method: "NUMERIC" };
}

export function areMathAnswersEquivalent(
  learnerAnswer: string,
  correctAnswer: string
): AnswerEquivalenceResult {
  const normalizedLearnerAnswer = normalizeText(learnerAnswer);
  const normalizedCorrectAnswer = normalizeText(correctAnswer);
  const learnerScalar = parseScalar(normalizedLearnerAnswer);
  const correctScalar = parseScalar(normalizedCorrectAnswer);

  if (learnerScalar && correctScalar) {
    return {
      equivalent: Math.abs(learnerScalar.value - correctScalar.value) <= 1e-9,
      method: learnerScalar.method === "FRACTION" || correctScalar.method === "FRACTION"
        ? "FRACTION"
        : "NUMERIC",
      normalizedLearnerAnswer,
      normalizedCorrectAnswer,
    };
  }

  return {
    equivalent: normalizedLearnerAnswer === normalizedCorrectAnswer,
    method: "NORMALIZED_TEXT",
    normalizedLearnerAnswer,
    normalizedCorrectAnswer,
  };
}
