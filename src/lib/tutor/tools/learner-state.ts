import { prisma } from "@/lib/db";
import { loadSkillGraph } from "@/lib/learning/graph";
import type {
  TutorLearnerState,
  TutorSkillSummary,
} from "../orchestration";

export async function getRecentEvidence(learnerId: string, limit = 12) {
  return prisma.learningEvidence.findMany({
    where: { learnerId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(50, Math.max(1, limit)),
    select: {
      skillId: true,
      outcome: true,
      assistanceLevel: true,
      hintsUsed: true,
      instructionalStrategy: true,
      occurredAt: true,
    },
  });
}

export async function getSkillState(learnerId: string, skillId: string) {
  return prisma.learnerSkillMastery.findUnique({
    where: { learnerId_skillId: { learnerId, skillId } },
    include: { skill: true },
  });
}

export async function getSkillPrerequisites(skillId: string) {
  return prisma.skillDependency.findMany({
    where: { dependentSkillId: skillId },
    include: { prerequisiteSkill: true },
    orderBy: [{ dependencyType: "asc" }, { weight: "desc" }],
  });
}

export async function getActiveMisconceptions(learnerId: string, skillId?: string) {
  return prisma.learnerMisconception.findMany({
    where: {
      learnerId,
      status: { in: ["SUSPECTED", "LIKELY", "CONFIRMED", "RESOLVING"] },
      misconception: { isActive: true, ...(skillId ? { skillId } : {}) },
    },
    include: { misconception: true },
    orderBy: [{ probability: "desc" }, { lastObservedAt: "desc" }],
  });
}

function toTutorSkill(state: {
  skillId: string;
  masteryProbability: number;
  uncertainty: number;
  status: string;
  skill: { slug: string; name: string; gradeMax?: number };
}): TutorSkillSummary {
  return {
    skillId: state.skillId,
    slug: state.skill.slug,
    name: state.skill.name,
    masteryProbability: state.masteryProbability,
    uncertainty: state.uncertainty,
    status: state.status,
    gradeMax: state.skill.gradeMax,
  };
}

export async function selectNextSkill(learnerId: string, preferredSkillId?: string) {
  if (preferredSkillId) {
    const preferred = await getSkillState(learnerId, preferredSkillId);
    if (preferred) return preferred;
  }
  return prisma.learnerSkillMastery.findFirst({
    where: {
      learnerId,
      status: { in: ["EMERGING", "DEVELOPING", "PRACTICING", "NOT_STARTED"] },
    },
    include: { skill: true },
    orderBy: [{ uncertainty: "desc" }, { masteryProbability: "asc" }],
  });
}

export async function getLearnerState(input: {
  learnerId: string;
  moduleId?: string;
  sessionId?: string;
}): Promise<TutorLearnerState | null> {
  const learner = await prisma.learner.findUnique({
    where: { id: input.learnerId },
    include: { profile: true },
  });
  if (!learner) return null;

  const learningModule = input.moduleId
    ? await prisma.learningModule.findFirst({
        where: { id: input.moduleId, learnerId: input.learnerId },
        select: { skillId: true },
      })
    : null;
  const targetState = await selectNextSkill(input.learnerId, learningModule?.skillId);
  const [mastery, patterns, misconceptions, strategies, recentEvidence, interventions, currentSession, graph] = await Promise.all([
    prisma.learnerSkillMastery.findMany({
      where: { learnerId: input.learnerId },
      include: { skill: { select: { slug: true, name: true, gradeMax: true } } },
    }),
    prisma.learnerPattern.findMany({
      where: { learnerId: input.learnerId, status: "ACTIVE" },
      orderBy: { confidence: "desc" },
      take: 12,
    }),
    getActiveMisconceptions(input.learnerId, targetState?.skillId),
    prisma.instructionalStrategyPerformance.findMany({
      where: { learnerId: input.learnerId, ...(targetState ? { skillId: targetState.skillId } : {}) },
      orderBy: [{ averageOutcomeScore: "desc" }, { attempts: "desc" }],
      take: 8,
    }),
    getRecentEvidence(input.learnerId),
    prisma.intervention.findMany({
      where: { learnerId: input.learnerId, status: "active" },
      select: { type: true },
    }),
    input.sessionId
      ? prisma.tutoringSession.findFirst({
          where: { id: input.sessionId, learnerId: input.learnerId },
          select: { frustrationDetected: true },
        })
      : null,
    loadSkillGraph(),
  ]);

  const targetSkill = targetState ? toTutorSkill(targetState) : null;
  const masteryEstimates = mastery.map((state) => ({
    skillId: state.skillId,
    masteryProbability: state.masteryProbability,
  }));
  const remediation = targetState
    ? graph.findLowestUnresolvedPrerequisite(targetState.skillId, masteryEstimates)
    : null;
  const blockerState = remediation
    ? mastery.find((state) => state.skillId === remediation.blockerSkillId)
    : null;
  const blockerNode = remediation ? graph.getSkill(remediation.blockerSkillId) : null;

  return {
    learnerId: learner.id,
    developmentalStage: learner.developmentalStage,
    grade: learner.grade,
    confidenceLevel: learner.profile?.confidenceLevel ?? 5,
    currentFrustration: currentSession?.frustrationDetected ?? false,
    targetSkill,
    prerequisiteBlocker: blockerState
      ? toTutorSkill(blockerState)
      : blockerNode
        ? {
            skillId: blockerNode.id,
            slug: blockerNode.slug,
            name: blockerNode.name,
            masteryProbability: 0,
            uncertainty: 1,
            status: "NOT_STARTED",
          }
        : null,
    activePatterns: patterns.map((pattern) => ({
      patternType: pattern.patternType,
      scopeKey: pattern.scopeKey,
      statement: pattern.statement,
      confidence: pattern.confidence,
    })),
    activeMisconceptions: misconceptions.map((state) => ({
      code: state.misconception.code,
      name: state.misconception.name,
      probability: state.probability,
      status: state.status,
    })),
    successfulStrategies: strategies.map((strategy) => ({
      strategy: strategy.strategy,
      attempts: strategy.attempts,
      averageOutcomeScore: strategy.averageOutcomeScore,
    })),
    recentEvidence: recentEvidence.map((record) => ({
      skillId: record.skillId,
      outcome: record.outcome,
      assistanceLevel: record.assistanceLevel,
      hintsUsed: record.hintsUsed,
      instructionalStrategy: record.instructionalStrategy,
      occurredAt: record.occurredAt.toISOString(),
    })),
    activeInterventionTypes: interventions.map((intervention) => intervention.type),
  };
}
