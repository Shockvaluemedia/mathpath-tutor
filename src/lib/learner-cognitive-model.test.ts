import assert from "node:assert/strict";
import test from "node:test";
import { computeLearnerCognitiveModel } from "./learning/learner-model";
import type { CognitiveEvidenceRecord } from "./learning/learner-model";

const start = new Date("2026-01-01T00:00:00.000Z");

function evidence(
  index: number,
  outcome: CognitiveEvidenceRecord["outcome"],
  overrides: Partial<CognitiveEvidenceRecord> = {}
): CognitiveEvidenceRecord {
  return {
    id: `e${index}`,
    skillId: "fractions",
    evidenceType: "PRACTICE",
    outcome,
    assistanceLevel: "INDEPENDENT",
    hintsUsed: 0,
    responseTimeMs: 60_000,
    expectedResponseTimeMs: 75_000,
    metadata: {},
    occurredAt: new Date(start.getTime() + index * 60_000),
    ...overrides,
  };
}

test("does not infer cognitive patterns from sparse evidence or onboarding labels", () => {
  const model = computeLearnerCognitiveModel({
    evidence: [evidence(1, "CORRECT"), evidence(2, "INCORRECT")],
    now: new Date("2026-01-02T00:00:00.000Z"),
  });

  assert.deepEqual(model.patterns, []);
  assert.equal(model.summary.evidenceCount, 2);
});

test("detects confidence overestimation from verified outcomes", () => {
  const model = computeLearnerCognitiveModel({
    evidence: [1, 2, 3, 4].map((index) => evidence(index, index === 4 ? "CORRECT" : "INCORRECT", { confidenceRating: 9 })),
  });
  const calibration = model.patterns.find((pattern) => pattern.patternType === "CONFIDENCE_CALIBRATION");

  assert.ok(calibration);
  assert.match(calibration.statement, /overestimates/);
  assert.equal(calibration.evidence.sampleSize, 4);
});

test("separates hint dependency and rushing risk from independent success", () => {
  const records = [1, 2, 3, 4].map((index) => evidence(index, index === 4 ? "CORRECT" : "INCORRECT", {
    assistanceLevel: "HINTED",
    hintsUsed: 1,
    responseTimeMs: 20_000,
    expectedResponseTimeMs: 75_000,
  }));
  const model = computeLearnerCognitiveModel({ evidence: records });
  const types = new Set(model.patterns.map((pattern) => pattern.patternType));

  assert.equal(types.has("HINT_DEPENDENCY"), true);
  assert.equal(types.has("RUSHING_RISK"), true);
});

test("detects post-failure persistence without treating errors as a static trait", () => {
  const records = [
    evidence(1, "INCORRECT"), evidence(2, "CORRECT"),
    evidence(3, "INCORRECT"), evidence(4, "CORRECT"),
    evidence(5, "INCORRECT"), evidence(6, "CORRECT"),
  ];
  const model = computeLearnerCognitiveModel({ evidence: records });

  assert.ok(model.patterns.some((pattern) => pattern.patternType === "PERSISTENCE_STRENGTH"));
  assert.equal(model.patterns.some((pattern) => pattern.patternType === "FAILURE_CASCADE_RISK"), false);
});

test("distinguishes retention and transfer evidence", () => {
  const model = computeLearnerCognitiveModel({
    evidence: [
      evidence(1, "INCORRECT", { evidenceType: "RETENTION" }),
      evidence(2, "INCORRECT", { evidenceType: "RETENTION" }),
      evidence(3, "CORRECT", { evidenceType: "TRANSFER" }),
      evidence(4, "CORRECT", { evidenceType: "TRANSFER" }),
    ],
  });
  const types = new Set(model.patterns.map((pattern) => pattern.patternType));

  assert.equal(types.has("RETENTION_NEED"), true);
  assert.equal(types.has("TRANSFER_STRENGTH"), true);
});

test("aggregates strategy outcomes while leaving unsupported gains nullable", () => {
  const records = [1, 2, 3].map((index) => evidence(index, "CORRECT", {
    instructionalStrategy: "VISUAL_MODEL",
    representation: "area-model",
  }));
  const model = computeLearnerCognitiveModel({ evidence: records });
  const strategy = model.strategyPerformance[0];

  assert.equal(strategy.attempts, 3);
  assert.equal(strategy.successfulAttempts, 3);
  assert.equal(strategy.averageOutcomeScore, 1);
  assert.equal(strategy.averageMasteryGain, undefined);
  assert.equal(strategy.averageConfidenceGain, undefined);
  assert.ok(model.patterns.some((pattern) => pattern.patternType === "SUCCESSFUL_STRATEGY"));
  assert.ok(model.patterns.some((pattern) => pattern.patternType === "REPRESENTATION_EFFECTIVENESS"));
});

test("uses genuine before-and-after metadata when computing strategy gains", () => {
  const model = computeLearnerCognitiveModel({
    evidence: [
      evidence(1, "CORRECT", { instructionalStrategy: "TEACH_BACK", metadata: { masteryBefore: 0.4, masteryAfter: 0.6, confidenceBefore: 4, confidenceAfter: 6 } }),
      evidence(2, "CORRECT", { instructionalStrategy: "TEACH_BACK", metadata: { masteryBefore: 0.6, masteryAfter: 0.7, confidenceBefore: 6, confidenceAfter: 7 } }),
    ],
  });

  assert.equal(model.strategyPerformance[0].averageMasteryGain, 0.15);
  assert.equal(model.strategyPerformance[0].averageConfidenceGain, 1.5);
});

test("detects recent breakthrough and review-worthy regression by skill", () => {
  const breakthrough = ["INCORRECT", "INCORRECT", "INCORRECT", "CORRECT", "CORRECT", "CORRECT"] as const;
  const regression = ["CORRECT", "CORRECT", "CORRECT", "INCORRECT", "INCORRECT", "INCORRECT"] as const;
  const model = computeLearnerCognitiveModel({
    evidence: [
      ...breakthrough.map((outcome, index) => evidence(index + 1, outcome, { skillId: "fractions" })),
      ...regression.map((outcome, index) => evidence(index + 10, outcome, { skillId: "integers" })),
    ],
    mastery: [{
      skillId: "integers",
      skillName: "Integer Operations",
      masteryProbability: 0.6,
      uncertainty: 0.4,
      evidenceCount: 6,
      retentionScore: 0,
      retentionAttempts: 0,
      transferScore: 0,
      transferAttempts: 0,
      fluencyScore: 0.3,
    }],
  });
  const keys = new Set(model.patterns.map((pattern) => `${pattern.patternType}:${pattern.scopeKey}`));

  assert.equal(keys.has("RECENT_BREAKTHROUGH:fractions"), true);
  assert.equal(keys.has("RECENT_REGRESSION:integers"), true);
  assert.equal(keys.has("REVIEW_NEED:integers"), true);
});

test("projects recurring misconceptions and frustration only above thresholds", () => {
  const model = computeLearnerCognitiveModel({
    evidence: [evidence(1, "INCORRECT"), evidence(2, "INCORRECT"), evidence(3, "CORRECT")],
    misconceptions: [{ code: "FRACTION_COMPONENT_ADDITION", name: "Adds fraction components", skillId: "fractions", probability: 0.72, evidenceCount: 3, status: "LIKELY" }],
    frustration: { sessionCount: 5, frustratedSessionCount: 3, recentFrustratedSessionCount: 2 },
  });
  const types = new Set(model.patterns.map((pattern) => pattern.patternType));

  assert.equal(types.has("RECURRING_MISCONCEPTION"), true);
  assert.equal(types.has("FRUSTRATION_PATTERN"), true);
});
