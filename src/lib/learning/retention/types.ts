export type ReviewScheduleStatus = "SCHEDULED" | "DUE" | "PAUSED";
export type RetrievalOutcome = "CORRECT" | "INCORRECT" | "PARTIAL";

export interface ReviewScheduleState {
  intervalDays: number;
  easeFactor: number;
  retrievalCount: number;
  successfulRetrievals: number;
  consecutiveSuccesses: number;
  retentionConfidence: number;
  lastReviewAt: Date | null;
  nextReviewAt: Date;
  lastOutcome: RetrievalOutcome | null;
  status: ReviewScheduleStatus;
  reasonCodes: string[];
  scheduleVersion: "math-retention-v1";
}

export interface ReviewSchedulingContext {
  masteryStatus: "NOT_STARTED" | "EMERGING" | "DEVELOPING" | "PRACTICING" | "MASTERED";
  masteryProbability: number;
  uncertainty: number;
  activeMisconceptionProbability?: number;
  requiredDependentCount?: number;
}

export interface RetrievalObservation {
  outcome: RetrievalOutcome;
  assistanceLevel: "NONE" | "INDEPENDENT" | "HINTED" | "GUIDED" | "WORKED_EXAMPLE";
  responseTimeMs?: number;
  expectedResponseTimeMs?: number;
  delayDays: number;
  occurredAt: Date;
}
