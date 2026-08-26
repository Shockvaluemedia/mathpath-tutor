import type { InstructionalStrategy } from "../strategies";
import type { TutorAction, TutorLearnerState, TutorTurnDecision } from "./types";
import { buildAgeAppropriateExperience } from "@/lib/learning/experience";

const FRUSTRATION_SIGNALS = [
  "i don't get", "i dont get", "i can't", "i cant", "give up", "too hard",
  "stupid", "hate math", "confused", "lost", "whatever", "idk",
];
const WORKED_EXAMPLE_REQUESTS = ["show me", "worked example", "walk me through", "demonstrate", "show an example"];
const HINT_REQUESTS = ["hint", "small clue", "help me start", "first step"];
const TEACH_BACK_REQUESTS = ["let me explain", "can i explain", "teach it back", "i'll explain", "i will explain"];

function containsAny(message: string, signals: string[]): boolean {
  const normalized = message.toLowerCase();
  return signals.some((signal) => normalized.includes(signal));
}

function decision(
  state: TutorLearnerState,
  action: TutorAction,
  strategy: InstructionalStrategy,
  reasonCodes: string[],
  allowWorkedExample = false
): TutorTurnDecision {
  const experience = buildAgeAppropriateExperience({
    developmentalStage: state.developmentalStage,
    learnerGrade: state.grade,
    skillGradeMax: state.targetSkill?.gradeMax,
    confidenceLevel: state.confidenceLevel,
    currentFrustration: state.currentFrustration,
  });
  return {
    action,
    strategy,
    targetSkillId: state.targetSkill?.skillId ?? null,
    prerequisiteSkillId: state.prerequisiteBlocker?.skillId ?? null,
    reasonCodes,
    allowWorkedExample,
    responseConstraints: {
      ...experience,
      useAgeRespectfulLanguage: true,
      doNotSolveActiveGradedItem: true,
    },
  };
}

export function selectTutorTurn(input: {
  message: string;
  state: TutorLearnerState;
}): TutorTurnDecision {
  const { message, state } = input;
  const messageShowsFrustration = containsAny(message, FRUSTRATION_SIGNALS);
  const failureCascade = state.activePatterns.some((pattern) => pattern.patternType === "FAILURE_CASCADE_RISK" && pattern.confidence >= 0.55);
  if (messageShowsFrustration || state.currentFrustration || failureCascade) {
    return decision(
      state,
      "TRIGGER_CONFIDENCE_RECOVERY",
      "CONFIDENCE_RECOVERY",
      [messageShowsFrustration ? "MESSAGE_FRUSTRATION_SIGNAL" : "RECENT_FRUSTRATION_STATE", ...(failureCascade ? ["FAILURE_CASCADE_PATTERN"] : []), "REDUCE_STEP_SIZE"]
    );
  }

  if (containsAny(message, WORKED_EXAMPLE_REQUESTS)) {
    return decision(state, "PROVIDE_WORKED_EXAMPLE", "WORKED_EXAMPLE", ["LEARNER_REQUESTED_MODELING", "WORKED_EXAMPLE_PEDAGOGICALLY_ALLOWED"], true);
  }
  if (containsAny(message, TEACH_BACK_REQUESTS)) {
    return decision(state, "ASK_TEACH_BACK", "TEACH_BACK", ["LEARNER_REQUESTED_EXPLANATION", "COLLECT_REASONING_EVIDENCE"]);
  }
  if (containsAny(message, HINT_REQUESTS)) {
    return decision(state, "GIVE_HINT", "GUIDED_PRACTICE", ["LEARNER_REQUESTED_HINT", "PRESERVE_LEARNER_REASONING"]);
  }

  const misconception = state.activeMisconceptions.find((candidate) => candidate.probability >= 0.55);
  if (misconception) {
    return decision(state, "OFFER_ERROR_ANALYSIS", "ERROR_ANALYSIS", ["ACTIVE_MISCONCEPTION", `MISCONCEPTION:${misconception.code}`]);
  }
  if (state.prerequisiteBlocker) {
    return decision(state, "MOVE_TO_PREREQUISITE", "CONCRETE_EXAMPLE", ["REQUIRED_PREREQUISITE_BELOW_THRESHOLD", `PREREQUISITE:${state.prerequisiteBlocker.slug}`]);
  }

  const recent = state.recentEvidence.slice(0, 3);
  const recentIndependentSuccesses = recent.filter((item) => item.outcome === "CORRECT" && item.hintsUsed === 0 && ["NONE", "INDEPENDENT"].includes(item.assistanceLevel)).length;
  if (recentIndependentSuccesses >= 2) {
    return decision(state, "INCREASE_CHALLENGE", "CHALLENGE", ["REPEATED_RECENT_INDEPENDENT_SUCCESS", "TEST_FLEXIBLE_USE"]);
  }

  const bestStrategy = state.successfulStrategies.find((candidate) => candidate.attempts >= 3 && candidate.averageOutcomeScore >= 0.75);
  if (bestStrategy && ["VISUAL", "CONCRETE_EXAMPLE", "ANALOGY", "GUIDED_PRACTICE"].includes(bestStrategy.strategy)) {
    return decision(state, "SWITCH_REPRESENTATION", bestStrategy.strategy as InstructionalStrategy, ["LEARNER_SPECIFIC_STRATEGY_EVIDENCE", `STRATEGY:${bestStrategy.strategy}`]);
  }

  const hintDependency = state.activePatterns.some((pattern) => pattern.patternType === "HINT_DEPENDENCY" && pattern.confidence >= 0.6);
  if (hintDependency) {
    return decision(state, "ASK_GUIDING_QUESTION", "SOCRATIC", ["HINT_DEPENDENCY_PATTERN", "FADE_SCAFFOLDING"]);
  }

  return decision(state, "ASK_GUIDING_QUESTION", "SOCRATIC", ["DEFAULT_INFORMATION_SEEKING_TURN"]);
}
