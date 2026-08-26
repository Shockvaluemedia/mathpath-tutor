import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSkillMeasurements,
  splitStoredSnapshots,
} from "./sprint-evidence";

test("assessment responses become deterministic per-skill measurements", () => {
  const measurements = buildSkillMeasurements([
    {
      skillId: "database-uuid-fractions",
      isCorrect: true,
      confidenceRating: 6,
      skill: { name: "Fractions", slug: "fractions", domain: { name: "Number Sense" } },
    },
    {
      skillId: "database-uuid-fractions",
      isCorrect: false,
      confidenceRating: 4,
      skill: { name: "Fractions", slug: "fractions", domain: { name: "Number Sense" } },
    },
    {
      skillId: "database-uuid-division",
      isCorrect: false,
      confidenceRating: 3,
      skill: { name: "Division", slug: "division", domain: { name: "Operations" } },
    },
  ]);

  assert.deepEqual(measurements, [
    {
      skillId: "division",
      name: "Division",
      domain: "Operations",
      correctCount: 0,
      questionCount: 1,
      score: 0,
      confidence: 3,
    },
    {
      skillId: "fractions",
      name: "Fractions",
      domain: "Number Sense",
      correctCount: 1,
      questionCount: 2,
      score: 50,
      confidence: 5,
    },
  ]);
});

test("stored snapshots remain separated by evidence phase", () => {
  const snapshots = splitStoredSnapshots([
    {
      phase: "endline",
      skillId: "fractions",
      skillName: "Fractions",
      domain: "Number Sense",
      correctCount: 3,
      questionCount: 4,
      score: 75,
      confidence: 7,
    },
    {
      phase: "baseline",
      skillId: "fractions",
      skillName: "Fractions",
      domain: "Number Sense",
      correctCount: 1,
      questionCount: 4,
      score: 25,
      confidence: 4,
    },
  ]);

  assert.equal(snapshots.baseline[0].score, 25);
  assert.equal(snapshots.endline[0].score, 75);
});
