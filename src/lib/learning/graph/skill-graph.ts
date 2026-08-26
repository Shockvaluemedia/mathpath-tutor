import type {
  RemediationPath,
  SkillBlocker,
  SkillDependencyEdge,
  SkillDependencyKind,
  SkillGraphIssue,
  SkillGraphNode,
  SkillMasteryEstimate,
  SkillReadiness,
} from "./types";

const READINESS_DEPENDENCY_TYPES = new Set<SkillDependencyKind>(["REQUIRED"]);

function edgeKey(edge: SkillDependencyEdge): string {
  return `${edge.prerequisiteSkillId}->${edge.dependentSkillId}`;
}

function clampProbability(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value ?? 0));
}

export class SkillGraph {
  private readonly nodes: Map<string, SkillGraphNode>;
  private readonly prerequisiteEdges: Map<string, SkillDependencyEdge[]>;
  private readonly dependentEdges: Map<string, SkillDependencyEdge[]>;

  constructor(
    readonly skills: SkillGraphNode[],
    readonly dependencies: SkillDependencyEdge[]
  ) {
    this.nodes = new Map(skills.map((skill) => [skill.id, skill]));
    this.prerequisiteEdges = new Map();
    this.dependentEdges = new Map();

    for (const edge of dependencies) {
      const prerequisites = this.prerequisiteEdges.get(edge.dependentSkillId) ?? [];
      prerequisites.push(edge);
      this.prerequisiteEdges.set(edge.dependentSkillId, prerequisites);

      const dependents = this.dependentEdges.get(edge.prerequisiteSkillId) ?? [];
      dependents.push(edge);
      this.dependentEdges.set(edge.prerequisiteSkillId, dependents);
    }
  }

  getSkill(skillId: string): SkillGraphNode | undefined {
    return this.nodes.get(skillId);
  }

  getDirectPrerequisites(
    skillId: string,
    dependencyTypes?: SkillDependencyKind[]
  ): SkillGraphNode[] {
    const allowed = dependencyTypes ? new Set(dependencyTypes) : null;
    return (this.prerequisiteEdges.get(skillId) ?? [])
      .filter((edge) => !allowed || allowed.has(edge.dependencyType))
      .map((edge) => this.nodes.get(edge.prerequisiteSkillId))
      .filter((skill): skill is SkillGraphNode => Boolean(skill));
  }

  getAncestorPrerequisites(
    skillId: string,
    dependencyTypes?: SkillDependencyKind[]
  ): SkillGraphNode[] {
    const allowed = dependencyTypes ? new Set(dependencyTypes) : null;
    const visited = new Set<string>();
    const ancestors: SkillGraphNode[] = [];

    const visit = (dependentSkillId: string) => {
      for (const edge of this.prerequisiteEdges.get(dependentSkillId) ?? []) {
        if (allowed && !allowed.has(edge.dependencyType)) continue;
        if (visited.has(edge.prerequisiteSkillId)) continue;
        visited.add(edge.prerequisiteSkillId);
        const skill = this.nodes.get(edge.prerequisiteSkillId);
        if (skill) ancestors.push(skill);
        visit(edge.prerequisiteSkillId);
      }
    };

    visit(skillId);
    return ancestors;
  }

  getDependentSkills(
    skillId: string,
    dependencyTypes?: SkillDependencyKind[]
  ): SkillGraphNode[] {
    const allowed = dependencyTypes ? new Set(dependencyTypes) : null;
    return (this.dependentEdges.get(skillId) ?? [])
      .filter((edge) => !allowed || allowed.has(edge.dependencyType))
      .map((edge) => this.nodes.get(edge.dependentSkillId))
      .filter((skill): skill is SkillGraphNode => Boolean(skill));
  }

  determineReadiness(
    targetSkillId: string,
    mastery: SkillMasteryEstimate[]
  ): SkillReadiness {
    const masteryBySkill = new Map(
      mastery.map((state) => [state.skillId, clampProbability(state.masteryProbability)])
    );
    const blockers = this.collectBlockers(targetSkillId, masteryBySkill);

    return {
      targetSkillId,
      ready: blockers.length === 0,
      blockers,
      reasonCodes: blockers.length === 0
        ? ["REQUIRED_PREREQUISITES_READY"]
        : blockers.map((blocker) => `PREREQUISITE_BELOW_THRESHOLD:${blocker.skillId}`),
    };
  }

  findLowestUnresolvedPrerequisite(
    targetSkillId: string,
    mastery: SkillMasteryEstimate[]
  ): RemediationPath | null {
    const masteryBySkill = new Map(
      mastery.map((state) => [state.skillId, clampProbability(state.masteryProbability)])
    );
    const blockers = this.collectBlockers(targetSkillId, masteryBySkill);
    if (blockers.length === 0) return null;

    const unresolvedIds = new Set(blockers.map((blocker) => blocker.skillId));
    const foundational = blockers.filter((blocker) =>
      !(this.prerequisiteEdges.get(blocker.skillId) ?? []).some(
        (edge) =>
          READINESS_DEPENDENCY_TYPES.has(edge.dependencyType) &&
          unresolvedIds.has(edge.prerequisiteSkillId)
      )
    );
    const selected = [...(foundational.length > 0 ? foundational : blockers)].sort(
      (left, right) =>
        right.pathToTarget.length - left.pathToTarget.length ||
        right.deficit * right.weight - left.deficit * left.weight ||
        left.skillId.localeCompare(right.skillId)
    )[0];

    return {
      targetSkillId,
      blockerSkillId: selected.skillId,
      skillIds: selected.pathToTarget,
      reason: "LOWEST_UNRESOLVED_PREREQUISITE",
    };
  }

  findShortestRemediationPath(
    targetSkillId: string,
    mastery: SkillMasteryEstimate[]
  ): RemediationPath | null {
    const masteryBySkill = new Map(
      mastery.map((state) => [state.skillId, clampProbability(state.masteryProbability)])
    );
    const blockers = this.collectBlockers(targetSkillId, masteryBySkill);
    if (blockers.length === 0) return null;

    const selected = [...blockers].sort(
      (left, right) =>
        left.pathToTarget.length - right.pathToTarget.length ||
        right.deficit * right.weight - left.deficit * left.weight ||
        left.skillId.localeCompare(right.skillId)
    )[0];

    return {
      targetSkillId,
      blockerSkillId: selected.skillId,
      skillIds: selected.pathToTarget,
      reason: "SHORTEST_UNRESOLVED_PATH",
    };
  }

  traverseBackwardOnFailure(
    targetSkillId: string,
    mastery: SkillMasteryEstimate[]
  ): RemediationPath | null {
    return this.findLowestUnresolvedPrerequisite(targetSkillId, mastery);
  }

  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];
    const cycleKeys = new Set<string>();

    const visit = (skillId: string) => {
      if (visited.has(skillId)) return;
      visiting.add(skillId);
      stack.push(skillId);

      for (const edge of this.dependentEdges.get(skillId) ?? []) {
        const nextId = edge.dependentSkillId;
        if (visiting.has(nextId)) {
          const start = stack.indexOf(nextId);
          const cycle = [...stack.slice(start), nextId];
          const key = [...new Set(cycle)].sort().join("|");
          if (!cycleKeys.has(key)) {
            cycleKeys.add(key);
            cycles.push(cycle);
          }
          continue;
        }
        visit(nextId);
      }

      stack.pop();
      visiting.delete(skillId);
      visited.add(skillId);
    };

    for (const skillId of this.nodes.keys()) visit(skillId);
    return cycles;
  }

  validateIntegrity(): SkillGraphIssue[] {
    const issues: SkillGraphIssue[] = [];
    const seenEdges = new Set<string>();

    for (const edge of this.dependencies) {
      if (!this.nodes.has(edge.prerequisiteSkillId)) {
        issues.push({
          code: "UNKNOWN_PREREQUISITE",
          message: `Unknown prerequisite skill ${edge.prerequisiteSkillId}`,
          skillIds: [edge.prerequisiteSkillId, edge.dependentSkillId],
        });
      }
      if (!this.nodes.has(edge.dependentSkillId)) {
        issues.push({
          code: "UNKNOWN_DEPENDENT",
          message: `Unknown dependent skill ${edge.dependentSkillId}`,
          skillIds: [edge.prerequisiteSkillId, edge.dependentSkillId],
        });
      }
      if (edge.prerequisiteSkillId === edge.dependentSkillId) {
        issues.push({
          code: "SELF_DEPENDENCY",
          message: `Skill ${edge.dependentSkillId} cannot depend on itself`,
          skillIds: [edge.dependentSkillId],
        });
      }
      const key = edgeKey(edge);
      if (seenEdges.has(key)) {
        issues.push({
          code: "DUPLICATE_DEPENDENCY",
          message: `Duplicate dependency ${key}`,
          skillIds: [edge.prerequisiteSkillId, edge.dependentSkillId],
        });
      }
      seenEdges.add(key);
      if (!Number.isFinite(edge.weight) || edge.weight <= 0) {
        issues.push({
          code: "INVALID_WEIGHT",
          message: `Dependency ${key} must have a positive weight`,
          skillIds: [edge.prerequisiteSkillId, edge.dependentSkillId],
        });
      }
      if (
        !Number.isFinite(edge.minimumMasteryRequired) ||
        edge.minimumMasteryRequired < 0 ||
        edge.minimumMasteryRequired > 1
      ) {
        issues.push({
          code: "INVALID_MASTERY_THRESHOLD",
          message: `Dependency ${key} must use a mastery threshold from 0 to 1`,
          skillIds: [edge.prerequisiteSkillId, edge.dependentSkillId],
        });
      }
    }

    for (const cycle of this.detectCircularDependencies()) {
      issues.push({
        code: "CIRCULAR_DEPENDENCY",
        message: `Circular dependency detected: ${cycle.join(" -> ")}`,
        skillIds: cycle,
      });
    }

    return issues;
  }

  private collectBlockers(
    targetSkillId: string,
    masteryBySkill: Map<string, number>
  ): SkillBlocker[] {
    const blockers = new Map<string, SkillBlocker>();
    const queue: { skillId: string; pathToTarget: string[] }[] = [
      { skillId: targetSkillId, pathToTarget: [targetSkillId] },
    ];
    const bestDepth = new Map<string, number>([[targetSkillId, 0]]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      for (const edge of this.prerequisiteEdges.get(current.skillId) ?? []) {
        if (!READINESS_DEPENDENCY_TYPES.has(edge.dependencyType)) continue;
        if (current.pathToTarget.includes(edge.prerequisiteSkillId)) continue;
        const pathToTarget = [edge.prerequisiteSkillId, ...current.pathToTarget];
        const currentProbability = masteryBySkill.get(edge.prerequisiteSkillId) ?? 0;

        if (currentProbability < edge.minimumMasteryRequired) {
          const candidate: SkillBlocker = {
            skillId: edge.prerequisiteSkillId,
            requiredProbability: edge.minimumMasteryRequired,
            currentProbability,
            deficit: edge.minimumMasteryRequired - currentProbability,
            weight: edge.weight,
            pathToTarget,
          };
          const existing = blockers.get(candidate.skillId);
          if (!existing || candidate.pathToTarget.length > existing.pathToTarget.length) {
            blockers.set(candidate.skillId, candidate);
          }
        }

        const depth = pathToTarget.length - 1;
        if (depth > (bestDepth.get(edge.prerequisiteSkillId) ?? -1)) {
          bestDepth.set(edge.prerequisiteSkillId, depth);
          queue.push({ skillId: edge.prerequisiteSkillId, pathToTarget });
        }
      }
    }

    return [...blockers.values()].sort(
      (left, right) =>
        right.deficit * right.weight - left.deficit * left.weight ||
        left.skillId.localeCompare(right.skillId)
    );
  }
}
