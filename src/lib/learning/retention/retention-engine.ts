import type {
  RetrievalObservation,
  ReviewScheduleState,
  ReviewSchedulingContext,
} from "./types";

const DAY_MS = 86_400_000;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function initialInterval(context: ReviewSchedulingContext): number {
  const byStatus = {
    NOT_STARTED: 1,
    EMERGING: 1,
    DEVELOPING: 2,
    PRACTICING: 3,
    MASTERED: 7,
  } as const;
  let interval: number = byStatus[context.masteryStatus];
  if (context.uncertainty >= 0.55) interval = Math.min(interval, 2);
  if ((context.activeMisconceptionProbability ?? 0) >= 0.55) interval = 1;
  if ((context.requiredDependentCount ?? 0) > 0) interval = Math.min(interval, 3);
  return interval;
}

function mathDependencyCap(context: ReviewSchedulingContext): number {
  if ((context.activeMisconceptionProbability ?? 0) >= 0.55) return 3;
  if ((context.requiredDependentCount ?? 0) >= 3) return 10;
  if ((context.requiredDependentCount ?? 0) > 0) return 21;
  return 60;
}

export function createReviewSchedule(
  context: ReviewSchedulingContext,
  now = new Date()
): ReviewScheduleState | null {
  if (context.masteryStatus === "NOT_STARTED") return null;
  const intervalDays = initialInterval(context);
  const reasons = ["SKILL_HAS_LEARNING_EVIDENCE", `MASTERY_STATUS:${context.masteryStatus}`];
  if ((context.requiredDependentCount ?? 0) > 0) reasons.push("PREREQUISITE_REVIEW_PRIORITY");
  if ((context.activeMisconceptionProbability ?? 0) >= 0.55) reasons.push("ACTIVE_MISCONCEPTION_SHORTENS_INTERVAL");
  if (context.uncertainty >= 0.55) reasons.push("HIGH_UNCERTAINTY_SHORTENS_INTERVAL");
  return {
    intervalDays,
    easeFactor: 1.6,
    retrievalCount: 0,
    successfulRetrievals: 0,
    consecutiveSuccesses: 0,
    retentionConfidence: clamp(context.masteryProbability * 0.5, 0.05, 0.5),
    lastReviewAt: null,
    nextReviewAt: addDays(now, intervalDays),
    lastOutcome: null,
    status: "SCHEDULED",
    reasonCodes: reasons,
    scheduleVersion: "math-retention-v1",
  };
}

export function updateReviewSchedule(
  current: ReviewScheduleState,
  observation: RetrievalObservation,
  context: ReviewSchedulingContext
): ReviewScheduleState {
  const independent = observation.assistanceLevel === "NONE" || observation.assistanceLevel === "INDEPENDENT";
  const correct = observation.outcome === "CORRECT";
  const paceRatio = observation.responseTimeMs && observation.expectedResponseTimeMs
    ? observation.responseTimeMs / observation.expectedResponseTimeMs
    : null;
  const delayed = observation.delayDays >= Math.max(1, current.intervalDays * 0.8);
  const reasons: string[] = [];
  let intervalDays = current.intervalDays;
  let easeFactor = current.easeFactor;
  let retentionConfidence = current.retentionConfidence;
  let consecutiveSuccesses = current.consecutiveSuccesses;

  if (!correct) {
    intervalDays = 1;
    easeFactor = clamp(easeFactor - 0.2, 1.15, 2.5);
    retentionConfidence = clamp(retentionConfidence - (observation.outcome === "INCORRECT" ? 0.22 : 0.12), 0, 1);
    consecutiveSuccesses = 0;
    reasons.push(observation.outcome === "INCORRECT" ? "FAILED_RETRIEVAL_RESETS_INTERVAL" : "PARTIAL_RETRIEVAL_REDUCES_INTERVAL");
  } else if (!independent) {
    intervalDays = Math.max(1, Math.min(intervalDays, 3));
    easeFactor = clamp(easeFactor - 0.05, 1.15, 2.5);
    retentionConfidence = clamp(retentionConfidence + 0.03, 0, 1);
    consecutiveSuccesses = 0;
    reasons.push("ASSISTED_RETRIEVAL_DOES_NOT_EXTEND_INTERVAL");
  } else if (paceRatio !== null && paceRatio > 1.35) {
    intervalDays = Math.max(current.intervalDays + 1, current.intervalDays * 1.25);
    easeFactor = clamp(easeFactor + 0.03, 1.15, 2.5);
    retentionConfidence = clamp(retentionConfidence + (delayed ? 0.1 : 0.06), 0, 1);
    consecutiveSuccesses += 1;
    reasons.push("SLOW_CORRECT_RETRIEVAL_MODEST_EXTENSION");
  } else {
    const delayStrength = delayed ? 1.15 : 1;
    intervalDays = Math.max(current.intervalDays + 1, current.intervalDays * easeFactor * delayStrength);
    easeFactor = clamp(easeFactor + 0.1, 1.15, 2.5);
    retentionConfidence = clamp(retentionConfidence + (delayed ? 0.16 : 0.1), 0, 1);
    consecutiveSuccesses += 1;
    reasons.push(delayed ? "SUCCESSFUL_DELAYED_RETRIEVAL" : "SUCCESSFUL_INDEPENDENT_RETRIEVAL");
  }

  const dependencyCap = mathDependencyCap(context);
  if (intervalDays > dependencyCap) {
    intervalDays = dependencyCap;
    reasons.push("MATH_DEPENDENCY_INTERVAL_CAP");
  }
  intervalDays = Math.round(clamp(intervalDays, 1, 60) * 100) / 100;

  return {
    intervalDays,
    easeFactor,
    retrievalCount: current.retrievalCount + 1,
    successfulRetrievals: current.successfulRetrievals + (correct ? 1 : 0),
    consecutiveSuccesses,
    retentionConfidence,
    lastReviewAt: observation.occurredAt,
    nextReviewAt: addDays(observation.occurredAt, intervalDays),
    lastOutcome: observation.outcome,
    status: "SCHEDULED",
    reasonCodes: reasons,
    scheduleVersion: "math-retention-v1",
  };
}

export function reviewScheduleStatus(
  schedule: Pick<ReviewScheduleState, "status" | "nextReviewAt">,
  now = new Date()
): ReviewScheduleState["status"] {
  if (schedule.status === "PAUSED") return "PAUSED";
  return schedule.nextReviewAt <= now ? "DUE" : "SCHEDULED";
}
