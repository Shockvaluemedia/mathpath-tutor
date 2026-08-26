import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAssessmentQuestionBank,
  findAssessmentQuestion,
  metadataWithQuestionBank,
  normalizeDiagnosticQuestions,
  readAssessmentQuestionBank,
  restoreSecuredDiagnosticQuestion,
  stripDiagnosticAnswerKeys,
} from "./learning/diagnostics/question-bank";

test("diagnostic answer keys stay server-side", () => {
  const questions = normalizeDiagnosticQuestions([{
    id: "q1",
    skillId: "fractions",
    skillName: "Fractions",
    question: "What is 1/4 + 1/4?",
    correctAnswer: "1/2",
    difficulty: 2,
    hints: ["Use a common denominator"],
    answerType: "free-response",
  }], "batch-1");
  const bank = buildAssessmentQuestionBank(questions);
  const metadata = metadataWithQuestionBank({}, bank);
  const publicQuestions = stripDiagnosticAnswerKeys(questions);

  assert.equal(questions[0].id, "batch-1:1:q1");
  assert.equal("correctAnswer" in publicQuestions[0], false);
  assert.equal(findAssessmentQuestion(metadata, "batch-1:1:q1")?.correctAnswer, "1/2");
  assert.equal(metadata.scoringAuthority, "SERVER_ANSWER_KEY");
});

test("invalid generated questions cannot enter the server answer bank", () => {
  const questions = normalizeDiagnosticQuestions([
    { id: "missing-key", skillId: "fractions", question: "Unscored" },
  ], "batch-2");

  assert.deepEqual(questions, []);
});

test("repeated model IDs still receive unique server question IDs", () => {
  const baseQuestion = {
    id: "q1",
    skillId: "fractions",
    skillName: "Fractions",
    question: "What is one half?",
    correctAnswer: "1/2",
    difficulty: 1,
    hints: [],
    answerType: "multiple-choice",
    options: [],
  };
  const questions = normalizeDiagnosticQuestions([
    baseQuestion,
    { ...baseQuestion, question: "Write one half." },
  ], "batch-3");

  assert.equal(new Set(questions.map((question) => question.id)).size, 2);
  assert.deepEqual(questions.map((question) => question.answerType), [
    "free-response",
    "free-response",
  ]);
});

test("stored questions retain the fields needed for retry-safe re-serving", () => {
  const [question] = normalizeDiagnosticQuestions([{
    id: "q1",
    skillId: "division",
    skillName: "Division",
    question: "What is 12 divided by 3?",
    correctAnswer: "4",
    difficulty: 2,
    hints: ["Think about equal groups."],
    answerType: "multiple-choice",
    options: ["3", "4", "6", "9"],
    gradeBand: "ELEMENTARY",
  }], "retry-batch");
  const metadata = metadataWithQuestionBank({}, buildAssessmentQuestionBank([question]));
  const restored = restoreSecuredDiagnosticQuestion(readAssessmentQuestionBank(metadata)[0]);

  assert.deepEqual(restored, question);
  assert.equal("correctAnswer" in stripDiagnosticAnswerKeys([restored])[0], false);
});
