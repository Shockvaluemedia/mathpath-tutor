import { areMathAnswersEquivalent } from "../validators";
import { pickOne, randomInteger, seededRandom } from "./seeded-random";
import type { GenerateProblemInput, GeneratedProblem, ProblemDistractor, ProblemTemplateCode } from "./types";

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fraction(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator);
  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = denominator / divisor;
  return simplifiedDenominator === 1
    ? String(simplifiedNumerator)
    : `${simplifiedNumerator}/${simplifiedDenominator}`;
}

function uniqueDistractors(correctAnswer: string, values: ProblemDistractor[]): ProblemDistractor[] {
  const seen = new Set([correctAnswer]);
  return values.filter((distractor) => {
    if (seen.has(distractor.value)) return false;
    seen.add(distractor.value);
    return true;
  }).slice(0, 3);
}

function templateForSkill(input: GenerateProblemInput): ProblemTemplateCode | null {
  if (input.preferredTemplate) return input.preferredTemplate;
  const key = `${input.skillSlug ?? ""} ${input.skillName}`.toLowerCase();
  if (/equation|pre-algebra|variable/.test(key)) return "ONE_STEP_LINEAR_EQUATION";
  if (/fraction/.test(key)) return "SAME_DENOMINATOR_FRACTION_ADDITION";
  if (/decimal/.test(key)) return "DECIMAL_ADDITION";
  if (/division|divide/.test(key)) return "EXACT_DIVISION";
  if (/multiplication|multiply/.test(key)) return "MULTIPLICATION_FACT";
  if (/subtraction|subtract/.test(key)) return "INTEGER_SUBTRACTION";
  if (/addition|integer/.test(key)) return "INTEGER_ADDITION";
  return null;
}

function base(
  input: GenerateProblemInput,
  templateCode: ProblemTemplateCode,
  templateName: string,
  details: Omit<GeneratedProblem, "templateCode" | "templateName" | "generatorVersion" | "seed" | "targetSkillId" | "prerequisiteSkillIds" | "difficulty" | "validation" | "explanation" | "transferType" | "competencyCodes"> & { explanation?: string }
): GeneratedProblem {
  const { explanation = `The correct answer is ${details.correctAnswer}.`, ...problemDetails } = details;
  const candidate: GeneratedProblem = {
    templateCode,
    templateName,
    generatorVersion: "math-problems-v1",
    seed: input.seed,
    targetSkillId: input.targetSkillId,
    prerequisiteSkillIds: input.prerequisiteSkillIds ?? [],
    difficulty: Math.min(5, Math.max(1, Math.round(input.difficulty))),
    ...problemDetails,
    explanation,
    transferType: null,
    competencyCodes: [],
    validation: { valid: true, checks: [] },
  };
  const validation = validateGeneratedProblem(candidate);
  if (!validation.valid) {
    throw new Error(`Invalid generated problem ${templateCode}: ${validation.errors.join(", ")}`);
  }
  return { ...candidate, validation: { valid: true, checks: validation.checks } };
}

export function validateGeneratedProblem(problem: GeneratedProblem): { valid: boolean; errors: string[]; checks: string[] } {
  const errors: string[] = [];
  const checks = ["NONEMPTY_PROMPT", "STRUCTURAL_SOLUTION", "DISTRACTORS_DIFFER_FROM_ANSWER"];
  if (!problem.prompt.trim()) errors.push("EMPTY_PROMPT");
  if (!problem.correctAnswer.trim()) errors.push("EMPTY_ANSWER");
  if (problem.requiredOperationCount < 1) errors.push("INVALID_OPERATION_COUNT");
  const parameters = problem.parameters;
  let structuralAnswer: string | null = null;
  if (problem.templateCode === "INTEGER_ADDITION") structuralAnswer = String(Number(parameters.left) + Number(parameters.right));
  if (problem.templateCode === "INTEGER_SUBTRACTION") structuralAnswer = String(Number(parameters.left) - Number(parameters.right));
  if (problem.templateCode === "MULTIPLICATION_FACT") structuralAnswer = String(Number(parameters.left) * Number(parameters.right));
  if (problem.templateCode === "EXACT_DIVISION") structuralAnswer = String(Number(parameters.dividend) / Number(parameters.divisor));
  if (problem.templateCode === "SAME_DENOMINATOR_FRACTION_ADDITION") {
    structuralAnswer = fraction(Number(parameters.leftNumerator) + Number(parameters.rightNumerator), Number(parameters.denominator));
  }
  if (problem.templateCode === "DECIMAL_ADDITION") structuralAnswer = String(Number(parameters.left) + Number(parameters.right));
  if (problem.templateCode === "ONE_STEP_LINEAR_EQUATION") structuralAnswer = String(parameters.solution);
  if (!structuralAnswer || !areMathAnswersEquivalent(structuralAnswer, problem.correctAnswer).equivalent) {
    errors.push("STRUCTURAL_ANSWER_MISMATCH");
  }
  if (problem.distractors.some((item) => areMathAnswersEquivalent(item.value, problem.correctAnswer).equivalent)) {
    errors.push("DISTRACTOR_EQUALS_ANSWER");
  }
  if (new Set(problem.distractors.map((item) => item.value)).size !== problem.distractors.length) {
    errors.push("DUPLICATE_DISTRACTOR");
  }
  return { valid: errors.length === 0, errors, checks };
}

export function generateProblem(input: GenerateProblemInput): GeneratedProblem | null {
  const template = templateForSkill(input);
  if (!template) return null;
  const difficulty = Math.min(5, Math.max(1, Math.round(input.difficulty)));
  const random = seededRandom(`${template}:${input.seed}:${difficulty}`);
  const magnitude = 5 + difficulty * 5;
  const useContext = random() > 0.72;

  if (template === "INTEGER_ADDITION" || template === "INTEGER_SUBTRACTION") {
    const allowNegative = difficulty >= 3;
    const minimum = allowNegative ? -magnitude : 0;
    const left = randomInteger(random, minimum, magnitude);
    const right = randomInteger(random, minimum, magnitude);
    const subtract = template === "INTEGER_SUBTRACTION";
    const answer = subtract ? left - right : left + right;
    const operation = subtract ? "-" : "+";
    const prompt = useContext && !allowNegative
      ? `A game score starts at ${left} points and ${subtract ? "loses" : "gains"} ${right} points. What is the new score?`
      : `What is ${left} ${operation} ${right}?`;
    return base(input, template, subtract ? "Integer Subtraction" : "Integer Addition", {
      prompt,
      correctAnswer: String(answer),
      answerType: "numeric",
      parameters: { left, right, operation, allowNegative },
      constraints: { integerRange: [minimum, magnitude], allowNegative, requiredOperationCount: 1, realWorldContext: true },
      distractors: uniqueDistractors(String(answer), [
        { value: String(subtract ? left + right : left - right), misconceptionCode: "OPERATION_REVERSAL" },
        { value: String(-answer), misconceptionCode: "SIGN_REVERSAL" },
        { value: String(answer + 1), misconceptionCode: null },
      ]),
      representationType: useContext ? "real-world-context" : "symbolic",
      contextType: useContext ? "game-score" : null,
      requiredOperationCount: 1,
    });
  }

  if (template === "MULTIPLICATION_FACT") {
    const left = randomInteger(random, 2, 5 + difficulty * 2);
    const right = randomInteger(random, 2, 5 + difficulty * 2);
    const answer = left * right;
    return base(input, template, "Multiplication", {
      prompt: useContext ? `There are ${left} rows with ${right} seats in each row. How many seats are there?` : `What is ${left} x ${right}?`,
      correctAnswer: String(answer), answerType: "numeric",
      parameters: { left, right, operation: "multiply" },
      constraints: { integerRange: [2, 15], allowNegative: false, requiredOperationCount: 1, realWorldContext: true },
      distractors: uniqueDistractors(String(answer), [
        { value: String(left + right), misconceptionCode: "MULTIPLICATION_AS_ADDITION" },
        { value: String(answer - left), misconceptionCode: null },
        { value: String(answer + right), misconceptionCode: null },
      ]),
      representationType: useContext ? "real-world-context" : "symbolic", contextType: useContext ? "array" : null, requiredOperationCount: 1,
    });
  }

  if (template === "EXACT_DIVISION") {
    const divisor = randomInteger(random, 2, 5 + difficulty * 2);
    const quotient = randomInteger(random, 2, 5 + difficulty * 2);
    const dividend = divisor * quotient;
    return base(input, template, "Exact Division", {
      prompt: useContext ? `${dividend} items are shared equally among ${divisor} groups. How many items are in each group?` : `What is ${dividend} / ${divisor}?`,
      correctAnswer: String(quotient), answerType: "numeric",
      parameters: { dividend, divisor, quotient, operation: "divide" },
      constraints: { exactDivision: true, nonzeroDivisor: true, requiredOperationCount: 1, realWorldContext: true },
      distractors: uniqueDistractors(String(quotient), [
        { value: String(dividend - divisor), misconceptionCode: "DIVISION_AS_SUBTRACTION" },
        { value: String(divisor), misconceptionCode: "DIVISOR_QUOTIENT_CONFUSION" },
        { value: String(quotient + 1), misconceptionCode: null },
      ]),
      representationType: useContext ? "real-world-context" : "symbolic", contextType: useContext ? "equal-groups" : null, requiredOperationCount: 1,
    });
  }

  if (template === "SAME_DENOMINATOR_FRACTION_ADDITION") {
    const denominator = randomInteger(random, 3, 6 + difficulty * 2);
    const leftNumerator = randomInteger(random, 1, denominator - 1);
    const rightNumerator = randomInteger(random, 1, denominator - 1);
    const answer = fraction(leftNumerator + rightNumerator, denominator);
    return base(input, template, "Add Fractions with a Common Denominator", {
      prompt: `What is ${leftNumerator}/${denominator} + ${rightNumerator}/${denominator}? Simplify if possible.`,
      correctAnswer: answer, answerType: "free-response",
      parameters: { leftNumerator, rightNumerator, denominator, operation: "add" },
      constraints: { fractions: true, sameDenominator: true, simplifyAnswer: true, requiredOperationCount: 1 },
      distractors: uniqueDistractors(answer, [
        { value: fraction(leftNumerator + rightNumerator, denominator * 2), misconceptionCode: "FRACTION_COMPONENT_ADDITION" },
        { value: fraction(Math.abs(leftNumerator - rightNumerator), denominator), misconceptionCode: "OPERATION_REVERSAL" },
        { value: `${leftNumerator + rightNumerator}/${denominator + 1}`, misconceptionCode: null },
      ]),
      representationType: "symbolic", contextType: null, requiredOperationCount: 1,
    });
  }

  if (template === "DECIMAL_ADDITION") {
    const scale = difficulty >= 3 ? 100 : 10;
    const leftUnits = randomInteger(random, 1, magnitude * scale / 10);
    const rightUnits = randomInteger(random, 1, magnitude * scale / 10);
    const left = leftUnits / scale;
    const right = rightUnits / scale;
    const answer = (left + right).toFixed(scale === 100 ? 2 : 1).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
    return base(input, template, "Decimal Addition", {
      prompt: `What is ${left} + ${right}?`, correctAnswer: answer, answerType: "numeric",
      parameters: { left, right, decimalPlaces: scale === 100 ? 2 : 1, operation: "add" },
      constraints: { decimals: true, decimalPlaces: scale === 100 ? 2 : 1, requiredOperationCount: 1 },
      distractors: uniqueDistractors(answer, [
        { value: String((leftUnits + rightUnits) / 10), misconceptionCode: "DECIMAL_PLACE_VALUE_SHIFT" },
        { value: String(Math.abs(left - right)), misconceptionCode: "OPERATION_REVERSAL" },
        { value: String(Number(answer) + 0.1), misconceptionCode: null },
      ]),
      representationType: "symbolic", contextType: null, requiredOperationCount: 1,
    });
  }

  const allowNegative = difficulty >= 3;
  const integerMinimum = allowNegative ? -10 - difficulty * 2 : 1;
  const solution = randomInteger(random, integerMinimum, 10 + difficulty * 2);
  const operation = pickOne(random, difficulty >= 3 ? ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"] as const : ["ADD", "SUBTRACT"] as const);
  const reversed = random() > 0.5;
  let constant = randomInteger(random, 2, 4 + difficulty * 2);
  let expression: string;
  let result: number;
  if (operation === "ADD") {
    result = solution + constant;
    expression = `x + ${constant}`;
  } else if (operation === "SUBTRACT") {
    result = solution - constant;
    expression = `x - ${constant}`;
  } else if (operation === "MULTIPLY") {
    result = solution * constant;
    expression = `${constant}x`;
  } else {
    if (solution === 0) constant = 2;
    result = solution;
    const quotient = solution;
    const dividend = quotient * constant;
    expression = `x / ${constant}`;
    result = quotient;
    return base(input, template, "One-Step Linear Equation", {
      prompt: `Solve for x: ${reversed ? `${result} = ${expression}` : `${expression} = ${result}`}`,
      correctAnswer: String(dividend), answerType: "numeric",
      parameters: { solution: dividend, constant, result, operation, unknownPosition: reversed ? "right" : "left", allowNegative },
      constraints: { integerRange: [integerMinimum, 20], unknownPosition: "either", allowNegative, operations: ["add", "subtract", "multiply", "divide"], requiredOperationCount: 1 },
      distractors: uniqueDistractors(String(dividend), [
        { value: String(-dividend), misconceptionCode: "SIGN_REVERSAL" },
        { value: String(result / constant), misconceptionCode: "INVERSE_OPERATION_REVERSAL" },
        { value: String(dividend + constant), misconceptionCode: null },
      ]),
      representationType: "symbolic", contextType: null, requiredOperationCount: 1,
    });
  }
  return base(input, template, "One-Step Linear Equation", {
    prompt: `Solve for x: ${reversed ? `${result} = ${expression}` : `${expression} = ${result}`}`,
    correctAnswer: String(solution), answerType: "numeric",
    parameters: { solution, constant, result, operation, unknownPosition: reversed ? "right" : "left", allowNegative },
    constraints: { integerRange: [integerMinimum, 20], unknownPosition: "either", allowNegative, operations: ["add", "subtract", "multiply", "divide"], requiredOperationCount: 1 },
    distractors: uniqueDistractors(String(solution), [
      { value: String(-solution), misconceptionCode: "SIGN_REVERSAL" },
      { value: String(operation === "ADD" ? result + constant : result - constant), misconceptionCode: "INVERSE_OPERATION_REVERSAL" },
      { value: String(solution + 1), misconceptionCode: null },
    ]),
    representationType: "symbolic", contextType: null, requiredOperationCount: 1,
  });
}
