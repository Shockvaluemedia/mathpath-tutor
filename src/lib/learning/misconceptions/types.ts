export type MisconceptionLifecycleStatus =
  | "SUSPECTED"
  | "LIKELY"
  | "CONFIRMED"
  | "RESOLVING"
  | "RESOLVED";

export type MisconceptionEvidenceDirection = "SUPPORTS" | "CONTRADICTS";

export interface MisconceptionSignature {
  type: string;
  [key: string]: unknown;
}

export interface MisconceptionDefinition {
  id?: string;
  skillId?: string;
  skillSlug: string;
  code: string;
  name: string;
  description: string;
  signature: MisconceptionSignature;
  severity: number;
  remediationStrategy: Record<string, unknown>;
  diagnosticStrategy: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface MathResponseObservation {
  skillId?: string;
  skillSlug: string;
  question: string;
  learnerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  structured?: Record<string, unknown>;
}

export interface MisconceptionMatch {
  code: string;
  confidence: number;
  reasonCode: string;
  evidence: {
    observedAnswer: string;
    expectedAnswer: string;
    signatureType: string;
  };
}

export interface LearnerMisconceptionState {
  probability: number;
  status: MisconceptionLifecycleStatus;
  evidenceCount: number;
  contradictingEvidenceCount: number;
}

export interface MisconceptionEvidenceInput {
  direction: MisconceptionEvidenceDirection;
  weight?: number;
}

export interface MisconceptionEvidenceUpdate extends LearnerMisconceptionState {
  probabilityDelta: number;
  resolved: boolean;
  reasonCode: string;
}

export interface DiagnosticFollowUp {
  id: string;
  skillSlug: string;
  question: string;
  hypothesisCodes: string[];
  metadata?: Record<string, unknown>;
}

export interface ActiveMisconceptionHypothesis {
  code: string;
  probability: number;
  status: MisconceptionLifecycleStatus;
}

export interface SelectedDiagnosticFollowUp {
  question: DiagnosticFollowUp;
  informationScore: number;
  reasonCode: "DISTINGUISH_COMPETING_MISCONCEPTIONS";
}
