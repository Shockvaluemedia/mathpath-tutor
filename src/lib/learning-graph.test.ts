import assert from "node:assert/strict";
import test from "node:test";
import { SkillGraph } from "./learning/graph/skill-graph";
import type { SkillDependencyEdge, SkillGraphNode } from "./learning/graph/types";

const skills: SkillGraphNode[] = [
  { id: "number-sense", slug: "number-sense", name: "Number Sense", domainId: "math" },
  { id: "division", slug: "division", name: "Division", domainId: "math" },
  { id: "fraction-equivalence", slug: "fraction-equivalence", name: "Fraction Equivalence", domainId: "math" },
  { id: "proportions", slug: "proportions", name: "Proportions", domainId: "math" },
  { id: "percentages", slug: "percentages", name: "Percentages", domainId: "math" },
];

const dependencies: SkillDependencyEdge[] = [
  { prerequisiteSkillId: "number-sense", dependentSkillId: "division", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSkillId: "division", dependentSkillId: "fraction-equivalence", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
  { prerequisiteSkillId: "fraction-equivalence", dependentSkillId: "proportions", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
  { prerequisiteSkillId: "proportions", dependentSkillId: "percentages", dependencyType: "SUPPORTING", weight: 0.5, minimumMasteryRequired: 0.6 },
];

test("skill graph retrieves direct, ancestor, and dependent skills", () => {
  const graph = new SkillGraph(skills, dependencies);

  assert.deepEqual(graph.getDirectPrerequisites("proportions").map((skill) => skill.id), ["fraction-equivalence"]);
  assert.deepEqual(
    graph.getAncestorPrerequisites("proportions", ["REQUIRED"]).map((skill) => skill.id),
    ["fraction-equivalence", "division", "number-sense"]
  );
  assert.deepEqual(graph.getDependentSkills("fraction-equivalence").map((skill) => skill.id), ["proportions"]);
});

test("readiness reports every unresolved required prerequisite with evidence thresholds", () => {
  const graph = new SkillGraph(skills, dependencies);
  const readiness = graph.determineReadiness("proportions", [
    { skillId: "number-sense", masteryProbability: 0.9 },
    { skillId: "division", masteryProbability: 0.55 },
    { skillId: "fraction-equivalence", masteryProbability: 0.4 },
  ]);

  assert.equal(readiness.ready, false);
  assert.deepEqual(new Set(readiness.blockers.map((blocker) => blocker.skillId)), new Set(["division", "fraction-equivalence"]));
  assert.match(readiness.reasonCodes.join(" "), /fraction-equivalence/);
});

test("backward traversal selects the lowest unresolved prerequisite", () => {
  const graph = new SkillGraph(skills, dependencies);
  const path = graph.traverseBackwardOnFailure("proportions", [
    { skillId: "number-sense", masteryProbability: 0.9 },
    { skillId: "division", masteryProbability: 0.45 },
    { skillId: "fraction-equivalence", masteryProbability: 0.3 },
  ]);

  assert.deepEqual(path, {
    targetSkillId: "proportions",
    blockerSkillId: "division",
    skillIds: ["division", "fraction-equivalence", "proportions"],
    reason: "LOWEST_UNRESOLVED_PREREQUISITE",
  });
});

test("supporting dependencies do not block readiness", () => {
  const graph = new SkillGraph(skills, dependencies);
  const readiness = graph.determineReadiness("percentages", [
    { skillId: "proportions", masteryProbability: 0 },
  ]);

  assert.equal(readiness.ready, true);
});

test("graph validation detects integrity failures and cycles", () => {
  const invalidGraph = new SkillGraph(skills, [
    ...dependencies,
    { prerequisiteSkillId: "proportions", dependentSkillId: "division", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
    { prerequisiteSkillId: "missing", dependentSkillId: "division", dependencyType: "REQUIRED", weight: 0, minimumMasteryRequired: 1.2 },
    dependencies[0],
  ]);
  const issueCodes = new Set(invalidGraph.validateIntegrity().map((issue) => issue.code));

  assert.equal(issueCodes.has("CIRCULAR_DEPENDENCY"), true);
  assert.equal(issueCodes.has("UNKNOWN_PREREQUISITE"), true);
  assert.equal(issueCodes.has("INVALID_WEIGHT"), true);
  assert.equal(issueCodes.has("INVALID_MASTERY_THRESHOLD"), true);
  assert.equal(issueCodes.has("DUPLICATE_DEPENDENCY"), true);
});
