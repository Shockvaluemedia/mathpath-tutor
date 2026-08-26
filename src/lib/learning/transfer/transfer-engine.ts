import { generateProblem, type GenerateProblemInput } from "@/lib/math/problem-generators";
import type { ThinkingCompetencyCode } from "../competencies";
import type { TransferMode, TransferProblem } from "./types";

const COMPETENCIES: Record<TransferMode, ThinkingCompetencyCode[]> = {
  DIFFERENT_REPRESENTATION: ["REPRESENTATION_SWITCHING", "REASONING", "TRANSFER"],
  WORD_PROBLEM: ["MODELING", "DECOMPOSITION", "TRANSFER"],
  UNFAMILIAR_NUMBERS: ["STRATEGY_SELECTION", "TRANSFER"],
  MIXED_SKILL: ["DECOMPOSITION", "STRATEGY_SELECTION", "TRANSFER"],
  REAL_WORLD_MODELING: ["MODELING", "ESTIMATION", "TRANSFER"],
  ERROR_ANALYSIS: ["ERROR_CHECKING", "REASONING"],
  REVERSE_PROBLEM: ["ABSTRACTION", "REASONING", "TRANSFER"],
  TEACH_BACK: ["PROOF_EXPLANATION", "REASONING"],
};

export function generateTransferProblem(input: GenerateProblemInput, mode: TransferMode): TransferProblem | null {
  const adjustedInput = mode === "UNFAMILIAR_NUMBERS"
    ? { ...input, difficulty: Math.min(5, input.difficulty + 1), seed: `${input.seed}:unfamiliar` }
    : input;
  const problem = generateProblem(adjustedInput);
  if (!problem) return null;
  const competencyCodes = COMPETENCIES[mode];
  let prompt = problem.prompt;
  let correctAnswer = problem.correctAnswer;
  let explanation = problem.explanation;
  let gradingMode: TransferProblem["gradingMode"] = "DETERMINISTIC";
  let representationType = problem.representationType;
  let contextType = problem.contextType;
  let requiredOperationCount = problem.requiredOperationCount;
  const parameters: Record<string, string | number | boolean> = {
    ...problem.parameters,
    baseCorrectAnswer: problem.correctAnswer,
  };

  if (mode === "DIFFERENT_REPRESENTATION") {
    prompt = `Represent the quantities with a number line or model, then solve: ${problem.prompt}`;
    representationType = "symbolic";
  }
  if (mode === "WORD_PROBLEM" || mode === "REAL_WORLD_MODELING") {
    prompt = `Use the situation to build and solve a mathematical model: ${problem.prompt}`;
    representationType = "real-world-context";
    contextType = mode === "WORD_PROBLEM" ? "word-problem" : "real-world-modeling";
  }
  if (mode === "MIXED_SKILL") {
    const numeric = Number(problem.correctAnswer);
    if (Number.isFinite(numeric)) {
      const adjustment = Math.max(2, problem.difficulty);
      prompt = `First solve this problem, then add ${adjustment} to your result: ${problem.prompt}`;
      correctAnswer = String(numeric + adjustment);
      explanation = `The first result is ${problem.correctAnswer}; adding ${adjustment} gives ${correctAnswer}.`;
      parameters.transferAdjustment = adjustment;
      requiredOperationCount += 1;
    }
  }
  if (mode === "ERROR_ANALYSIS") {
    const proposed = problem.distractors[0]?.value ?? `${problem.correctAnswer}0`;
    prompt = `A learner answered "${proposed}" for this problem: ${problem.prompt} Is that answer correct? Enter yes or no.`;
    correctAnswer = "no";
    explanation = `No. The verified answer is ${problem.correctAnswer}.`;
    parameters.proposedIncorrectAnswer = proposed;
  }
  if (mode === "REVERSE_PROBLEM") {
    prompt = `Work backward and find the value that makes this statement true: ${problem.prompt}`;
  }
  if (mode === "TEACH_BACK") {
    prompt = `Explain how you would solve this and why your method works: ${problem.prompt}`;
    correctAnswer = "RUBRIC_REQUIRED";
    explanation = "A tutor or evaluation rubric must verify the mathematical explanation.";
    gradingMode = "RUBRIC_REQUIRED";
  }

  return {
    ...problem,
    prompt,
    correctAnswer,
    explanation,
    parameters,
    representationType,
    contextType,
    requiredOperationCount,
    transferType: mode,
    competencyCodes,
    gradingMode,
    validation: {
      valid: true,
      checks: [...problem.validation.checks, `TRANSFER_MODE:${mode}`, `GRADING_MODE:${gradingMode}`],
    },
  };
}
