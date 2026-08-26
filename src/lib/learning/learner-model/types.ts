import type {
  EvidenceAssistanceLevel,
  EvidenceOutcome,
  EvidenceType,
} from "../mastery/types";

export type LearnerPatternType =
  | "CONFIDENCE_CALIBRATION"
  | "HINT_DEPENDENCY"
  | "RUSHING_RISK"
  | "DELIBERATE_PACE"
  | "PERSISTENCE_STRENGTH"
  | "FAILURE_CASCADE_RISK"
  | "RETENTION_STRENGTH"
  | "RETENTION_NEED"
  | "TRANSFER_STRENGTH"
  | "TRANSFER_NEED"
  | "REPRESENTATION_EFFECTIVENESS"
  | "SUCCESSFUL_STRATEGY"
  | "INEFFECTIVE_STRATEGY"
  | "ERROR_PATTERN"
  | "REVIEW_NEED"
  | "RECENT_BREAKTHROUGH"
  | "RECENT_REGRESSION"
  | "RECURRING_MISCONCEPTION"
  | "FRUSTRATION_PATTERN";

export interface CognitiveEvidenceRecord {
  id: string;
  skillId: string;
  evidenceType: EvidenceType;
  outcome: EvidenceOutcome;
  assistanceLevel: EvidenceAssistanceLevel;
  hintsUsed: number;
  responseTimeMs?: number;
  expectedResponseTimeMs?: number;
  confidenceRating?: number;
  representation?: string;
  instructionalStrategy?: string;
  metadata: Record<string, unknown>;
  occurredAt: Date;
}

export interface CognitiveMasterySnapshot {
  skillId: string;
  skillName: string;
  masteryProbability: number;
  uncertainty: number;
  evidenceCount: number;
  retentionScore: number;
  retentionAttempts: number;
  transferScore: number;
  transferAttempts: number;
  fluencyScore: number;
}

export interface CognitiveMisconceptionSnapshot {
  code: string;
  name: string;
  skillId: string;
  probability: number;
  evidenceCount: number;
  status: string;
  sourceEvidenceIds?: string[];
}

export interface CognitiveFrustrationSummary {
  sessionCount: number;
  frustratedSessionCount: number;
  recentFrustratedSessionCount: number;
  sourceSessionIds?: string[];
  firstObservedAt?: Date;
  lastObservedAt?: Date;
}

export interface ComputedLearnerPattern {
  patternType: LearnerPatternType;
  scopeKey: string;
  statement: string;
  confidence: number;
  evidence: Record<string, unknown>;
  firstObservedAt: Date;
  lastObservedAt: Date;
}

export interface ComputedStrategyPerformance {
  skillId: string;
  strategy: string;
  scopeKey: string;
  attempts: number;
  successfulAttempts: number;
  averageOutcomeScore: number;
  averageMasteryGain?: number;
  averageConfidenceGain?: number;
  averageTimeToSuccessMs?: number;
  evidence: Record<string, unknown>;
  firstUsedAt: Date;
  lastUsedAt: Date;
}

export interface LearnerCognitiveSummary {
  modelVersion: "cognitive-v1";
  evidenceCount: number;
  activePatternCount: number;
  highConfidencePatternCount: number;
  strategyCount: number;
  topPatternTypes: LearnerPatternType[];
  generatedAt: string;
}

export interface ComputedLearnerCognitiveModel {
  patterns: ComputedLearnerPattern[];
  strategyPerformance: ComputedStrategyPerformance[];
  summary: LearnerCognitiveSummary;
}
