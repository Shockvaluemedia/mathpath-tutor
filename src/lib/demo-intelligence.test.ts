import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_COGNITIVE_MODELS, DEMO_PROGRESS } from "./demo-data";

test("demo learners expose distinct evidence-driven learning patterns", () => {
  const alex = DEMO_PROGRESS["demo-student-1"].intelligence;
  const maya = DEMO_PROGRESS["demo-student-2"].intelligence;

  assert.equal(alex.sample, true);
  assert.equal(maya.sample, true);
  assert.equal(alex.blocker.skill, "Fraction equivalence");
  assert.equal(maya.targetState, "Concept understood; fluency developing");
  assert.match(alex.currentLearningLevel, /Grade 5/);
  assert.match(maya.currentLearningLevel, /Grade 7/);
  assert.notEqual(alex.adaptation.to, maya.adaptation.to);
  assert.equal(alex.evidence.assistedSuccesses > alex.evidence.independentSuccesses, true);
  assert.equal(maya.evidence.independentSuccesses > maya.evidence.assistedSuccesses, true);
  assert.match(alex.masteryTrajectory, /Verified accuracy/);
  assert.match(maya.confidenceTrajectory, /verified performance/);
  assert.equal(alex.recommendedHumanActions.length, 2);
  assert.equal(maya.recommendedHumanActions.length, 2);
});

test("demo cognitive models expose evidence-derived, distinct patterns", () => {
  const alex = DEMO_COGNITIVE_MODELS["demo-student-1"];
  const maya = DEMO_COGNITIVE_MODELS["demo-student-2"];
  const alexTypes = new Set(alex.patterns.map((pattern) => pattern.patternType));
  const mayaTypes = new Set(maya.patterns.map((pattern) => pattern.patternType));

  assert.equal(alex.sample, true);
  assert.equal(maya.sample, true);
  assert.equal(alexTypes.has("HINT_DEPENDENCY"), true);
  assert.equal(mayaTypes.has("CONFIDENCE_CALIBRATION"), true);
  assert.notDeepEqual(alex.summary.topPatternTypes, maya.summary.topPatternTypes);
  assert.equal(alex.strategyPerformance[0].averageMasteryGain, null);
});
