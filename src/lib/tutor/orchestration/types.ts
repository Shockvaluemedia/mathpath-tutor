import type { InstructionalStrategy } from "../strategies";

export type TutorAction =
  | "ASK_GUIDING_QUESTION"
  | "GIVE_HINT"
  | "EXPLAIN_CONCEPT"
  | "SWITCH_REPRESENTATION"
  | "PROVIDE_CONCRETE_EXAMPLE"
  | "PROVIDE_WORKED_EXAMPLE"
  | "ASK_TEACH_BACK"
  | "OFFER_ERROR_ANALYSIS"
  | "MOVE_TO_PREREQUISITE"
  | "INCREASE_CHALLENGE"
  | "REDUCE_COGNITIVE_LOAD"
  | "SCHEDULE_REVIEW"
  | "TRIGGER_CONFIDENCE_RECOVERY"
  | "TRIGGER_INTERVENTION";

export interface TutorSkillSummary {
  skillId: string;
  slug: string;
  name: string;
  masteryProbability: number;
  uncertainty: number;
  status: string;
  gradeMax?: number;
}

export interface TutorPatternSummary {
  patternType: string;
  scopeKey: string;
  statement: string;
  confidence: number;
}

export interface TutorMisconceptionSummary {
  code: string;
  name: string;
  probability: number;
  status: string;
}

export interface TutorStrategySummary {
  strategy: string;
  attempts: number;
  averageOutcomeScore: number;
}

export interface TutorLearnerState {
  learnerId: string;
  developmentalStage: string;
  grade: number;
  confidenceLevel: number;
  currentFrustration: boolean;
  targetSkill: TutorSkillSummary | null;
  prerequisiteBlocker: TutorSkillSummary | null;
  activePatterns: TutorPatternSummary[];
  activeMisconceptions: TutorMisconceptionSummary[];
  successfulStrategies: TutorStrategySummary[];
  recentEvidence: Array<{
    skillId: string;
    outcome: string;
    assistanceLevel: string;
    hintsUsed: number;
    instructionalStrategy: string | null;
    occurredAt: string;
  }>;
  activeInterventionTypes: string[];
}

export interface TutorTurnDecision {
  action: TutorAction;
  strategy: InstructionalStrategy;
  targetSkillId: string | null;
  prerequisiteSkillId: string | null;
  reasonCodes: string[];
  allowWorkedExample: boolean;
  responseConstraints: {
    maximumSentences: number;
    vocabulary: string;
    exampleContexts: string[];
    visualDensity: "HIGH" | "MODERATE" | "LOW";
    scaffolding: "MICRO_STEPS" | "GUIDED_STEPS" | "CONCISE_SUPPORT";
    sessionMinutes: number;
    challengeLevel: "FOUNDATIONAL" | "GRADE_ALIGNED" | "EXTENSION";
    motivationalFraming: string;
    useAgeRespectfulLanguage: true;
    avoidChildishLanguage: true;
    doNotSolveActiveGradedItem: true;
  };
}
