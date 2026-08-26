import assert from "node:assert/strict";
import test from "node:test";
import { THINKING_COMPETENCIES, computeCompetencyState, type CompetencyEvidenceRecord } from "./learning/competencies";
import { generateTransferProblem, type TransferMode } from "./learning/transfer";

test("defines the full extensible mathematical thinking competency catalog", () => {
  assert.equal(Object.keys(THINKING_COMPETENCIES).length, 11);
  assert.ok("REPRESENTATION_SWITCHING" in THINKING_COMPETENCIES);
  assert.ok("PROOF_EXPLANATION" in THINKING_COMPETENCIES);
});

test("one competency observation remains insufficient evidence", () => {
  const state = computeCompetencyState([{ idempotencyKey: "e1", competencyCode: "MODELING", outcome: "CORRECT", weight: 1, contextType: "word-problem", occurredAt: new Date() }]);
  assert.equal(state.status, "INSUFFICIENT_EVIDENCE");
  assert.ok(state.uncertainty > 0.5);
});

test("competency strength requires repeated success across contexts", () => {
  const contexts = ["word-problem", "real-world", "diagram"];
  const evidence: CompetencyEvidenceRecord[] = Array.from({ length: 14 }, (_, index) => ({
    idempotencyKey: `e${index}`,
    competencyCode: "MODELING",
    outcome: "CORRECT",
    weight: 1,
    contextType: contexts[index % contexts.length],
    occurredAt: new Date(2026, 0, index + 1),
  }));
  const state = computeCompetencyState(evidence);
  assert.equal(state.status, "ESTABLISHED");
  assert.equal(state.contextCount, 3);
});

test("all transfer modes produce explicit competency and grading metadata", () => {
  const modes: TransferMode[] = ["DIFFERENT_REPRESENTATION", "WORD_PROBLEM", "UNFAMILIAR_NUMBERS", "MIXED_SKILL", "REAL_WORLD_MODELING", "ERROR_ANALYSIS", "REVERSE_PROBLEM", "TEACH_BACK"];
  for (const mode of modes) {
    const problem = generateTransferProblem({ targetSkillId: "integers", skillName: "Integer Addition", difficulty: 3, seed: mode }, mode);
    assert.equal(problem?.transferType, mode);
    assert.ok((problem?.competencyCodes.length ?? 0) >= 2);
    assert.equal(problem?.gradingMode, mode === "TEACH_BACK" ? "RUBRIC_REQUIRED" : "DETERMINISTIC");
  }
});

test("error analysis uses a verified wrong proposal and a deterministic yes-no answer", () => {
  const problem = generateTransferProblem({ targetSkillId: "fractions", skillName: "Fractions", difficulty: 3, seed: "error" }, "ERROR_ANALYSIS");
  assert.equal(problem?.correctAnswer, "no");
  assert.match(problem?.prompt ?? "", /Is that answer correct/);
  assert.ok(problem?.competencyCodes.includes("ERROR_CHECKING"));
});
