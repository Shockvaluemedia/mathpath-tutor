import type {
  InterventionDecision,
  InterventionDecisionStatus,
  InterventionEvaluationInput,
  SystematicInterventionType,
} from "./types";

const THRESHOLDS = {
  repeatedFailures: 3,
  confidenceDecline: -2,
  frustrationEvents: 2,
  avoidanceEvents: 2,
  prerequisiteMastery: 0.6,
  disengagementEvents: 3,
  earlyTerminations: 2,
  stalledDays: 7,
  minimumImprovement: 0.05,
  misconceptionProbability: 0.6,
  misconceptionEvidence: 3,
  strategiesTried: 3,
  stuckSessions: 3,
  minimumSystemConfidence: 0.35,
} as const;

function status(triggered: boolean, hasSignal: boolean): InterventionDecisionStatus {
  return triggered ? "TRIGGERED" : hasSignal ? "MONITORING" : "NOT_TRIGGERED";
}

function decision(
  input: InterventionEvaluationInput,
  type: SystematicInterventionType,
  result: Omit<InterventionDecision, "type" | "systemConfidence" | "modelVersion">
): InterventionDecision {
  return { ...result, type, systemConfidence: input.systemConfidence, modelVersion: "intervention-v1" };
}

export function evaluateInterventions(input: InterventionEvaluationInput): InterventionDecision[] {
  const confidenceDelta = input.previousConfidence === null ? null : input.currentConfidence - input.previousConfidence;
  const confidenceReasons = [
    ...(input.recentFailureCount >= THRESHOLDS.repeatedFailures ? ["REPEATED_VERIFIED_FAILURE"] : []),
    ...(confidenceDelta !== null && confidenceDelta <= THRESHOLDS.confidenceDecline ? ["DECLINING_REPORTED_CONFIDENCE"] : []),
    ...(input.frustrationEvents >= THRESHOLDS.frustrationEvents ? ["RECURRING_FRUSTRATION"] : []),
    ...(input.avoidanceEvents >= THRESHOLDS.avoidanceEvents ? ["RECURRING_AVOIDANCE"] : []),
  ];
  const confidenceSignal = input.recentFailureCount > 0 || (confidenceDelta !== null && confidenceDelta < 0) || input.frustrationEvents > 0 || input.avoidanceEvents > 0;

  const remediationTriggered = input.targetFailureCount >= THRESHOLDS.repeatedFailures
    && input.prerequisiteMastery !== null
    && input.prerequisiteMastery < THRESHOLDS.prerequisiteMastery;
  const remediationSignal = input.targetFailureCount > 0 && input.prerequisiteMastery !== null;

  const stalled = input.activeInterventions.some((active) => active.daysActive >= THRESHOLDS.stalledDays
    && active.baselineSuccessRate !== null
    && active.currentSuccessRate !== null
    && active.currentSuccessRate - active.baselineSuccessRate < THRESHOLDS.minimumImprovement);
  const parentReasons = [
    ...(input.disengagementEvents >= THRESHOLDS.disengagementEvents ? ["CONSISTENT_DISENGAGEMENT"] : []),
    ...(input.earlyTerminatedSessions >= THRESHOLDS.earlyTerminations ? ["REPEATED_EARLY_TERMINATION"] : []),
    ...(stalled ? ["ACTIVE_INTERVENTION_NOT_IMPROVING"] : []),
  ];

  const misconception = input.unresolvedMisconception;
  const persistentMisconception = Boolean(misconception
    && misconception.probability >= THRESHOLDS.misconceptionProbability
    && misconception.evidenceCount >= THRESHOLDS.misconceptionEvidence
    && misconception.strategiesTried >= THRESHOLDS.strategiesTried);
  const escalationReasons = [
    ...(persistentMisconception ? ["MISCONCEPTION_PERSISTS_AFTER_MULTIPLE_STRATEGIES"] : []),
    ...(input.stuckSessionCount >= THRESHOLDS.stuckSessions ? ["STUCK_ACROSS_SESSIONS"] : []),
    ...(input.systemConfidence < THRESHOLDS.minimumSystemConfidence ? ["SYSTEM_CONFIDENCE_TOO_LOW"] : []),
  ];

  return [
    decision(input, "CONFIDENCE_RECOVERY", {
      status: status(confidenceReasons.length > 0, confidenceSignal), priority: 90,
      evidence: { recentFailureCount: input.recentFailureCount, recentEvidenceCount: input.recentEvidenceCount, currentConfidence: input.currentConfidence, previousConfidence: input.previousConfidence, confidenceDelta, frustrationEvents: input.frustrationEvents, avoidanceEvents: input.avoidanceEvents },
      thresholds: { repeatedFailures: THRESHOLDS.repeatedFailures, confidenceDecline: THRESHOLDS.confidenceDecline, frustrationEvents: THRESHOLDS.frustrationEvents, avoidanceEvents: THRESHOLDS.avoidanceEvents },
      reason: confidenceReasons.length ? "Recent evidence indicates that restoring agency should precede additional challenge." : "Confidence recovery thresholds are not currently met.",
      reasonCodes: confidenceReasons,
      actions: ["Begin with one verified, reachable success.", "Reduce step size and session load.", "Recheck confidence after independent work without using it as a score."],
      outcomeTargets: [{ metric: "confidence_rating", baselineValue: input.currentConfidence, targetValue: Math.min(10, input.currentConfidence + 2), direction: "AT_LEAST" }, { metric: "recent_failure_rate", baselineValue: input.recentEvidenceCount ? input.recentFailureCount / input.recentEvidenceCount : null, targetValue: 0.35, direction: "AT_MOST" }],
    }),
    decision(input, "REMEDIATION", {
      status: status(remediationTriggered, remediationSignal), priority: 85,
      evidence: { targetSkillId: input.targetSkillId, targetFailureCount: input.targetFailureCount, prerequisiteSkillId: input.prerequisiteSkillId, prerequisiteMastery: input.prerequisiteMastery },
      thresholds: { targetFailures: THRESHOLDS.repeatedFailures, prerequisiteMasteryBelow: THRESHOLDS.prerequisiteMastery },
      reason: remediationTriggered ? `${input.prerequisiteSkillName ?? "A prerequisite"} is below readiness while failures recur on ${input.targetSkillName ?? "the target skill"}.` : "Prerequisite-linked remediation thresholds are not currently met.",
      reasonCodes: remediationTriggered ? ["REPEATED_TARGET_FAILURE", "PREREQUISITE_BELOW_READINESS"] : [],
      actions: ["Move to the lowest unresolved required prerequisite.", "Collect independent prerequisite evidence before returning to the target.", "Use a discriminating check to confirm the blocker."],
      outcomeTargets: [{ metric: "prerequisite_mastery", baselineValue: input.prerequisiteMastery, targetValue: THRESHOLDS.prerequisiteMastery, direction: "AT_LEAST" }],
    }),
    decision(input, "PARENT_ENGAGEMENT", {
      status: status(parentReasons.length > 0, input.disengagementEvents > 0 || input.earlyTerminatedSessions > 0 || input.activeInterventions.length > 0), priority: 80,
      evidence: { disengagementEvents: input.disengagementEvents, earlyTerminatedSessions: input.earlyTerminatedSessions, stalledActiveInterventions: stalled ? 1 : 0 },
      thresholds: { disengagementEvents: THRESHOLDS.disengagementEvents, earlyTerminations: THRESHOLDS.earlyTerminations, stalledDays: THRESHOLDS.stalledDays, minimumImprovement: THRESHOLDS.minimumImprovement },
      reason: parentReasons.length ? "Sustained engagement evidence indicates that a supportive adult check-in may help." : "Parent engagement thresholds are not currently met.",
      reasonCodes: parentReasons,
      actions: ["Share the evidence and one specific, non-punitive support action.", "Agree on a shorter next session window.", "Review engagement and outcome evidence after one week."],
      outcomeTargets: [{ metric: "early_terminated_sessions", baselineValue: input.earlyTerminatedSessions, targetValue: 0, direction: "AT_MOST" }, { metric: "disengagement_events", baselineValue: input.disengagementEvents, targetValue: 1, direction: "AT_MOST" }],
    }),
    decision(input, "HUMAN_TUTOR_ESCALATION", {
      status: status(escalationReasons.length > 0, Boolean(misconception) || input.stuckSessionCount > 0), priority: 100,
      evidence: { misconceptionCode: misconception?.code ?? null, misconceptionProbability: misconception?.probability ?? null, misconceptionEvidenceCount: misconception?.evidenceCount ?? 0, strategiesTried: misconception?.strategiesTried ?? 0, misconceptionAgeDays: misconception?.ageDays ?? 0, stuckSessionCount: input.stuckSessionCount, systemConfidence: input.systemConfidence },
      thresholds: { misconceptionProbability: THRESHOLDS.misconceptionProbability, misconceptionEvidence: THRESHOLDS.misconceptionEvidence, strategiesTried: THRESHOLDS.strategiesTried, stuckSessions: THRESHOLDS.stuckSessions, minimumSystemConfidence: THRESHOLDS.minimumSystemConfidence },
      reason: escalationReasons.length ? "The system should stop experimenting autonomously and request human review." : "Human escalation thresholds are not currently met.",
      reasonCodes: escalationReasons,
      actions: ["Provide the tutor with the evidence timeline and strategies already attempted.", "Ask for a human diagnosis before changing the learner path again.", "Record the tutor decision and a follow-up outcome."],
      outcomeTargets: [{ metric: "stuck_session_count", baselineValue: input.stuckSessionCount, targetValue: 0, direction: "AT_MOST" }, { metric: "misconception_probability", baselineValue: misconception?.probability ?? null, targetValue: 0.4, direction: "AT_MOST" }],
    }),
  ].sort((left, right) => right.priority - left.priority);
}
