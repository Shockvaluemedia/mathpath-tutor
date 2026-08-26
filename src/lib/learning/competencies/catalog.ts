export const THINKING_COMPETENCIES = {
  PATTERN_RECOGNITION: { name: "Pattern recognition", description: "Notices mathematical regularities and useful structure." },
  ESTIMATION: { name: "Estimation", description: "Uses magnitude and approximation to judge plausible results." },
  ABSTRACTION: { name: "Abstraction", description: "Represents a situation with general mathematical structure." },
  DECOMPOSITION: { name: "Decomposition", description: "Breaks a complex problem into manageable mathematical parts." },
  MODELING: { name: "Modeling", description: "Connects a real situation to a valid mathematical model." },
  STRATEGY_SELECTION: { name: "Strategy selection", description: "Chooses an efficient and appropriate mathematical approach." },
  REASONING: { name: "Reasoning", description: "Uses connected mathematical claims to reach a conclusion." },
  PROOF_EXPLANATION: { name: "Proof and explanation", description: "Explains why a method or result is valid." },
  ERROR_CHECKING: { name: "Error checking", description: "Finds and evaluates errors or implausible results." },
  TRANSFER: { name: "Transfer", description: "Applies a known idea in a meaningfully different context." },
  REPRESENTATION_SWITCHING: { name: "Representation switching", description: "Moves between valid mathematical representations." },
} as const;

export type ThinkingCompetencyCode = keyof typeof THINKING_COMPETENCIES;
