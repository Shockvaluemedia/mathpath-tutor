import assert from "node:assert/strict";
import test from "node:test";
import { computeMasteryState } from "./learning/mastery/mastery-engine";
import type { LearningEvidenceRecord } from "./learning/mastery/types";

const NOW = new Date("2026-08-24T12:00:00.000Z");

function evidence(
  id: string,
  overrides: Partial<LearningEvidenceRecord> = {}
): LearningEvidenceRecord {
  return {
    idempotencyKey: id,
    learnerId: "learner-1",
    skillId: "fractions",
    evidenceType: "PRACTICE",
    outcome: "CORRECT",
    assistanceLevel: "INDEPENDENT",
    sourceType: "test",
    occurredAt: NOW,
    difficulty: 3,
    ...overrides,
  };
}

test("one correct answer never creates mastery", () => {
  const state = computeMasteryState([evidence("one")]);

  assert.notEqual(state.status, "MASTERED");
  assert.equal(state.independentSuccesses, 1);
  assert.equal(state.reasonCodes.includes("INSUFFICIENT_INDEPENDENT_SUCCESS"), true);
  assert.equal(state.reasonCodes.includes("RETENTION_NOT_VERIFIED"), true);
  assert.equal(state.reasonCodes.includes("TRANSFER_NOT_VERIFIED"), true);
});

test("repeated hinted success remains assisted performance, not mastery", () => {
  const records = [1, 2, 3, 4].map((index) => evidence(`hinted-${index}`, {
    assistanceLevel: "HINTED",
    hintsUsed: 1,
  }));
  const state = computeMasteryState(records);

  assert.equal(state.assistedSuccesses, 4);
  assert.equal(state.independentSuccesses, 0);
  assert.notEqual(state.status, "MASTERED");
});

test("independent, retention, and transfer evidence can establish durable mastery", () => {
  const records = [
    evidence("independent-1", { responseTimeMs: 40_000, expectedResponseTimeMs: 60_000 }),
    evidence("independent-2", { responseTimeMs: 48_000, expectedResponseTimeMs: 60_000 }),
    evidence("independent-3", { responseTimeMs: 55_000, expectedResponseTimeMs: 60_000 }),
    evidence("retention", { evidenceType: "RETENTION", delayDays: 14 }),
    evidence("transfer", { evidenceType: "TRANSFER", difficulty: 4 }),
  ];
  const state = computeMasteryState(records);

  assert.equal(state.status, "MASTERED");
  assert.equal(state.reasonCodes[0], "DURABLE_MASTERY_EVIDENCE_MET");
  assert.equal(state.retentionScore, 1);
  assert.equal(state.transferScore, 1);
  assert.equal(state.fluencyScore, 1);
});

test("failed delayed retrieval can lower a previously strong mastery estimate", () => {
  const strongEvidence = [
    evidence("independent-1"),
    evidence("independent-2"),
    evidence("independent-3"),
    evidence("retention", { evidenceType: "RETENTION", delayDays: 14 }),
    evidence("transfer", { evidenceType: "TRANSFER" }),
  ];
  const before = computeMasteryState(strongEvidence);
  const after = computeMasteryState([
    ...strongEvidence,
    evidence("failed-retention", {
      evidenceType: "RETENTION",
      outcome: "INCORRECT",
      delayDays: 21,
    }),
  ]);

  assert.equal(after.masteryProbability < before.masteryProbability, true);
  assert.equal(after.retentionScore, 0.5);
  assert.equal(after.reasonCodes.includes("RETENTION_SUCCESS_RATE_TOO_LOW"), true);
  assert.notEqual(after.status, "MASTERED");
});

test("ungraded exposure changes status without pretending performance", () => {
  const state = computeMasteryState([
    evidence("exposure", {
      evidenceType: "EXPOSURE",
      outcome: "UNGRADED",
      assistanceLevel: "NONE",
    }),
  ]);

  assert.equal(state.status, "EMERGING");
  assert.equal(state.gradedAttempts, 0);
  assert.equal(state.masteryProbability, 0.1);
});

test("active misconception evidence applies an explicit mastery penalty", () => {
  const records = [
    evidence("independent-1"),
    evidence("independent-2"),
    evidence("independent-3"),
    evidence("retention", { evidenceType: "RETENTION", delayDays: 14 }),
    evidence("transfer", { evidenceType: "TRANSFER" }),
  ];
  const unpenalized = computeMasteryState(records);
  const lightlyPenalized = computeMasteryState(records, { misconceptionPenalty: 0.01 });
  const penalized = computeMasteryState(records, { misconceptionPenalty: 0.2 });

  assert.equal(lightlyPenalized.status, "MASTERED");
  assert.equal(lightlyPenalized.reasonCodes.includes("ACTIVE_MISCONCEPTION_PENALTY"), true);
  assert.equal(penalized.masteryProbability < unpenalized.masteryProbability, true);
  assert.equal(penalized.reasonCodes.includes("ACTIVE_MISCONCEPTION_PENALTY"), true);
  assert.equal(penalized.reasonCodes.includes("ACTIVE_MISCONCEPTION_BLOCKS_MASTERY"), true);
  assert.notEqual(penalized.status, "MASTERED");
});
