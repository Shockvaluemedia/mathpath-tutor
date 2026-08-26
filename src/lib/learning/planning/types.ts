export type LearningPathItemType =
  | "NEW_LEARNING"
  | "REMEDIATION"
  | "SCHEDULED_REVIEW"
  | "MISCONCEPTION_CORRECTION"
  | "FLUENCY_PRACTICE"
  | "CONFIDENCE_RECOVERY"
  | "TRANSFER_CHALLENGE";

export interface PlanningSkillState {
  skillId: string;
  slug: string;
  name: string;
  status: string;
  masteryProbability: number;
  uncertainty: number;
  fluencyScore: number;
  transferAttempts: number;
}

export interface DailyPlanningInput {
  learnerId: string;
  confidenceLevel: number;
  learningPace: string;
  recentWorkloadCount: number;
  currentFrustration: boolean;
  targetSkill: PlanningSkillState | null;
  prerequisiteBlocker: PlanningSkillState | null;
  dueReviews: PlanningSkillState[];
  activeMisconception: { code: string; name: string; skillId: string; probability: number } | null;
  failureCascadeRisk: boolean;
  activeInterventionTypes: string[];
}

export interface LearningPathItem {
  type: LearningPathItemType;
  skillId: string | null;
  skillName: string;
  priority: number;
  estimatedMinutes: number;
  reasonCodes: string[];
  learnerExplanation: string;
  adultExplanation: string;
}

export interface DailyLearningPlan {
  learnerId: string;
  items: LearningPathItem[];
  estimatedMinutes: number;
  reasonCodes: string[];
  modelVersion: "daily-path-v1" | "linear-path-v1";
}
