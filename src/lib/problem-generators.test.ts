import assert from "node:assert/strict";
import test from "node:test";
import { generateProblem, publicProblemInstance, validateGeneratedProblem, type ProblemTemplateCode } from "./math/problem-generators";
import { areMathAnswersEquivalent } from "./math/validators";

const templates: Array<{ code: ProblemTemplateCode; name: string }> = [
  { code: "INTEGER_ADDITION", name: "Integer Addition" },
  { code: "INTEGER_SUBTRACTION", name: "Subtraction" },
  { code: "MULTIPLICATION_FACT", name: "Multiplication" },
  { code: "EXACT_DIVISION", name: "Division" },
  { code: "SAME_DENOMINATOR_FRACTION_ADDITION", name: "Fractions" },
  { code: "DECIMAL_ADDITION", name: "Decimals" },
  { code: "ONE_STEP_LINEAR_EQUATION", name: "Equations" },
];

test("the same template seed and constraints always produce the same problem", () => {
  const input = { targetSkillId: "equations", skillName: "Equations", difficulty: 4, seed: "fixed-seed" };
  assert.deepEqual(generateProblem(input), generateProblem(input));
});

test("generated problem families remain mathematically valid across many seeds", () => {
  for (const template of templates) {
    for (let index = 0; index < 100; index += 1) {
      const problem = generateProblem({
        targetSkillId: template.code.toLowerCase(),
        skillName: template.name,
        difficulty: (index % 5) + 1,
        seed: `${template.code}:${index}`,
        preferredTemplate: template.code,
      });
      assert.ok(problem, `${template.code} seed ${index}`);
      assert.equal(validateGeneratedProblem(problem!).valid, true, `${template.code} seed ${index}`);
      assert.ok(problem!.distractors.every((item) => !areMathAnswersEquivalent(item.value, problem!.correctAnswer).equivalent));
    }
  }
});

test("fraction templates emit targeted component-addition distractors", () => {
  const problem = generateProblem({ targetSkillId: "fractions", skillName: "Fractions", difficulty: 3, seed: "misconception" });
  assert.ok(problem?.distractors.some((item) => item.misconceptionCode === "FRACTION_COMPONENT_ADDITION"));
});

test("equation templates support negative ranges and either equation orientation", () => {
  const positions = new Set<string | number | boolean>();
  for (let index = 0; index < 30; index += 1) {
    const problem = generateProblem({ targetSkillId: "equations", skillName: "One-Step Equations", difficulty: 5, seed: `orientation:${index}` });
    positions.add(problem!.parameters.unknownPosition);
    assert.equal(problem!.constraints.allowNegative, true);
  }
  assert.deepEqual([...positions].sort(), ["left", "right"]);
});

test("unsupported skills fail closed instead of inventing an unverifiable answer", () => {
  assert.equal(generateProblem({ targetSkillId: "geometry", skillName: "Circle Theorems", difficulty: 4, seed: "unsupported" }), null);
});

test("public persisted problem projections never include answers or parameters", () => {
  const projected = publicProblemInstance({
    id: "instance-1",
    targetSkillId: "fractions",
    difficulty: 3,
    prompt: "What is 1/3 + 1/3?",
    answerType: "free-response",
    distractors: [{ value: "2/6", misconceptionCode: "FRACTION_COMPONENT_ADDITION" }],
    representationType: "symbolic",
  });

  assert.equal("correctAnswer" in projected, false);
  assert.equal("parameters" in projected, false);
});
