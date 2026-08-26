import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyLearningPath, buildLinearLearningPath, type DailyPlanningInput, type PlanningSkillState } from "./learning/planning";

const target: PlanningSkillState = { skillId: "fractions", slug: "fractions", name: "Adding Fractions", status: "DEVELOPING", masteryProbability: 0.62, uncertainty: 0.4, fluencyScore: 0.4, transferAttempts: 0 };
const blocker: PlanningSkillState = { skillId: "equivalence", slug: "fraction-equivalence", name: "Fraction Equivalence", status: "DEVELOPING", masteryProbability: 0.4, uncertainty: 0.6, fluencyScore: 0.3, transferAttempts: 0 };

function input(overrides: Partial<DailyPlanningInput> = {}): DailyPlanningInput {
  return { learnerId: "learner-1", confidenceLevel: 6, learningPace: "moderate", recentWorkloadCount: 0, currentFrustration: false, targetSkill: target, prerequisiteBlocker: null, dueReviews: [], activeMisconception: null, failureCascadeRisk: false, activeInterventionTypes: [], ...overrides };
}

test("builds a mixed path from due review, remediation, misconception, and confidence evidence", () => {
  const plan = buildDailyLearningPath(input({
    confidenceLevel: 3,
    prerequisiteBlocker: blocker,
    dueReviews: [blocker],
    activeMisconception: { code: "FRACTION_COMPONENT_ADDITION", name: "Compare fraction addition methods", skillId: "fractions", probability: 0.7 },
  }));
  const types = new Set(plan.items.map((item) => item.type));
  assert.equal(types.has("CONFIDENCE_RECOVERY"), true);
  assert.equal(types.has("SCHEDULED_REVIEW"), true);
  assert.equal(types.has("MISCONCEPTION_CORRECTION"), true);
  assert.equal(types.has("REMEDIATION"), false, "constrained sessions honor the three-item workload cap");
});

test("selects fluency and transfer after prerequisites are ready", () => {
  const plan = buildDailyLearningPath(input());
  assert.ok(plan.items.some((item) => item.type === "FLUENCY_PRACTICE"));
  assert.ok(plan.items.some((item) => item.type === "TRANSFER_CHALLENGE"));
  assert.ok(plan.items.some((item) => item.type === "NEW_LEARNING"));
});

test("slower pace or heavy recent workload caps the path without hiding reasons", () => {
  const plan = buildDailyLearningPath(input({ learningPace: "slow", dueReviews: [blocker, target], activeMisconception: { code: "X", name: "Method check", skillId: "fractions", probability: 0.6 } }));
  assert.ok(plan.items.length <= 3);
  assert.match(plan.reasonCodes.join(" "), /WORKLOAD_OR_PACE_CONSTRAINED/);
  assert.ok(plan.items.every((item) => item.learnerExplanation && item.adultExplanation && item.reasonCodes.length));
});

test("linear control path follows the sequence without adaptive reprioritization", () => {
  const plan = buildLinearLearningPath(input({
    currentFrustration: true,
    dueReviews: [target],
    activeMisconception: { code: "X", name: "Misconception", skillId: target.skillId, probability: 0.9 },
  }));
  assert.equal(plan.modelVersion, "linear-path-v1");
  assert.deepEqual(plan.items.map((item) => item.type), ["NEW_LEARNING"]);
  assert.deepEqual(plan.reasonCodes, ["LINEAR_CONTROL_VARIANT"]);
});
