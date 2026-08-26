import assert from "node:assert/strict";
import test from "node:test";
import { buildAssessmentEvidence, buildLessonEvidence } from "./learning/evidence/builders";
import { verifyLessonResponses } from "./learning/evidence/lesson-verification";
import { areMathAnswersEquivalent } from "./math/validators/basic-answer";

test("deterministic answer comparison recognizes equivalent numbers and fractions", () => {
  assert.equal(areMathAnswersEquivalent("0.5", "1/2").equivalent, true);
  assert.equal(areMathAnswersEquivalent("2/4", "1/2").equivalent, true);
  assert.equal(areMathAnswersEquivalent("$1,250", "1250").equivalent, true);
  assert.equal(areMathAnswersEquivalent("2x + 3", "2x+3").equivalent, true);
  assert.equal(areMathAnswersEquivalent("2x + 3", "2x+6").equivalent, false);
});

test("lesson evidence separates guided, hinted, and independent performance", () => {
  const records = buildLessonEvidence("learner", "skill", "lesson", [
    { sectionKey: "guidedPractice", questionIndex: 0, isCorrect: true, verified: true },
    { sectionKey: "independentPractice", questionIndex: 0, isCorrect: true, verified: true },
    { sectionKey: "challenge", questionIndex: 0, isCorrect: false, verified: true, hintsUsed: 1 },
  ]);

  assert.deepEqual(records.map((record) => record.assistanceLevel), ["GUIDED", "INDEPENDENT", "HINTED"]);
  assert.deepEqual(records.map((record) => record.outcome), ["CORRECT", "CORRECT", "INCORRECT"]);
  assert.equal(new Set(records.map((record) => record.idempotencyKey)).size, 3);
});

test("an unverified legacy response is retained but cannot affect mastery", () => {
  const record = buildAssessmentEvidence("learner", "skill", {
    responseId: "response-1",
    learnerAnswer: "7",
    correctAnswer: "7",
    isCorrect: true,
    verified: false,
    assessmentType: "diagnostic",
  });

  assert.equal(record.outcome, "UNGRADED");
  assert.equal(record.correctAnswer, undefined);
  assert.equal(record.metadata?.verification, "UNVERIFIED_LEGACY_RESPONSE");
});

test("review and transfer assessments produce distinct evidence categories", () => {
  const review = buildAssessmentEvidence("learner", "skill", {
    responseId: "review",
    learnerAnswer: "4",
    correctAnswer: "4",
    isCorrect: true,
    verified: true,
    assessmentType: "review",
  });
  const transfer = buildAssessmentEvidence("learner", "skill", {
    responseId: "transfer",
    learnerAnswer: "4",
    correctAnswer: "4",
    isCorrect: true,
    verified: true,
    assessmentType: "transfer",
  });

  assert.equal(review.evidenceType, "RETENTION");
  assert.equal(transfer.evidenceType, "TRANSFER");
});

test("classified assessment errors enter evidence without trusting browser correctness", () => {
  const record = buildAssessmentEvidence("learner", "skill", {
    responseId: "response-error",
    learnerAnswer: "2/6",
    correctAnswer: "5/6",
    isCorrect: false,
    verified: true,
    mistakeType: "fraction-component-addition",
  });

  assert.equal(record.outcome, "INCORRECT");
  assert.equal(record.metadata?.mistakeType, "fraction-component-addition");
});

test("lesson correctness is derived from the stored answer key", () => {
  const lesson = {
    independentPractice: {
      representation: "visual-model",
      questions: [{ answer: "1/2" }],
    },
  };
  const [response] = verifyLessonResponses(lesson, [{
    sectionKey: "independentPractice",
    questionIndex: 0,
    learnerAnswer: "2/4",
    isCorrect: false,
    hintsUsed: 0,
    responseTimeMs: 12_000,
  }]);

  assert.equal(response.verified, true);
  assert.equal(response.isCorrect, true);
  assert.equal(response.correctAnswer, "1/2");
  assert.equal(response.questionId, "independentPractice:0");
  assert.equal(response.representation, "visual-model");
});

test("lesson responses without a stored coordinate remain ungraded", () => {
  const [response] = verifyLessonResponses({}, [{
    answer: "7",
    isCorrect: true,
  }]);

  assert.equal(response.verified, false);
  assert.equal(response.isCorrect, undefined);
});

test("malformed lesson coordinates cannot collide with verified evidence keys", () => {
  const lesson = { warmup: { questions: [{ answer: "3" }] } };
  const responses = verifyLessonResponses(lesson, [
    { questionId: "warmup:0", learnerAnswer: "wrong" },
    { sectionKey: "warmup", questionIndex: 0, learnerAnswer: "3" },
  ]);

  assert.equal(new Set(responses.map((response) => response.questionId)).size, 2);
  assert.equal(responses.some((response) => response.verified), true);
  assert.equal(responses.some((response) => !response.verified), true);
});
