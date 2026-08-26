export type SystematicInterventionType =
  | "CONFIDENCE_RECOVERY"
  | "REMEDIATION"
  | "PARENT_ENGAGEMENT"
  | "HUMAN_TUTOR_ESCALATION";

export type InterventionDecisionStatus = "TRIGGERED" | "MONITORING" | "NOT_TRIGGERED";

export interface ActiveInterventionSignal {
  type: SystematicInterventionType;
  daysActive: number;
  baselineSuccessRate: number | null;
  currentSuccessRate: number | null;
}

export interface InterventionEvaluationInput {
  learnerId: string;
  recentFailureCount: number;
  recentEvidenceCount: number;
  currentConfidence: number;
  previousConfidence: number | null;
  frustrationEvents: number;
  avoidanceEvents: number;
  disengagementEvents: number;
  earlyTerminatedSessions: number;
  targetSkillId: string | null;
  targetSkillName: string | null;
  targetFailureCount: number;
  prerequisiteSkillId: string | null;
  prerequisiteSkillName: string | null;
  prerequisiteMastery: number | null;
  unresolvedMisconception: {
    code: string;
    probability: number;
    evidenceCount: number;
    strategiesTried: number;
    ageDays: number;
  } | null;
  stuckSessionCount: number;
  systemConfidence: number;
  activeInterventions: ActiveInterventionSignal[];
}

export interface InterventionOutcomeTarget {
  metric: string;
  baselineValue: number | null;
  targetValue: number;
  direction: "AT_LEAST" | "AT_MOST";
}

export interface InterventionDecision {
  type: SystematicInterventionType;
  status: InterventionDecisionStatus;
  priority: number;
  evidence: Record<string, number | string | null>;
  thresholds: Record<string, number | string>;
  reason: string;
  reasonCodes: string[];
  actions: string[];
  outcomeTargets: InterventionOutcomeTarget[];
  systemConfidence: number;
  modelVersion: "intervention-v1";
}
