export type SkillDependencyKind =
  | "REQUIRED"
  | "SUPPORTING"
  | "PARALLEL"
  | "EXTENSION";

export interface SkillGraphNode {
  id: string;
  slug: string;
  name: string;
  domainId: string;
}

export interface SkillDependencyEdge {
  prerequisiteSkillId: string;
  dependentSkillId: string;
  dependencyType: SkillDependencyKind;
  weight: number;
  minimumMasteryRequired: number;
}

export interface SkillMasteryEstimate {
  skillId: string;
  masteryProbability: number;
}

export type SkillGraphIssueCode =
  | "UNKNOWN_PREREQUISITE"
  | "UNKNOWN_DEPENDENT"
  | "SELF_DEPENDENCY"
  | "DUPLICATE_DEPENDENCY"
  | "INVALID_WEIGHT"
  | "INVALID_MASTERY_THRESHOLD"
  | "CIRCULAR_DEPENDENCY";

export interface SkillGraphIssue {
  code: SkillGraphIssueCode;
  message: string;
  skillIds: string[];
}

export interface SkillBlocker {
  skillId: string;
  requiredProbability: number;
  currentProbability: number;
  deficit: number;
  weight: number;
  pathToTarget: string[];
}

export interface SkillReadiness {
  targetSkillId: string;
  ready: boolean;
  blockers: SkillBlocker[];
  reasonCodes: string[];
}

export interface RemediationPath {
  targetSkillId: string;
  blockerSkillId: string;
  skillIds: string[];
  reason: "LOWEST_UNRESOLVED_PREREQUISITE" | "SHORTEST_UNRESOLVED_PATH";
}
