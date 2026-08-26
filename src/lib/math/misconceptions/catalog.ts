import type { MisconceptionDefinition } from "@/lib/learning/misconceptions/types";

export const MATH_MISCONCEPTION_CATALOG: MisconceptionDefinition[] = [
  {
    skillSlug: "fraction-addition-unlike-denominators",
    code: "FRACTION_INDEPENDENT_COMPONENT_ADDITION",
    name: "Adds fraction components independently",
    description: "Adds both numerators and denominators instead of creating equivalent fractions with a common denominator.",
    signature: { type: "FRACTION_COMPONENT_ADDITION" },
    severity: 4,
    remediationStrategy: {
      preferredStrategies: ["VISUAL", "CONCRETE_EXAMPLE", "ERROR_ANALYSIS"],
      focusSkillSlug: "fraction-equivalence",
    },
    diagnosticStrategy: {
      followUpKinds: ["same-denominator-addition", "fraction-equivalence", "unlike-denominator-addition"],
    },
  },
  {
    skillSlug: "distributive-property",
    code: "PARTIAL_DISTRIBUTION",
    name: "Distributes to only one term",
    description: "Multiplies the outside factor by the variable term but leaves the constant term unchanged.",
    signature: { type: "PARTIAL_DISTRIBUTION" },
    severity: 4,
    remediationStrategy: {
      preferredStrategies: ["VISUAL", "WORKED_EXAMPLE", "TEACH_BACK"],
      representation: "area-model",
    },
    diagnosticStrategy: {
      followUpKinds: ["numeric-distribution", "area-model", "symbolic-distribution"],
    },
  },
  {
    skillSlug: "integer-operations",
    code: "NEGATIVE_SIGN_AS_OPERATION_CONFUSION",
    name: "Confuses a negative sign with subtraction",
    description: "Treats the sign attached to a number as if it were only the subtraction operation between terms.",
    signature: { type: "NEGATIVE_SIGN_OPERATION_CONFUSION" },
    severity: 4,
    remediationStrategy: {
      preferredStrategies: ["CONCRETE_EXAMPLE", "VISUAL", "GUIDED_PRACTICE"],
      representation: "number-line",
    },
    diagnosticStrategy: {
      followUpKinds: ["identify-signed-number", "subtract-negative", "compare-negative-values"],
    },
  },
  {
    skillSlug: "equality",
    code: "EQUAL_SIGN_MEANS_NEXT_STEP",
    name: "Treats the equal sign as a next-step signal",
    description: "Interprets equality as an instruction to calculate the left side rather than a relationship between two equivalent quantities.",
    signature: { type: "EQUALITY_NEXT_STEP" },
    severity: 5,
    remediationStrategy: {
      preferredStrategies: ["CONCRETE_EXAMPLE", "ERROR_ANALYSIS", "TEACH_BACK"],
      representation: "balance-scale",
    },
    diagnosticStrategy: {
      followUpKinds: ["missing-value-equality", "true-false-equation", "equivalent-expressions"],
    },
  },
];
