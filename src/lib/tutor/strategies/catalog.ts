import type { InstructionalStrategyDefinition } from "./types";

export const INSTRUCTIONAL_STRATEGIES: Record<string, InstructionalStrategyDefinition> = {
  SOCRATIC: { strategy: "SOCRATIC", purpose: "Elicit reasoning with one focused question.", tutorGuidance: "Ask one concise question that reveals the learner's next reasoning step.", cognitiveLoad: "MODERATE" },
  CONCRETE_EXAMPLE: { strategy: "CONCRETE_EXAMPLE", purpose: "Ground abstraction in a tangible situation.", tutorGuidance: "Use an age-respectful concrete example, then reconnect it to the math.", cognitiveLoad: "LOW" },
  VISUAL: { strategy: "VISUAL", purpose: "Represent the mathematical structure visually.", tutorGuidance: "Describe a clear visual model using text that can be rendered or imagined precisely.", cognitiveLoad: "LOW" },
  WORKED_EXAMPLE: { strategy: "WORKED_EXAMPLE", purpose: "Model a complete solution when direct modeling is pedagogically appropriate.", tutorGuidance: "Work one parallel example step by step and explain why each step is valid. Do not solve an active graded item.", cognitiveLoad: "LOW" },
  ANALOGY: { strategy: "ANALOGY", purpose: "Connect a new structure to a familiar one.", tutorGuidance: "Use one accurate analogy and explicitly name where the analogy stops applying.", cognitiveLoad: "MODERATE" },
  ERROR_ANALYSIS: { strategy: "ERROR_ANALYSIS", purpose: "Make an error pattern visible and correctable.", tutorGuidance: "Compare the learner's method with a valid method without shaming or punitive language.", cognitiveLoad: "MODERATE" },
  TEACH_BACK: { strategy: "TEACH_BACK", purpose: "Ask the learner to explain the idea in their own words.", tutorGuidance: "Request a brief explanation or example that demonstrates understanding.", cognitiveLoad: "MODERATE" },
  GUIDED_PRACTICE: { strategy: "GUIDED_PRACTICE", purpose: "Provide temporary scaffolding through a problem.", tutorGuidance: "Break the task into small steps and release one step at a time.", cognitiveLoad: "LOW" },
  INDEPENDENT_PRACTICE: { strategy: "INDEPENDENT_PRACTICE", purpose: "Collect independent performance evidence.", tutorGuidance: "Offer a parallel problem without hints unless the learner asks for support.", cognitiveLoad: "MODERATE" },
  CHALLENGE: { strategy: "CHALLENGE", purpose: "Extend a stable skill or test flexible use.", tutorGuidance: "Increase one dimension of difficulty while keeping prerequisites within reach.", cognitiveLoad: "HIGH" },
  REVIEW: { strategy: "REVIEW", purpose: "Retrieve previously learned material after time has passed.", tutorGuidance: "Use a short retrieval prompt without reteaching first.", cognitiveLoad: "MODERATE" },
  CONFIDENCE_RECOVERY: { strategy: "CONFIDENCE_RECOVERY", purpose: "Restore agency after frustration or repeated failure.", tutorGuidance: "Acknowledge the difficulty, reduce the step size, and create a reachable success without infantilizing the learner.", cognitiveLoad: "LOW" },
};
