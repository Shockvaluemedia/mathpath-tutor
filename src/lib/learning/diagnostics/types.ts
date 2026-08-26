export type DiagnosticDirection = "UP" | "DOWN" | "LATERAL" | "START";

export type DiagnosticStopReason =
  | "MAXIMUM_QUESTIONS_REACHED"
  | "MAXIMUM_DURATION_REACHED"
  | "SUFFICIENT_COVERAGE_AND_CERTAINTY"
  | "NO_ELIGIBLE_SKILLS";

export interface DiagnosticSkillCandidate {
  skillId: string;
  slug: string;
  name: string;
  gradeMin: number;
  gradeMax: number;
  difficulty: number;
  masteryProbability: number;
  uncertainty: number;
  evidenceCount: number;
  misconceptionProbability: number;
}

export interface DiagnosticResponseHistoryItem {
  questionId: string;
  skillId: string;
  isCorrect: boolean;
  difficulty: number;
  hintsUsed?: number;
  confidenceRating?: number;
  occurredAt?: Date;
}

export interface DiagnosticStoppingRules {
  minimumQuestions: number;
  maximumQuestions: number;
  maximumDurationMinutes: number;
  minimumCoveredSkills: number;
  maximumMeanUncertainty: number;
  maximumHighPriorityMisconception: number;
}

export interface DiagnosticStopDecision {
  shouldStop: boolean;
  reason: DiagnosticStopReason | null;
  questionCount: number;
  coveredSkillCount: number;
  meanUncertainty: number;
  estimatedProgress: number;
}

export interface DiagnosticCandidateScore {
  skillId: string;
  score: number;
  reasonCodes: string[];
}

export interface DiagnosticSelection {
  action: "ASK";
  selectedSkill: DiagnosticSkillCandidate;
  targetDifficulty: number;
  direction: DiagnosticDirection;
  reasonCodes: string[];
  candidateScores: DiagnosticCandidateScore[];
  stopDecision: DiagnosticStopDecision;
}

export interface DiagnosticStopSelection {
  action: "STOP";
  direction: "START" | "UP" | "DOWN" | "LATERAL";
  reasonCodes: string[];
  candidateScores: [];
  stopDecision: DiagnosticStopDecision;
}

export type DiagnosticNextAction = DiagnosticSelection | DiagnosticStopSelection;
