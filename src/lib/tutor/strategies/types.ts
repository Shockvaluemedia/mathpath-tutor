export type InstructionalStrategy =
  | "SOCRATIC"
  | "CONCRETE_EXAMPLE"
  | "VISUAL"
  | "WORKED_EXAMPLE"
  | "ANALOGY"
  | "ERROR_ANALYSIS"
  | "TEACH_BACK"
  | "GUIDED_PRACTICE"
  | "INDEPENDENT_PRACTICE"
  | "CHALLENGE"
  | "REVIEW"
  | "CONFIDENCE_RECOVERY";

export interface InstructionalStrategyDefinition {
  strategy: InstructionalStrategy;
  purpose: string;
  tutorGuidance: string;
  cognitiveLoad: "LOW" | "MODERATE" | "HIGH";
}
