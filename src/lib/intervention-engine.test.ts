import assert from "node:assert/strict";
import test from "node:test";
import { evaluateInterventions, type InterventionEvaluationInput } from "./learning/interventions";
import { buildAgeAppropriateExperience } from "./learning/experience";
import { buildMinimumTutorContext } from "./tutor/privacy";
import type { TutorLearnerState } from "./tutor/orchestration";

function input(overrides: Partial<InterventionEvaluationInput> = {}): InterventionEvaluationInput {
  return {
    learnerId: "learner-1", recentFailureCount: 0, recentEvidenceCount: 5,
    currentConfidence: 6, previousConfidence: 6, frustrationEvents: 0, avoidanceEvents: 0,
    disengagementEvents: 0, earlyTerminatedSessions: 0, targetSkillId: "fractions",
    targetSkillName: "Fractions", targetFailureCount: 0, prerequisiteSkillId: "division",
    prerequisiteSkillName: "Division", prerequisiteMastery: 0.8, unresolvedMisconception: null,
    stuckSessionCount: 0, systemConfidence: 0.8, activeInterventions: [], ...overrides,
  };
}

test("confidence recovery records evidence, thresholds, actions, and outcomes", () => {
  const result = evaluateInterventions(input({ recentFailureCount: 3, frustrationEvents: 2 }));
  const decision = result.find((item) => item.type === "CONFIDENCE_RECOVERY")!;
  assert.equal(decision.status, "TRIGGERED");
  assert.deepEqual(decision.reasonCodes, ["REPEATED_VERIFIED_FAILURE", "RECURRING_FRUSTRATION"]);
  assert.equal(decision.thresholds.repeatedFailures, 3);
  assert.equal(decision.actions.length >= 3, true);
  assert.equal(decision.outcomeTargets.some((target) => target.metric === "confidence_rating"), true);
});

test("remediation requires repeated target failure and a weak prerequisite", () => {
  const triggered = evaluateInterventions(input({ targetFailureCount: 3, prerequisiteMastery: 0.42 }));
  const weak = triggered.find((item) => item.type === "REMEDIATION")!;
  assert.equal(weak.status, "TRIGGERED");
  assert.match(weak.reason, /Division/);

  const notTriggered = evaluateInterventions(input({ targetFailureCount: 3, prerequisiteMastery: 0.8 }));
  assert.notEqual(notTriggered.find((item) => item.type === "REMEDIATION")!.status, "TRIGGERED");
});

test("parent engagement triggers for disengagement, early exits, or a stalled intervention", () => {
  const result = evaluateInterventions(input({
    activeInterventions: [{ type: "CONFIDENCE_RECOVERY", daysActive: 8, baselineSuccessRate: 0.4, currentSuccessRate: 0.42 }],
  }));
  const decision = result.find((item) => item.type === "PARENT_ENGAGEMENT")!;
  assert.equal(decision.status, "TRIGGERED");
  assert.match(decision.reasonCodes.join(" "), /NOT_IMPROVING/);
});

test("human tutor escalation stops autonomous experimentation at explicit limits", () => {
  const result = evaluateInterventions(input({
    unresolvedMisconception: { code: "FRACTION_COMPONENT_ADDITION", probability: 0.72, evidenceCount: 4, strategiesTried: 3, ageDays: 10 },
    stuckSessionCount: 3,
  }));
  const decision = result.find((item) => item.type === "HUMAN_TUTOR_ESCALATION")!;
  assert.equal(decision.status, "TRIGGERED");
  assert.equal(decision.priority, 100);
  assert.match(decision.reasonCodes.join(" "), /MULTIPLE_STRATEGIES/);
  assert.match(decision.reasonCodes.join(" "), /STUCK_ACROSS_SESSIONS/);
});

test("sparse neutral evidence remains monitoring or not triggered", () => {
  const result = evaluateInterventions(input());
  assert.equal(result.every((decision) => decision.status !== "TRIGGERED"), true);
});

test("older learners receive mature framing even on below-grade skills", () => {
  const profile = buildAgeAppropriateExperience({ developmentalStage: "HIGH_SCHOOL", learnerGrade: 10, skillGradeMax: 5, confidenceLevel: 4, currentFrustration: false });
  assert.equal(profile.challengeLevel, "FOUNDATIONAL");
  assert.equal(profile.avoidChildishLanguage, true);
  assert.match(profile.vocabulary, /maturity/);
  assert.equal(profile.exampleContexts.includes("personal finance"), true);
});

test("tutor context excludes learner identity and family details", () => {
  const state: TutorLearnerState = {
    learnerId: "private-id", developmentalStage: "MIDDLE", grade: 7, confidenceLevel: 5,
    currentFrustration: false, targetSkill: null, prerequisiteBlocker: null, activePatterns: [],
    activeMisconceptions: [], successfulStrategies: [], recentEvidence: [], activeInterventionTypes: [],
  };
  const context = buildMinimumTutorContext(state) as Record<string, unknown>;
  assert.equal("learnerId" in context, false);
  assert.equal("name" in context, false);
  assert.equal("email" in context, false);
  assert.equal("guardian" in context, false);
});
