import type { TutorLearnerState } from "./orchestration";

export function buildMinimumTutorContext(state: TutorLearnerState) {
  return {
    grade: state.grade,
    developmentalStage: state.developmentalStage,
    confidenceLevel: state.confidenceLevel,
    currentFrustration: state.currentFrustration,
    targetSkill: state.targetSkill?.name ?? null,
    prerequisiteSkill: state.prerequisiteBlocker?.name ?? null,
    activePatterns: state.activePatterns.slice(0, 5).map(({ patternType, confidence, statement }) => ({ patternType, confidence, statement })),
    activeMisconceptions: state.activeMisconceptions.slice(0, 3).map(({ code, probability }) => ({ code, probability })),
  };
}
