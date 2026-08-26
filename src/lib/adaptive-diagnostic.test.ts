import assert from "node:assert/strict";
import test from "node:test";
import { SkillGraph } from "./learning/graph";
import {
  evaluateDiagnosticStopping,
  selectNextDiagnosticAction,
  type DiagnosticResponseHistoryItem,
  type DiagnosticSkillCandidate,
} from "./learning/diagnostics";

const candidates: DiagnosticSkillCandidate[] = [
  { skillId: "number", slug: "number", name: "Number Sense", gradeMin: 1, gradeMax: 4, difficulty: 2, masteryProbability: 0.8, uncertainty: 0.3, evidenceCount: 5, misconceptionProbability: 0 },
  { skillId: "multiply", slug: "multiply", name: "Multiplication", gradeMin: 3, gradeMax: 5, difficulty: 3, masteryProbability: 0.45, uncertainty: 0.8, evidenceCount: 1, misconceptionProbability: 0.1 },
  { skillId: "divide", slug: "divide", name: "Division", gradeMin: 3, gradeMax: 5, difficulty: 3, masteryProbability: 0.35, uncertainty: 0.7, evidenceCount: 1, misconceptionProbability: 0.2 },
  { skillId: "fractions", slug: "fractions", name: "Fractions", gradeMin: 3, gradeMax: 6, difficulty: 4, masteryProbability: 0.5, uncertainty: 0.9, evidenceCount: 0, misconceptionProbability: 0 },
];
const graph = new SkillGraph(
  candidates.map(({ skillId, slug, name }) => ({ id: skillId, slug, name, domainId: "math" })),
  [
    { prerequisiteSkillId: "number", dependentSkillId: "multiply", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.7 },
    { prerequisiteSkillId: "multiply", dependentSkillId: "divide", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
    { prerequisiteSkillId: "divide", dependentSkillId: "fractions", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.7 },
  ]
);

function response(
  questionId: string,
  skillId: string,
  isCorrect: boolean,
  hintsUsed = 0
): DiagnosticResponseHistoryItem {
  return { questionId, skillId, isCorrect, difficulty: 3, hintsUsed };
}

test("starts with the grade-aligned skill that reduces the most uncertainty", () => {
  const action = selectNextDiagnosticAction({ graph, candidates, history: [], grade: 5 });

  assert.equal(action.action, "ASK");
  if (action.action === "ASK") {
    assert.equal(action.selectedSkill.skillId, "fractions");
    assert.equal(action.direction, "START");
    assert.match(action.reasonCodes.join(" "), /HIGH_UNCERTAINTY/);
  }
});

test("moves down to the lowest unresolved required prerequisite after failure", () => {
  const action = selectNextDiagnosticAction({
    graph,
    candidates,
    history: [response("q1", "fractions", false)],
    grade: 5,
  });

  assert.equal(action.action, "ASK");
  if (action.action === "ASK") {
    assert.equal(action.direction, "DOWN");
    assert.equal(action.selectedSkill.skillId, "multiply");
    assert.ok(action.targetDifficulty <= 3);
  }
});

test("moves up to a dependent skill after repeated independent success", () => {
  const action = selectNextDiagnosticAction({
    graph,
    candidates,
    history: [response("q1", "multiply", true), response("q2", "multiply", true)],
    grade: 5,
  });

  assert.equal(action.action, "ASK");
  if (action.action === "ASK") {
    assert.equal(action.direction, "UP");
    assert.equal(action.selectedSkill.skillId, "divide");
    assert.match(action.reasonCodes.join(" "), /PROBE_DEPENDENT_SKILL/);
  }
});

test("prioritizes a plausible misconception when it can discriminate the hypothesis", () => {
  const misconceptionCandidates = candidates.map((candidate) => ({
    ...candidate,
    uncertainty: candidate.skillId === "divide" ? 0.8 : 0.35,
    misconceptionProbability: candidate.skillId === "divide" ? 0.9 : 0,
  }));
  const action = selectNextDiagnosticAction({
    graph,
    candidates: misconceptionCandidates,
    history: [response("q1", "number", true)],
    grade: 5,
  });

  assert.equal(action.action, "ASK");
  if (action.action === "ASK") {
    assert.equal(action.selectedSkill.skillId, "divide");
    assert.match(action.reasonCodes.join(" "), /MISCONCEPTION_DISCRIMINATION/);
  }
});

test("flags confidence mismatch as useful follow-up evidence", () => {
  const action = selectNextDiagnosticAction({
    graph,
    candidates,
    history: [{ ...response("q1", "divide", false), confidenceRating: 9 }],
    grade: 5,
  });

  assert.equal(action.action, "ASK");
  if (action.action === "ASK") {
    const divideScore = action.candidateScores.find((score) => score.skillId === "divide");
    assert.match(divideScore?.reasonCodes.join(" ") ?? "", /CONFIDENCE_CALIBRATION_PROBE/);
  }
});

test("stops when configured coverage and uncertainty are sufficient", () => {
  const history = [
    response("q1", "number", true), response("q2", "number", true), response("q3", "number", true),
    response("q4", "multiply", true), response("q5", "multiply", false), response("q6", "multiply", true),
    response("q7", "divide", false), response("q8", "divide", true), response("q9", "divide", true),
  ];
  const decision = evaluateDiagnosticStopping({ candidates, history });

  assert.equal(decision.shouldStop, true);
  assert.equal(decision.reason, "SUFFICIENT_COVERAGE_AND_CERTAINTY");
  assert.equal(decision.coveredSkillCount, 3);
});

test("uses maximum question count as a safety stop despite unresolved uncertainty", () => {
  const history = Array.from({ length: 18 }, (_, index) =>
    response(`q${index}`, "fractions", index % 2 === 0)
  );
  const decision = evaluateDiagnosticStopping({ candidates, history });

  assert.equal(decision.shouldStop, true);
  assert.equal(decision.reason, "MAXIMUM_QUESTIONS_REACHED");
});

test("continues before minimum evidence even when initial projections are confident", () => {
  const decision = evaluateDiagnosticStopping({
    candidates: candidates.map((candidate) => ({ ...candidate, uncertainty: 0.1 })),
    history: [response("q1", "number", true), response("q2", "multiply", true)],
  });

  assert.equal(decision.shouldStop, false);
  assert.ok(decision.estimatedProgress < 1);
});
