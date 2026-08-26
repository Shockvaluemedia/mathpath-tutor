export { computeMasteryState, DEFAULT_MASTERY_CONFIG } from "./mastery-engine";
export { calculateMisconceptionPenalty } from "./misconception-penalty";
export { recordLearningEvidenceBatchAndUpdateMastery } from "./prisma-mastery";
export type {
  ComputedMasteryState,
  EvidenceAssistanceLevel,
  EvidenceMasteryStatus,
  EvidenceOutcome,
  EvidenceType,
  LearningEvidenceRecord,
  MasteryComputationConfig,
  MasteryComputationContext,
} from "./types";
export type {
  MasteryMisconceptionSignal,
} from "./misconception-penalty";
export type {
  PersistedMasteryProjection,
  RecordLearningEvidenceResult,
} from "./prisma-mastery";
