import type {
  MathResponseObservation,
  MisconceptionDefinition,
  MisconceptionMatch,
} from "@/lib/learning/misconceptions/types";

function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-");
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string" || !/^-?\d+$/.test(normalizeAnswer(value))) return null;
  return Number.parseInt(normalizeAnswer(value), 10);
}

function matchFractionComponentAddition(
  observation: MathResponseObservation
): boolean {
  const fractions = [...observation.question.matchAll(/(-?\d+)\s*\/\s*(-?\d+)/g)];
  if (fractions.length < 2) return false;
  const [left, right] = fractions;
  const numerator = Number(left[1]) + Number(right[1]);
  const denominator = Number(left[2]) + Number(right[2]);
  return normalizeAnswer(observation.learnerAnswer) === `${numerator}/${denominator}`;
}

function matchPartialDistribution(observation: MathResponseObservation): boolean {
  const expression = observation.question.match(
    /(-?\d+)\s*\(\s*([a-z])\s*([+-])\s*(\d+)\s*\)/i
  );
  if (!expression) return false;
  const factor = Number(expression[1]);
  const variable = expression[2].toLowerCase();
  const operator = expression[3];
  const constant = Number(expression[4]);
  const factorTerm = factor === 1 ? variable : `${factor}${variable}`;
  const partialAnswer = `${factorTerm}${operator}${constant}`;
  return normalizeAnswer(observation.learnerAnswer) === partialAnswer;
}

function matchNegativeSignConfusion(observation: MathResponseObservation): boolean {
  if (observation.structured?.kind !== "INTEGER_SUBTRACT_NEGATIVE") return false;
  const left = parseInteger(observation.structured.left);
  const subtractedMagnitude = parseInteger(observation.structured.subtractedMagnitude);
  const learnerAnswer = parseInteger(observation.learnerAnswer);
  if (left === null || subtractedMagnitude === null || learnerAnswer === null) return false;
  return learnerAnswer === left - subtractedMagnitude;
}

function matchEqualityNextStep(observation: MathResponseObservation): boolean {
  if (observation.structured?.kind !== "EQUALITY_MISSING_VALUE") return false;
  const leftValue = parseInteger(observation.structured.leftValue);
  const learnerAnswer = parseInteger(observation.learnerAnswer);
  if (leftValue === null || learnerAnswer === null) return false;
  return learnerAnswer === leftValue;
}

function matchesSignature(
  observation: MathResponseObservation,
  signatureType: string
): boolean {
  switch (signatureType) {
    case "FRACTION_COMPONENT_ADDITION":
      return matchFractionComponentAddition(observation);
    case "PARTIAL_DISTRIBUTION":
      return matchPartialDistribution(observation);
    case "NEGATIVE_SIGN_OPERATION_CONFUSION":
      return matchNegativeSignConfusion(observation);
    case "EQUALITY_NEXT_STEP":
      return matchEqualityNextStep(observation);
    default:
      return false;
  }
}

export function detectMisconceptionSignatures(
  observation: MathResponseObservation,
  definitions: MisconceptionDefinition[]
): MisconceptionMatch[] {
  if (observation.isCorrect) return [];

  return definitions
    .filter(
      (definition) =>
        definition.skillSlug === observation.skillSlug &&
        matchesSignature(observation, definition.signature.type)
    )
    .map((definition) => ({
      code: definition.code,
      confidence: 0.92,
      reasonCode: `DETERMINISTIC_SIGNATURE_MATCH:${definition.signature.type}`,
      evidence: {
        observedAnswer: observation.learnerAnswer,
        expectedAnswer: observation.correctAnswer,
        signatureType: definition.signature.type,
      },
    }));
}
