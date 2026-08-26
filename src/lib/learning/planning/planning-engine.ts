import type { DailyLearningPlan, DailyPlanningInput, LearningPathItem } from "./types";

export function buildDailyLearningPath(input: DailyPlanningInput): DailyLearningPlan {
  const items: LearningPathItem[] = [];
  const constrainedSession = input.learningPace === "slow" || input.recentWorkloadCount >= 3 || input.currentFrustration || input.confidenceLevel <= 3 || input.failureCascadeRisk;
  const maxItems = constrainedSession ? 3 : 5;
  const add = (item: LearningPathItem) => {
    if (!items.some((existing) => existing.type === item.type && existing.skillId === item.skillId)) items.push(item);
  };

  if (input.currentFrustration || input.confidenceLevel <= 3 || input.failureCascadeRisk) {
    add({
      type: "CONFIDENCE_RECOVERY", skillId: input.prerequisiteBlocker?.skillId ?? input.targetSkill?.skillId ?? null,
      skillName: input.prerequisiteBlocker?.name ?? input.targetSkill?.name ?? "Math confidence", priority: 100, estimatedMinutes: 5,
      reasonCodes: [input.currentFrustration ? "RECENT_FRUSTRATION" : "CONFIDENCE_OR_FAILURE_RISK", "REDUCE_COGNITIVE_LOAD"],
      learnerExplanation: "We will start with one manageable win and build from there.",
      adultExplanation: "MathPath reduced the step size because recent evidence suggests confidence recovery should come first.",
    });
  }

  for (const review of input.dueReviews.slice(0, constrainedSession ? 1 : 2)) {
    add({
      type: "SCHEDULED_REVIEW", skillId: review.skillId, skillName: review.name, priority: 90, estimatedMinutes: 5,
      reasonCodes: ["RETENTION_CHECK_DUE"],
      learnerExplanation: `${review.name} is ready for a quick memory check.`,
      adultExplanation: `${review.name} is due for delayed retrieval based on its persisted review schedule.`,
    });
  }

  if (input.activeMisconception) {
    add({
      type: "MISCONCEPTION_CORRECTION", skillId: input.activeMisconception.skillId, skillName: input.activeMisconception.name, priority: 85, estimatedMinutes: 7,
      reasonCodes: ["ACTIVE_MISCONCEPTION_HYPOTHESIS", `MISCONCEPTION:${input.activeMisconception.code}`],
      learnerExplanation: "We will compare two approaches and figure out which one always works.",
      adultExplanation: `A ${Math.round(input.activeMisconception.probability * 100)}% misconception hypothesis needs a discriminating check, not a permanent label.`,
    });
  }

  if (input.prerequisiteBlocker) {
    add({
      type: "REMEDIATION", skillId: input.prerequisiteBlocker.skillId, skillName: input.prerequisiteBlocker.name, priority: 80, estimatedMinutes: 10,
      reasonCodes: ["BLOCKS_CURRENT_TARGET", "LOWEST_UNRESOLVED_PREREQUISITE"],
      learnerExplanation: `${input.prerequisiteBlocker.name} is the next useful step toward your current goal.`,
      adultExplanation: `${input.prerequisiteBlocker.name} is the lowest unresolved required prerequisite for the current target.`,
    });
  } else if (input.targetSkill && input.targetSkill.masteryProbability >= 0.5 && input.targetSkill.fluencyScore < 0.65) {
    add({
      type: "FLUENCY_PRACTICE", skillId: input.targetSkill.skillId, skillName: input.targetSkill.name, priority: 70, estimatedMinutes: 8,
      reasonCodes: ["CONCEPT_EVIDENCE_EXCEEDS_FLUENCY"],
      learnerExplanation: `You understand the idea in ${input.targetSkill.name}; now we will make it feel smoother.`,
      adultExplanation: "Conceptual performance is ahead of efficient independent execution.",
    });
  }

  if (input.targetSkill && input.targetSkill.masteryProbability >= 0.55 && input.targetSkill.transferAttempts < 2) {
    add({
      type: "TRANSFER_CHALLENGE", skillId: input.targetSkill.skillId, skillName: input.targetSkill.name, priority: 60, estimatedMinutes: 6,
      reasonCodes: ["TRANSFER_NOT_YET_VERIFIED"],
      learnerExplanation: `You will try ${input.targetSkill.name} in a new kind of problem.`,
      adultExplanation: "Routine evidence is present, but flexible use in a changed context is not yet verified.",
    });
  }

  if (input.targetSkill && !input.prerequisiteBlocker && input.targetSkill.masteryProbability < 0.85) {
    add({
      type: "NEW_LEARNING", skillId: input.targetSkill.skillId, skillName: input.targetSkill.name, priority: 50, estimatedMinutes: 12,
      reasonCodes: ["PREREQUISITES_READY", "TARGET_HAS_LEARNING_VALUE"],
      learnerExplanation: `${input.targetSkill.name} is ready for the next idea.`,
      adultExplanation: "Required prerequisites are ready and the target still has meaningful uncertainty.",
    });
  }

  const selected = items.sort((left, right) => right.priority - left.priority).slice(0, maxItems);
  return {
    learnerId: input.learnerId,
    items: selected,
    estimatedMinutes: selected.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    reasonCodes: [constrainedSession ? "WORKLOAD_OR_PACE_CONSTRAINED" : "STANDARD_SESSION_CAPACITY", ...(input.activeInterventionTypes.length ? ["ACTIVE_INTERVENTION_CONSIDERED"] : [])],
    modelVersion: "daily-path-v1",
  };
}

export function buildLinearLearningPath(input: DailyPlanningInput): DailyLearningPlan {
  const skill = input.targetSkill ?? input.prerequisiteBlocker;
  const items: LearningPathItem[] = skill ? [{
    type: "NEW_LEARNING",
    skillId: skill.skillId,
    skillName: skill.name,
    priority: 50,
    estimatedMinutes: 15,
    reasonCodes: ["LINEAR_CONTROL_PATH", "NEXT_GRADE_SEQUENCE_SKILL"],
    learnerExplanation: `${skill.name} is next in your lesson sequence.`,
    adultExplanation: "This control path follows the next sequenced skill without adaptive reprioritization.",
  }] : [];
  return {
    learnerId: input.learnerId,
    items,
    estimatedMinutes: items.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    reasonCodes: ["LINEAR_CONTROL_VARIANT"],
    modelVersion: "linear-path-v1",
  };
}
