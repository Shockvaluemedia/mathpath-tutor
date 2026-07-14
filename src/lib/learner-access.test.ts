import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateLearnerAccess,
  generateLearnerAccessCode,
  hashLearnerAccessCode,
  learnerAccessExpiresAt,
  normalizeLearnerAccessCode,
  type LearnerAccessCredentialRecord,
} from "./learner-access";

const TEST_SECRET = "learner-access-test-secret";
const NOW = new Date("2026-07-14T12:00:00.000Z");
const VALID_CODE = "ABCDE-FGHJK";

function credential(
  overrides: Partial<LearnerAccessCredentialRecord> = {}
): LearnerAccessCredentialRecord {
  return {
    id: "credential-1",
    learnerId: "learner-1",
    codeHash: hashLearnerAccessCode(VALID_CODE, TEST_SECRET),
    expiresAt: learnerAccessExpiresAt(NOW),
    revokedAt: null,
    learner: {
      id: "learner-1",
      name: "Alex",
      grade: 5,
      developmentalStage: "ELEMENTARY",
    },
    ...overrides,
  };
}

test("learner access codes use an unambiguous, shareable format", () => {
  assert.match(generateLearnerAccessCode(), /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(normalizeLearnerAccessCode(" abcde fghjk "), "ABCDEFGHJK");
  assert.equal(normalizeLearnerAccessCode("ABCDE-0GHJK"), null);
});

test("learner access codes are stored as stable keyed hashes", () => {
  assert.equal(
    hashLearnerAccessCode("abcde fghjk", TEST_SECRET),
    hashLearnerAccessCode(VALID_CODE, TEST_SECRET)
  );
  assert.notEqual(
    hashLearnerAccessCode(VALID_CODE, TEST_SECRET),
    hashLearnerAccessCode("ABCDE-FGHJL", TEST_SECRET)
  );
});

test("an active learner credential authenticates the intended learner", async () => {
  const stored = credential();
  const result = await authenticateLearnerAccess({
    code: VALID_CODE,
    studentName: " alex ",
    now: NOW,
    secret: TEST_SECRET,
    lookup: async (codeHash) => (codeHash === stored.codeHash ? stored : null),
  });

  assert.equal(result, stored);
});

test("a malformed or unknown learner credential is rejected", async () => {
  let lookupCount = 0;
  const malformed = await authenticateLearnerAccess({
    code: "not-a-code",
    now: NOW,
    secret: TEST_SECRET,
    lookup: async () => {
      lookupCount += 1;
      return credential();
    },
  });
  const unknown = await authenticateLearnerAccess({
    code: VALID_CODE,
    now: NOW,
    secret: TEST_SECRET,
    lookup: async () => null,
  });

  assert.equal(malformed, null);
  assert.equal(unknown, null);
  assert.equal(lookupCount, 0);
});

test("expired and revoked learner credentials are rejected", async () => {
  const expired = credential({ expiresAt: new Date(NOW.getTime() - 1) });
  const revoked = credential({ revokedAt: new Date(NOW.getTime() - 1) });

  for (const stored of [expired, revoked]) {
    const result = await authenticateLearnerAccess({
      code: VALID_CODE,
      now: NOW,
      secret: TEST_SECRET,
      lookup: async () => stored,
    });
    assert.equal(result, null);
  }
});

test("a credential is rejected when the supplied learner name does not match", async () => {
  const result = await authenticateLearnerAccess({
    code: VALID_CODE,
    studentName: "Maya",
    now: NOW,
    secret: TEST_SECRET,
    lookup: async () => credential(),
  });

  assert.equal(result, null);
});
