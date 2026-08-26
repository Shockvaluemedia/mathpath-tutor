import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningEvaluationSnapshot, type EvaluationInput } from "./learning/evaluation";
import { calculateAICostMicros } from "./observability";
import { selectLearningPathVariant } from "./learning/evaluation";

function input(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  const now = new Date("2026-08-25T12:00:00.000Z");
  return {
    periodDays: 14,
    learners: [1, 2, 3].map((id) => ({ id: `a-${id}`, activeDates: ["2026-08-20", "2026-08-24"] })),
    diagnostics: { responseCount: 15, serverVerifiedCount: 15, completedQuestionCounts: [5, 6, 5] },
    evidence: [1, 2, 3].flatMap((id) => [
      { learnerId: `a-${id}`, evidenceType: "PRACTICE", outcome: "CORRECT", assistanceLevel: "INDEPENDENT", hintsUsed: 0, confidenceRating: 5, occurredAt: new Date(now.getTime() - 2 * 86_400_000) },
      { learnerId: `a-${id}`, evidenceType: "RETENTION", outcome: "CORRECT", assistanceLevel: "INDEPENDENT", hintsUsed: 0, confidenceRating: 6, occurredAt: now },
      { learnerId: `a-${id}`, evidenceType: "TRANSFER", outcome: "CORRECT", assistanceLevel: "INDEPENDENT", hintsUsed: 0, confidenceRating: 6, occurredAt: now },
      { learnerId: `a-${id}`, evidenceType: "PRACTICE", outcome: "INCORRECT", assistanceLevel: "HINTED", hintsUsed: 1, confidenceRating: 4, occurredAt: now },
    ]),
    masteries: [1, 2, 3].map((id) => ({ learnerId: `a-${id}`, status: "MASTERED", lastEvidenceAt: now, firstEvidenceAt: new Date(now.getTime() - 7 * 86_400_000), isPrerequisite: true })),
    misconceptions: [{ status: "RESOLVED", firstObservedAt: new Date(now.getTime() - 5 * 86_400_000), resolvedAt: now }],
    modules: [1, 2, 3].map((id) => ({ learnerId: `a-${id}`, completed: true })),
    interventions: [{ status: "completed", outcomeStatuses: ["ACHIEVED"] }],
    aiUsage: [{ learnerId: "a-1", inputTokens: 1000, outputTokens: 500, costMicros: 2500, pricingConfigured: true, success: true }],
    deterministicOperationCount: 12,
    aiOperationCount: 3,
    variants: [1, 2, 3].map((id) => ({ learnerId: `a-${id}`, variant: "ADAPTIVE" })),
    ...overrides,
  };
}

test("evaluation layer computes defined learning, engagement, and cost metrics", () => {
  const snapshot = buildLearningEvaluationSnapshot(input(), new Date("2026-08-25T12:00:00.000Z"));
  const byKey = new Map(snapshot.metrics.map((item) => [item.key, item]));
  assert.equal(byKey.get("diagnostic_scoring_accuracy")?.value, 1);
  assert.equal(byKey.get("retention_rate")?.value, 1);
  assert.equal(byKey.get("transfer_success_rate")?.value, 1);
  assert.equal(byKey.get("hint_dependency")?.value, 0.25);
  assert.equal(byKey.get("ai_cost_per_session")?.value, 0.0025 / 3);
  assert.equal(snapshot.operations.deterministicShare, 0.8);
});

test("adaptive comparison refuses to claim a result without both sufficient cohorts", () => {
  const snapshot = buildLearningEvaluationSnapshot(input({ variants: [{ learnerId: "a-1", variant: "LINEAR" }] }));
  assert.equal(snapshot.variantComparison[0].status, "INSUFFICIENT_EVIDENCE");
  assert.equal(snapshot.variantComparison[0].verifiedSuccessRate, null);
});

test("cost metrics report unconfigured pricing instead of zero cost", () => {
  const snapshot = buildLearningEvaluationSnapshot(input({ aiUsage: [{ learnerId: "a-1", inputTokens: 10, outputTokens: 10, costMicros: null, pricingConfigured: false, success: true }] }));
  const cost = snapshot.metrics.find((item) => item.key === "ai_cost_per_session")!;
  assert.equal(cost.value, null);
  assert.equal(cost.status, "PRICING_NOT_CONFIGURED");
});

test("AI cost calculation uses configured per-million token rates", () => {
  const oldInput = process.env.AI_INPUT_COST_PER_MILLION_USD;
  const oldOutput = process.env.AI_OUTPUT_COST_PER_MILLION_USD;
  process.env.AI_INPUT_COST_PER_MILLION_USD = "1";
  process.env.AI_OUTPUT_COST_PER_MILLION_USD = "5";
  assert.equal(calculateAICostMicros(1000, 500), 3500);
  if (oldInput === undefined) delete process.env.AI_INPUT_COST_PER_MILLION_USD; else process.env.AI_INPUT_COST_PER_MILLION_USD = oldInput;
  if (oldOutput === undefined) delete process.env.AI_OUTPUT_COST_PER_MILLION_USD; else process.env.AI_OUTPUT_COST_PER_MILLION_USD = oldOutput;
});

test("experiment assignment is stable and opt-in", () => {
  assert.equal(selectLearningPathVariant("learner-1", false), "ADAPTIVE");
  assert.equal(selectLearningPathVariant("learner-1", true), selectLearningPathVariant("learner-1", true));
});
