export type ProblemTemplateCode =
  | "INTEGER_ADDITION"
  | "INTEGER_SUBTRACTION"
  | "MULTIPLICATION_FACT"
  | "EXACT_DIVISION"
  | "SAME_DENOMINATOR_FRACTION_ADDITION"
  | "DECIMAL_ADDITION"
  | "ONE_STEP_LINEAR_EQUATION";

export interface ProblemDistractor {
  value: string;
  misconceptionCode: string | null;
}

export interface GeneratedProblem {
  templateCode: ProblemTemplateCode;
  templateName: string;
  generatorVersion: "math-problems-v1";
  seed: string;
  targetSkillId: string;
  prerequisiteSkillIds: string[];
  difficulty: number;
  prompt: string;
  correctAnswer: string;
  explanation: string;
  answerType: "numeric" | "free-response";
  parameters: Record<string, string | number | boolean>;
  constraints: Record<string, unknown>;
  distractors: ProblemDistractor[];
  representationType: "symbolic" | "real-world-context";
  contextType: string | null;
  transferType: string | null;
  competencyCodes: string[];
  requiredOperationCount: number;
  validation: { valid: true; checks: string[] };
}

export interface GenerateProblemInput {
  targetSkillId: string;
  skillSlug?: string;
  skillName: string;
  prerequisiteSkillIds?: string[];
  difficulty: number;
  seed: string;
  preferredTemplate?: ProblemTemplateCode;
}
