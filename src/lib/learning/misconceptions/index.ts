export {
  applyMisconceptionEvidence,
  selectDiscriminatingFollowUp,
} from "./hypothesis-engine";
export { recordMisconceptionEvidence } from "./prisma-misconceptions";
export type {
  ActiveMisconceptionHypothesis,
  DiagnosticFollowUp,
  LearnerMisconceptionState,
  MathResponseObservation,
  MisconceptionDefinition,
  MisconceptionEvidenceDirection,
  MisconceptionEvidenceInput,
  MisconceptionEvidenceUpdate,
  MisconceptionLifecycleStatus,
  MisconceptionMatch,
  MisconceptionSignature,
  SelectedDiagnosticFollowUp,
} from "./types";
