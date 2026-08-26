import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMisconceptionEvidence,
  selectDiscriminatingFollowUp,
} from "./learning/misconceptions/hypothesis-engine";
import { MATH_MISCONCEPTION_CATALOG } from "./math/misconceptions/catalog";
import { detectMisconceptionSignatures } from "./math/misconceptions/detect";

test("fraction component addition raises a specific misconception hypothesis", () => {
  const matches = detectMisconceptionSignatures(
    {
      skillSlug: "fraction-addition-unlike-denominators",
      question: "Compute 1/3 + 1/4.",
      learnerAnswer: "2/7",
      correctAnswer: "7/12",
      isCorrect: false,
    },
    MATH_MISCONCEPTION_CATALOG
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].code, "FRACTION_INDEPENDENT_COMPONENT_ADDITION");
  assert.match(matches[0].reasonCode, /DETERMINISTIC_SIGNATURE_MATCH/);
});

test("an unrelated wrong answer is not automatically classified as a misconception", () => {
  const matches = detectMisconceptionSignatures(
    {
      skillSlug: "fraction-addition-unlike-denominators",
      question: "Compute 1/3 + 1/4.",
      learnerAnswer: "5/12",
      correctAnswer: "7/12",
      isCorrect: false,
    },
    MATH_MISCONCEPTION_CATALOG
  );

  assert.deepEqual(matches, []);
});

test("partial distribution is detected deterministically", () => {
  const matches = detectMisconceptionSignatures(
    {
      skillSlug: "distributive-property",
      question: "Expand 2(x + 3).",
      learnerAnswer: "2x + 3",
      correctAnswer: "2x + 6",
      isCorrect: false,
    },
    MATH_MISCONCEPTION_CATALOG
  );

  assert.equal(matches[0]?.code, "PARTIAL_DISTRIBUTION");
});

test("supporting and contradicting evidence update probability and lifecycle status", () => {
  const state = {
    probability: 0.25,
    status: "SUSPECTED" as const,
    evidenceCount: 0,
    contradictingEvidenceCount: 0,
  };

  const first = applyMisconceptionEvidence(state, { direction: "SUPPORTS" });
  const second = applyMisconceptionEvidence(first, { direction: "SUPPORTS" });
  assert.equal(second.status, "CONFIRMED");
  assert.equal(second.probability > first.probability, true);

  let resolving = applyMisconceptionEvidence(second, { direction: "CONTRADICTS", weight: 2 });
  assert.equal(resolving.status, "RESOLVING");
  resolving = applyMisconceptionEvidence(resolving, { direction: "CONTRADICTS", weight: 2 });
  const resolved = applyMisconceptionEvidence(resolving, { direction: "CONTRADICTS", weight: 2 });
  assert.equal(resolved.status, "RESOLVED");
  assert.equal(resolved.resolved, true);
});

test("follow-up selection favors a question that distinguishes competing hypotheses", () => {
  const selected = selectDiscriminatingFollowUp(
    [
      { code: "FRACTION_INDEPENDENT_COMPONENT_ADDITION", probability: 0.6, status: "LIKELY" },
      { code: "FRACTION_EQUIVALENCE_GAP", probability: 0.55, status: "LIKELY" },
    ],
    [
      {
        id: "generic-fraction",
        skillSlug: "fractions",
        question: "Name this fraction.",
        hypothesisCodes: ["FRACTION_EQUIVALENCE_GAP"],
      },
      {
        id: "discriminator",
        skillSlug: "fraction-equivalence",
        question: "Which fraction is equivalent to 1/2, then add 1/3?",
        hypothesisCodes: [
          "FRACTION_INDEPENDENT_COMPONENT_ADDITION",
          "FRACTION_EQUIVALENCE_GAP",
        ],
      },
    ]
  );

  assert.equal(selected?.question.id, "discriminator");
  assert.equal(selected?.reasonCode, "DISTINGUISH_COMPETING_MISCONCEPTIONS");
});
