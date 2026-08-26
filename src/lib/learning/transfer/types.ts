import type { GeneratedProblem } from "@/lib/math/problem-generators";
import type { ThinkingCompetencyCode } from "../competencies";

export type TransferMode =
  | "DIFFERENT_REPRESENTATION"
  | "WORD_PROBLEM"
  | "UNFAMILIAR_NUMBERS"
  | "MIXED_SKILL"
  | "REAL_WORLD_MODELING"
  | "ERROR_ANALYSIS"
  | "REVERSE_PROBLEM"
  | "TEACH_BACK";

export interface TransferProblem extends GeneratedProblem {
  transferType: TransferMode;
  competencyCodes: ThinkingCompetencyCode[];
  gradingMode: "DETERMINISTIC" | "RUBRIC_REQUIRED";
}
