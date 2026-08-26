import assert from "node:assert/strict";
import test from "node:test";
import { evaluateInterventions } from "./learning/interventions";
import { SkillGraph } from "./learning/graph/skill-graph";
import { applyMisconceptionEvidence, selectDiscriminatingFollowUp } from "./learning/misconceptions/hypothesis-engine";
import { computeMasteryState } from "./learning/mastery/mastery-engine";
import type { LearningEvidenceRecord } from "./learning/mastery/types";
import { createReviewSchedule, updateReviewSchedule } from "./learning/retention";
import { MATH_MISCONCEPTION_CATALOG } from "./math/misconceptions/catalog";
import { detectMisconceptionSignatures } from "./math/misconceptions/detect";
import { selectTutorTurn, type TutorLearnerState } from "./tutor/orchestration";

const NOW = new Date("2026-08-25T12:00:00.000Z");

function evidence(id: string, overrides: Partial<LearningEvidenceRecord> = {}): LearningEvidenceRecord {
  return {
    idempotencyKey: id,
    learnerId: "evaluation-learner",
    skillId: "fractions",
    evidenceType: "PRACTICE",
    outcome: "CORRECT",
    assistanceLevel: "INDEPENDENT",
    sourceType: "evaluation-harness",
    occurredAt: NOW,
    difficulty: 3,
    ...overrides,
  };
}

function tutorState(overrides: Partial<TutorLearnerState> = {}): TutorLearnerState {
  return {
    learnerId: "evaluation-learner",
    developmentalStage: "MIDDLE_SCHOOL",
    grade: 7,
    confidenceLevel: 5,
    currentFrustration: false,
    targetSkill: {
      skillId: "fraction-addition",
      slug: "fraction-addition-unlike-denominators",
      name: "Adding Fractions",
      masteryProbability: 0.4,
      uncertainty: 0.6,
      status: "DEVELOPING",
    },
    prerequisiteBlocker: null,
    activePatterns: [],
    activeMisconceptions: [],
    successfulStrategies: [],
    recentEvidence: [],
    activeInterventionTypes: [],
    ...overrides,
  };
}

test("scenario A: denominator error is isolated, taught with error analysis, and remediated when confirmed", () => {
  const matches = detectMisconceptionSignatures({
    skillSlug: "fraction-addition-unlike-denominators",
    question: "Compute 1/3 + 1/4.",
    learnerAnswer: "2/7",
    correctAnswer: "7/12",
    isCorrect: false,
  }, MATH_MISCONCEPTION_CATALOG);
  assert.equal(matches[0]?.code, "FRACTION_INDEPENDENT_COMPONENT_ADDITION");

  const likely = applyMisconceptionEvidence({ probability: 0.25, status: "SUSPECTED", evidenceCount: 0, contradictingEvidenceCount: 0 }, { direction: "SUPPORTS" });
  const confirmed = applyMisconceptionEvidence(likely, { direction: "SUPPORTS" });
  assert.equal(confirmed.status, "CONFIRMED");

  const tutorDecision = selectTutorTurn({
    message: "Why is 2/7 wrong?",
    state: tutorState({ activeMisconceptions: [{ code: matches[0].code, name: "Adding numerator and denominator components independently", probability: confirmed.probability, status: confirmed.status }] }),
  });
  assert.equal(tutorDecision.strategy, "ERROR_ANALYSIS");

  const followUp = selectDiscriminatingFollowUp(
    [{ code: matches[0].code, probability: confirmed.probability, status: confirmed.status }],
    [{ id: "denominator-isolator", skillSlug: "fraction-equivalence", question: "Which denominator can represent both thirds and fourths?", hypothesisCodes: [matches[0].code] }]
  );
  assert.equal(followUp?.question.id, "denominator-isolator");

  const remediation = evaluateInterventions({
    learnerId: "evaluation-learner", recentFailureCount: 3, recentEvidenceCount: 5,
    currentConfidence: 5, previousConfidence: 5, frustrationEvents: 0, avoidanceEvents: 0,
    disengagementEvents: 0, earlyTerminatedSessions: 0, targetSkillId: "fraction-addition",
    targetSkillName: "Adding Fractions", targetFailureCount: 3, prerequisiteSkillId: "fraction-equivalence",
    prerequisiteSkillName: "Fraction Equivalence", prerequisiteMastery: 0.42,
    unresolvedMisconception: { code: matches[0].code, probability: confirmed.probability, evidenceCount: confirmed.evidenceCount, strategiesTried: 1, ageDays: 1 },
    stuckSessionCount: 0, systemConfidence: 0.85, activeInterventions: [],
  }).find((decision) => decision.type === "REMEDIATION");
  assert.equal(remediation?.status, "TRIGGERED");
});

test("scenario B: three correct answers with hints are recorded without declaring mastery", () => {
  const result = computeMasteryState([1, 2, 3].map((index) => evidence(`hinted-${index}`, { assistanceLevel: "HINTED", hintsUsed: 1 })));
  assert.equal(result.gradedAttempts, 3);
  assert.equal(result.assistedSuccesses, 3);
  assert.equal(result.independentSuccesses, 0);
  assert.notEqual(result.status, "MASTERED");
});

test("scenario C: independent retrieval after 14 days strengthens retention evidence", () => {
  const context = { masteryStatus: "PRACTICING" as const, masteryProbability: 0.72, uncertainty: 0.28, activeMisconceptionProbability: 0, requiredDependentCount: 0 };
  const initial = createReviewSchedule(context, NOW)!;
  const updated = updateReviewSchedule(initial, {
    outcome: "CORRECT", assistanceLevel: "INDEPENDENT", delayDays: 14,
    responseTimeMs: 50_000, expectedResponseTimeMs: 75_000,
    occurredAt: new Date("2026-09-08T12:00:00.000Z"),
  }, context);
  assert.ok(updated.retentionConfidence > initial.retentionConfidence);
  assert.ok(updated.intervalDays > initial.intervalDays);

  const mastery = computeMasteryState([
    evidence("practice-1"), evidence("practice-2"), evidence("practice-3"),
    evidence("retention-14d", { evidenceType: "RETENTION", delayDays: 14, occurredAt: new Date("2026-09-08T12:00:00.000Z") }),
  ]);
  assert.equal(mastery.retentionScore, 1);
});

test("scenario D: frustration reduces load and changes mode without patronizing the learner", () => {
  const decision = selectTutorTurn({
    message: "I cannot do this. It is too hard.",
    state: tutorState({ developmentalStage: "HIGH_SCHOOL", grade: 10, currentFrustration: true, confidenceLevel: 3 }),
  });
  assert.equal(decision.action, "TRIGGER_CONFIDENCE_RECOVERY");
  assert.equal(decision.strategy, "CONFIDENCE_RECOVERY");
  assert.match(decision.reasonCodes.join(" "), /REDUCE_STEP_SIZE/);
  assert.equal(decision.responseConstraints.avoidChildishLanguage, true);
  assert.equal(decision.responseConstraints.useAgeRespectfulLanguage, true);
});

test("scenario E: algebra failure traverses to weak integers while algebra remains the goal", () => {
  const graph = new SkillGraph([
    { id: "number-sense", slug: "number-sense", name: "Number Sense", domainId: "math" },
    { id: "integers", slug: "integer-operations", name: "Integer Operations", domainId: "math" },
    { id: "algebra", slug: "linear-equations", name: "Linear Equations", domainId: "math" },
  ], [
    { prerequisiteSkillId: "number-sense", dependentSkillId: "integers", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.7 },
    { prerequisiteSkillId: "integers", dependentSkillId: "algebra", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
  ]);
  const path = graph.traverseBackwardOnFailure("algebra", [
    { skillId: "number-sense", masteryProbability: 0.9 },
    { skillId: "integers", masteryProbability: 0.4 },
  ]);
  if (!path) assert.fail("Expected prerequisite traversal for the weak integer skill");
  assert.equal(path.blockerSkillId, "integers");
  assert.equal(path.targetSkillId, "algebra");
  assert.deepEqual(path.skillIds, ["integers", "algebra"]);

  const tutorDecision = selectTutorTurn({
    message: "I keep getting the signs wrong in this equation.",
    state: tutorState({
      developmentalStage: "HIGH_SCHOOL", grade: 10,
      targetSkill: { skillId: "algebra", slug: "linear-equations", name: "Linear Equations", masteryProbability: 0.35, uncertainty: 0.65, status: "DEVELOPING" },
      prerequisiteBlocker: { skillId: "integers", slug: "integer-operations", name: "Integer Operations", masteryProbability: 0.4, uncertainty: 0.6, status: "DEVELOPING" },
    }),
  });
  assert.equal(tutorDecision.action, "MOVE_TO_PREREQUISITE");
  assert.equal(tutorDecision.prerequisiteSkillId, "integers");
});
