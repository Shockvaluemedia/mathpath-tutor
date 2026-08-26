import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLearnerState } from "@/lib/tutor/tools";
import { buildDailyLearningPath, buildLinearLearningPath } from "./planning-engine";
import type { DailyPlanningInput, PlanningSkillState } from "./types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function planningSkill(state: {
  skillId: string; status: string; masteryProbability: number; uncertainty: number;
  fluencyScore: number; transferAttempts: number; skill: { slug: string; name: string };
}): PlanningSkillState {
  return { skillId: state.skillId, slug: state.skill.slug, name: state.skill.name, status: state.status, masteryProbability: state.masteryProbability, uncertainty: state.uncertainty, fluencyScore: state.fluencyScore, transferAttempts: state.transferAttempts };
}

export async function buildAndPersistDailyLearningPath(learnerId: string, now = new Date()) {
  const [learnerState, learner, mastery, dueSchedules, misconception, recentModules, recentSessions, experiment] = await Promise.all([
    getLearnerState({ learnerId }),
    prisma.learner.findUnique({ where: { id: learnerId }, include: { profile: true } }),
    prisma.learnerSkillMastery.findMany({ where: { learnerId }, include: { skill: true } }),
    prisma.skillReviewSchedule.findMany({
      where: { learnerId, status: { not: "PAUSED" }, nextReviewAt: { lte: new Date(now.getTime() + 86_400_000) } },
      include: { skill: true }, orderBy: { nextReviewAt: "asc" }, take: 3,
    }),
    prisma.learnerMisconception.findFirst({
      where: { learnerId, status: { in: ["LIKELY", "CONFIRMED", "RESOLVING"] }, misconception: { isActive: true } },
      include: { misconception: true }, orderBy: { probability: "desc" },
    }),
    prisma.learningModule.count({ where: { learnerId, createdAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    prisma.tutoringSession.count({ where: { learnerId, createdAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    prisma.learningExperimentAssignment.findUnique({ where: { learnerId_experimentKey: { learnerId, experimentKey: "daily-path-v1" } }, select: { variant: true } }),
  ]);
  if (!learnerState || !learner) return null;
  const masteryBySkill = new Map(mastery.map((state) => [state.skillId, state]));
  const target = learnerState.targetSkill ? masteryBySkill.get(learnerState.targetSkill.skillId) : null;
  const blocker = learnerState.prerequisiteBlocker ? masteryBySkill.get(learnerState.prerequisiteBlocker.skillId) : null;
  const input: DailyPlanningInput = {
    learnerId,
    confidenceLevel: learnerState.confidenceLevel,
    learningPace: learner.profile?.learningPace ?? "moderate",
    recentWorkloadCount: recentModules + recentSessions,
    currentFrustration: learnerState.currentFrustration,
    targetSkill: target ? planningSkill(target) : null,
    prerequisiteBlocker: blocker ? planningSkill(blocker) : learnerState.prerequisiteBlocker ? {
      ...learnerState.prerequisiteBlocker, fluencyScore: 0, transferAttempts: 0,
    } : null,
    dueReviews: dueSchedules.flatMap((schedule) => {
      const state = masteryBySkill.get(schedule.skillId);
      return state ? [planningSkill(state)] : [];
    }),
    activeMisconception: misconception ? {
      code: misconception.misconception.code,
      name: misconception.misconception.name,
      skillId: misconception.misconception.skillId,
      probability: misconception.probability,
    } : null,
    failureCascadeRisk: learnerState.activePatterns.some((pattern) => pattern.patternType === "FAILURE_CASCADE_RISK" && pattern.confidence >= 0.55),
    activeInterventionTypes: learnerState.activeInterventionTypes,
  };
  const plan = experiment?.variant === "LINEAR" ? buildLinearLearningPath(input) : buildDailyLearningPath(input);
  const dateKey = now.toISOString().slice(0, 10);
  await prisma.dailyLearningPath.upsert({
    where: { learnerId_dateKey: { learnerId, dateKey } },
    create: { learnerId, dateKey, items: toJson(plan.items), inputs: toJson({ ...input, learnerId: undefined }), modelVersion: plan.modelVersion },
    update: { items: toJson(plan.items), inputs: toJson({ ...input, learnerId: undefined }), modelVersion: plan.modelVersion },
  });
  return plan;
}

export function buildDemoDailyLearningPath(learnerId: string) {
  const isMaya = learnerId === "demo-student-2";
  return buildDailyLearningPath({
    learnerId,
    confidenceLevel: isMaya ? 4 : 6,
    learningPace: isMaya ? "slow" : "moderate",
    recentWorkloadCount: 1,
    currentFrustration: false,
    targetSkill: isMaya
      ? { skillId: "equations", slug: "two-step-equations", name: "Two-Step Equations", status: "PRACTICING", masteryProbability: 0.61, uncertainty: 0.39, fluencyScore: 0.48, transferAttempts: 1 }
      : { skillId: "fractions", slug: "adding-fractions", name: "Adding Fractions", status: "DEVELOPING", masteryProbability: 0.42, uncertainty: 0.58, fluencyScore: 0.3, transferAttempts: 0 },
    prerequisiteBlocker: isMaya
      ? { skillId: "integers", slug: "integer-operations", name: "Integer Operations", status: "DEVELOPING", masteryProbability: 0.58, uncertainty: 0.42, fluencyScore: 0.4, transferAttempts: 1 }
      : { skillId: "equivalence", slug: "fraction-equivalence", name: "Fraction Equivalence", status: "DEVELOPING", masteryProbability: 0.42, uncertainty: 0.58, fluencyScore: 0.35, transferAttempts: 0 },
    dueReviews: isMaya ? [] : [{ skillId: "division", slug: "division", name: "Division", status: "DEVELOPING", masteryProbability: 0.55, uncertainty: 0.45, fluencyScore: 0.5, transferAttempts: 0 }],
    activeMisconception: isMaya ? null : { code: "FRACTION_COMPONENT_ADDITION", name: "Compare fraction addition methods", skillId: "fractions", probability: 0.68 },
    failureCascadeRisk: false,
    activeInterventionTypes: [],
  });
}
