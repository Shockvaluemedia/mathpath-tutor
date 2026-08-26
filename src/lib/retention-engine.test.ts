import assert from "node:assert/strict";
import test from "node:test";
import { createReviewSchedule, reviewScheduleStatus, updateReviewSchedule } from "./learning/retention";
import { resolveReviewQuestion, selectReviewQuestion } from "./learning/retention";

const now = new Date("2026-08-25T12:00:00.000Z");
const context = {
  masteryStatus: "PRACTICING" as const,
  masteryProbability: 0.72,
  uncertainty: 0.28,
  activeMisconceptionProbability: 0,
  requiredDependentCount: 0,
};

test("creates schedules for learned skills but not untouched skills", () => {
  assert.equal(createReviewSchedule({ ...context, masteryStatus: "NOT_STARTED" }, now), null);
  const schedule = createReviewSchedule(context, now);
  assert.equal(schedule?.intervalDays, 3);
  assert.equal(schedule?.nextReviewAt.toISOString(), "2026-08-28T12:00:00.000Z");
});

test("prioritizes fragile prerequisites and active misconceptions", () => {
  const schedule = createReviewSchedule({
    ...context,
    masteryStatus: "MASTERED",
    requiredDependentCount: 2,
    activeMisconceptionProbability: 0.7,
  }, now);

  assert.equal(schedule?.intervalDays, 1);
  assert.match(schedule?.reasonCodes.join(" ") ?? "", /PREREQUISITE_REVIEW_PRIORITY/);
  assert.match(schedule?.reasonCodes.join(" ") ?? "", /ACTIVE_MISCONCEPTION/);
});

test("successful delayed independent retrieval expands the interval and confidence", () => {
  const initial = createReviewSchedule(context, now)!;
  const updated = updateReviewSchedule(initial, {
    outcome: "CORRECT",
    assistanceLevel: "INDEPENDENT",
    responseTimeMs: 60_000,
    expectedResponseTimeMs: 75_000,
    delayDays: 3,
    occurredAt: new Date("2026-08-28T12:00:00.000Z"),
  }, context);

  assert.ok(updated.intervalDays > initial.intervalDays);
  assert.ok(updated.retentionConfidence > initial.retentionConfidence);
  assert.equal(updated.consecutiveSuccesses, 1);
  assert.match(updated.reasonCodes.join(" "), /SUCCESSFUL_DELAYED_RETRIEVAL/);
});

test("slow correct retrieval receives only a modest interval increase", () => {
  const initial = createReviewSchedule(context, now)!;
  const updated = updateReviewSchedule(initial, {
    outcome: "CORRECT",
    assistanceLevel: "INDEPENDENT",
    responseTimeMs: 150_000,
    expectedResponseTimeMs: 75_000,
    delayDays: 3,
    occurredAt: new Date("2026-08-28T12:00:00.000Z"),
  }, context);

  assert.equal(updated.intervalDays, 4);
  assert.match(updated.reasonCodes.join(" "), /SLOW_CORRECT/);
});

test("assisted retrieval does not masquerade as durable independent retention", () => {
  const initial = createReviewSchedule(context, now)!;
  const updated = updateReviewSchedule(initial, {
    outcome: "CORRECT",
    assistanceLevel: "HINTED",
    delayDays: 3,
    occurredAt: new Date("2026-08-28T12:00:00.000Z"),
  }, context);

  assert.equal(updated.intervalDays, initial.intervalDays);
  assert.equal(updated.consecutiveSuccesses, 0);
  assert.match(updated.reasonCodes.join(" "), /DOES_NOT_EXTEND/);
});

test("failed retrieval resets the interval and lowers retention confidence", () => {
  const initial = createReviewSchedule(context, now)!;
  const updated = updateReviewSchedule(initial, {
    outcome: "INCORRECT",
    assistanceLevel: "INDEPENDENT",
    delayDays: 4,
    occurredAt: new Date("2026-08-29T12:00:00.000Z"),
  }, context);

  assert.equal(updated.intervalDays, 1);
  assert.equal(updated.consecutiveSuccesses, 0);
  assert.ok(updated.retentionConfidence < initial.retentionConfidence);
});

test("due state derives from the persisted next review time", () => {
  const schedule = createReviewSchedule(context, now)!;
  assert.equal(reviewScheduleStatus(schedule, new Date("2026-08-27T12:00:00.000Z")), "SCHEDULED");
  assert.equal(reviewScheduleStatus(schedule, new Date("2026-08-28T12:00:00.000Z")), "DUE");
});

test("public review questions omit server-owned answers", () => {
  const publicQuestion = selectReviewQuestion("fractions", "Fractions", 0);
  const answer = resolveReviewQuestion(publicQuestion!.id, "fractions", "Fractions");

  assert.ok(publicQuestion);
  assert.equal("answer" in publicQuestion, false);
  assert.equal("explanation" in publicQuestion, false);
  assert.ok(answer?.answer);
  assert.equal(answer?.question, publicQuestion?.question);
});
