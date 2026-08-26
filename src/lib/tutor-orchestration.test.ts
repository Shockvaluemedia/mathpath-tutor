import assert from "node:assert/strict";
import test from "node:test";
import { selectTutorTurn, type TutorLearnerState } from "./tutor/orchestration";
import { INSTRUCTIONAL_STRATEGIES } from "./tutor/strategies";

function learnerState(overrides: Partial<TutorLearnerState> = {}): TutorLearnerState {
  return {
    learnerId: "learner-1",
    developmentalStage: "MIDDLE_SCHOOL",
    grade: 7,
    confidenceLevel: 6,
    currentFrustration: false,
    targetSkill: {
      skillId: "equations",
      slug: "equations",
      name: "One-Step Equations",
      masteryProbability: 0.52,
      uncertainty: 0.48,
      status: "DEVELOPING",
    },
    prerequisiteBlocker: null,
    activePatterns: [],
    activeMisconceptions: [],
    successfulStrategies: [],
    recentEvidence: [],
    activeInterventionTypes: [],
    ...overrides,
  };
}

test("defines the complete formal instructional strategy catalog", () => {
  assert.deepEqual(Object.keys(INSTRUCTIONAL_STRATEGIES).sort(), [
    "ANALOGY",
    "CHALLENGE",
    "CONCRETE_EXAMPLE",
    "CONFIDENCE_RECOVERY",
    "ERROR_ANALYSIS",
    "GUIDED_PRACTICE",
    "INDEPENDENT_PRACTICE",
    "REVIEW",
    "SOCRATIC",
    "TEACH_BACK",
    "VISUAL",
    "WORKED_EXAMPLE",
  ]);
});

test("responds to frustration by reducing cognitive load and restoring confidence", () => {
  const result = selectTutorTurn({ message: "I can't do this, it is too hard", state: learnerState() });

  assert.equal(result.action, "TRIGGER_CONFIDENCE_RECOVERY");
  assert.equal(result.strategy, "CONFIDENCE_RECOVERY");
  assert.match(result.reasonCodes.join(" "), /REDUCE_STEP_SIZE/);
});

test("permits a parallel worked example when the learner explicitly asks", () => {
  const result = selectTutorTurn({ message: "Can you show me a worked example?", state: learnerState() });

  assert.equal(result.action, "PROVIDE_WORKED_EXAMPLE");
  assert.equal(result.allowWorkedExample, true);
  assert.equal(result.responseConstraints.doNotSolveActiveGradedItem, true);
});

test("uses error analysis for an evidence-backed active misconception", () => {
  const result = selectTutorTurn({
    message: "Why was my answer wrong?",
    state: learnerState({
      activeMisconceptions: [{ code: "SIGN_REVERSAL", name: "Sign reversal", probability: 0.72, status: "LIKELY" }],
    }),
  });

  assert.equal(result.action, "OFFER_ERROR_ANALYSIS");
  assert.equal(result.strategy, "ERROR_ANALYSIS");
});

test("moves to the lowest unresolved prerequisite before the target", () => {
  const result = selectTutorTurn({
    message: "How do I start?",
    state: learnerState({
      prerequisiteBlocker: {
        skillId: "integers",
        slug: "integer-operations",
        name: "Integer Operations",
        masteryProbability: 0.4,
        uncertainty: 0.6,
        status: "DEVELOPING",
      },
    }),
  });

  assert.equal(result.action, "MOVE_TO_PREREQUISITE");
  assert.equal(result.prerequisiteSkillId, "integers");
});

test("raises challenge after repeated independent success", () => {
  const state = learnerState({
    recentEvidence: [0, 1].map((index) => ({
      skillId: "equations",
      outcome: "CORRECT",
      assistanceLevel: "INDEPENDENT",
      hintsUsed: 0,
      instructionalStrategy: "INDEPENDENT_PRACTICE",
      occurredAt: new Date(Date.UTC(2026, 0, 2, 0, index)).toISOString(),
    })),
  });
  const result = selectTutorTurn({ message: "What's next?", state });

  assert.equal(result.action, "INCREASE_CHALLENGE");
  assert.equal(result.strategy, "CHALLENGE");
});

test("fades scaffolding when evidence shows hint dependency", () => {
  const result = selectTutorTurn({
    message: "Let's keep going",
    state: learnerState({
      activePatterns: [{ patternType: "HINT_DEPENDENCY", scopeKey: "equations", statement: "Relies on hints", confidence: 0.8 }],
    }),
  });

  assert.equal(result.action, "ASK_GUIDING_QUESTION");
  assert.equal(result.strategy, "SOCRATIC");
  assert.match(result.reasonCodes.join(" "), /FADE_SCAFFOLDING/);
});

test("keeps language constraints age-respectful for older learners", () => {
  const result = selectTutorTurn({
    message: "Explain this concept",
    state: learnerState({ developmentalStage: "HIGH_SCHOOL", grade: 10, targetSkill: { ...learnerState().targetSkill!, gradeMax: 5 } }),
  });

  assert.equal(result.responseConstraints.useAgeRespectfulLanguage, true);
  assert.equal(result.responseConstraints.maximumSentences, 6);
  assert.equal(result.responseConstraints.challengeLevel, "FOUNDATIONAL");
  assert.equal(result.responseConstraints.avoidChildishLanguage, true);
});

test("collects teach-back reasoning when a learner asks to explain", () => {
  const result = selectTutorTurn({ message: "Let me explain why my method works", state: learnerState() });
  assert.equal(result.action, "ASK_TEACH_BACK");
  assert.equal(result.strategy, "TEACH_BACK");
  assert.match(result.reasonCodes.join(" "), /COLLECT_REASONING_EVIDENCE/);
});
