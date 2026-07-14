import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeLearnerAccess,
  canAccessLearner,
  LearnerOwnership,
} from "./authorization";
import type { TokenPayload } from "./auth";

const learner: LearnerOwnership = {
  id: "learner-1",
  guardianUserId: "guardian-1",
};

function user(userId: string, role: TokenPayload["role"]): TokenPayload {
  return { userId, role, email: `${userId}@example.test` };
}

test("a guardian can access only their own learner", () => {
  assert.equal(canAccessLearner(user("guardian-1", "PARENT"), learner), true);
  assert.equal(canAccessLearner(user("guardian-2", "PARENT"), learner), false);
});

test("a learner can access only their own record", () => {
  assert.equal(canAccessLearner(user("learner-1", "LEARNER"), learner), true);
  assert.equal(canAccessLearner(user("learner-2", "LEARNER"), learner), false);
});

test("staff roles do not gain cross-family access without an assignment", () => {
  assert.equal(canAccessLearner(user("teacher-1", "TEACHER"), learner), false);
  assert.equal(canAccessLearner(user("mentor-1", "MENTOR"), learner), false);
});

test("assigned staff can access learners in their organization", () => {
  const assignedLearner = {
    ...learner,
    organizationUserIds: ["teacher-1", "mentor-1"],
  };

  assert.equal(
    canAccessLearner(user("teacher-1", "TEACHER"), assignedLearner),
    true
  );
  assert.equal(
    canAccessLearner(user("mentor-1", "MENTOR"), assignedLearner),
    true
  );
  assert.equal(
    canAccessLearner(user("parent-2", "PARENT"), assignedLearner),
    false
  );
});

test("platform administrators can access learner records", () => {
  assert.equal(canAccessLearner(user("admin-1", "ADMIN"), learner), true);
});

test("authorization rejects another guardian before learner data is used", async () => {
  const result = await authorizeLearnerAccess(
    user("guardian-2", "PARENT"),
    learner.id,
    async () => learner
  );

  assert.deepEqual(result, { ok: false, status: 403, error: "Forbidden" });
});

test("authorization returns not found for an unknown learner", async () => {
  const result = await authorizeLearnerAccess(
    user("guardian-1", "PARENT"),
    "missing",
    async () => null
  );

  assert.deepEqual(result, {
    ok: false,
    status: 404,
    error: "Learner not found",
  });
});
