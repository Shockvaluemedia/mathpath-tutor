export type EvidenceType =
  | "EXPOSURE"
  | "ASSESSMENT"
  | "PRACTICE"
  | "RETENTION"
  | "TRANSFER";

export type EvidenceOutcome = "CORRECT" | "INCORRECT" | "PARTIAL" | "UNGRADED";

export type EvidenceAssistanceLevel =
  | "NONE"
  | "INDEPENDENT"
  | "HINTED"
  | "GUIDED"
  | "WORKED_EXAMPLE";

export type EvidenceMasteryStatus =
  | "NOT_STARTED"
  | "EMERGING"
  | "DEVELOPING"
  | "PRACTICING"
  | "MASTERED";

export interface LearningEvidenceRecord {
  idempotencyKey: string;
  learnerId: string;
  skillId: string;
  evidenceType: EvidenceType;
  outcome: EvidenceOutcome;
  assistanceLevel: EvidenceAssistanceLevel;
  sourceType: string;
  sourceId?: string;
  learnerAnswer?: string;
  correctAnswer?: string;
  hintsUsed?: number;
  responseTimeMs?: number;
  expectedResponseTimeMs?: number;
  confidenceRating?: number;
  difficulty?: number;
  delayDays?: number;
  representation?: string;
  instructionalStrategy?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

export interface MasteryComputationConfig {
  priorProbability: number;
  masteredProbability: number;
  maximumUncertaintyForMastery: number;
  minimumIndependentSuccesses: number;
  minimumIndependentSuccessRate: number;
  minimumRetentionSuccesses: number;
  minimumRetentionScore: number;
  minimumTransferSuccesses: number;
  minimumTransferScore: number;
  maximumMisconceptionPenaltyForMastery: number;
}

export interface MasteryComputationContext {
  misconceptionPenalty?: number;
  config?: Partial<MasteryComputationConfig>;
}

export interface ComputedMasteryState {
  masteryProbability: number;
  masteryScore: number;
  uncertainty: number;
  confidenceScore: number;
  confidenceCalibration: number;
  independentSuccessRate: number;
  assistedSuccessRate: number;
  retentionScore: number;
  transferScore: number;
  fluencyScore: number;
  evidenceCount: number;
  gradedAttempts: number;
  independentAttempts: number;
  independentSuccesses: number;
  assistedAttempts: number;
  assistedSuccesses: number;
  retentionAttempts: number;
  retentionSuccesses: number;
  transferAttempts: number;
  transferSuccesses: number;
  status: EvidenceMasteryStatus;
  lastEvidenceAt: Date | null;
  modelVersion: "evidence-v1";
  reasonCodes: string[];
}
