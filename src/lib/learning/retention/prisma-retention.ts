import { Prisma, type LearnerSkillMastery } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createReviewSchedule, reviewScheduleStatus, updateReviewSchedule } from "./retention-engine";
import type { ReviewScheduleState, ReviewSchedulingContext } from "./types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function loadSchedulingContext(
  learnerId: string,
  skillId: string,
  mastery: Pick<LearnerSkillMastery, "status" | "masteryProbability" | "uncertainty">
): Promise<ReviewSchedulingContext> {
  const [requiredDependentCount, activeMisconception] = await Promise.all([
    prisma.skillDependency.count({
      where: { prerequisiteSkillId: skillId, dependencyType: "REQUIRED" },
    }),
    prisma.learnerMisconception.findFirst({
      where: {
        learnerId,
        status: { in: ["LIKELY", "CONFIRMED", "RESOLVING"] },
        misconception: { skillId, isActive: true },
      },
      orderBy: { probability: "desc" },
      select: { probability: true },
    }),
  ]);
  return {
    masteryStatus: mastery.status,
    masteryProbability: mastery.masteryProbability,
    uncertainty: mastery.uncertainty,
    requiredDependentCount,
    activeMisconceptionProbability: activeMisconception?.probability ?? 0,
  };
}

export async function rebuildSkillReviewSchedule(
  learnerId: string,
  skillId: string,
  masteryOverride?: Pick<LearnerSkillMastery, "status" | "masteryProbability" | "uncertainty">
) {
  const mastery = masteryOverride ?? await prisma.learnerSkillMastery.findUnique({
    where: { learnerId_skillId: { learnerId, skillId } },
    select: { status: true, masteryProbability: true, uncertainty: true },
  });
  if (!mastery || mastery.status === "NOT_STARTED") return null;

  const [context, evidence] = await Promise.all([
    loadSchedulingContext(learnerId, skillId, mastery),
    prisma.learningEvidence.findMany({
      where: { learnerId, skillId, outcome: { not: "UNGRADED" } },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      select: {
        evidenceType: true,
        outcome: true,
        assistanceLevel: true,
        responseTimeMs: true,
        expectedResponseTimeMs: true,
        delayDays: true,
        occurredAt: true,
      },
    }),
  ]);
  if (evidence.length === 0) return null;

  const firstRetentionIndex = evidence.findIndex((record) => record.evidenceType === "RETENTION");
  const anchorEvidence = firstRetentionIndex === -1
    ? evidence[evidence.length - 1]
    : firstRetentionIndex > 0
      ? evidence[firstRetentionIndex - 1]
      : evidence[0];
  let state = createReviewSchedule(context, anchorEvidence.occurredAt);
  if (!state) return null;

  for (const record of evidence) {
    if (record.evidenceType !== "RETENTION") continue;
    const delayDays = record.delayDays ?? Math.max(
      0,
      (record.occurredAt.getTime() - (state.lastReviewAt ?? anchorEvidence.occurredAt).getTime()) / 86_400_000
    );
    state = updateReviewSchedule(state, {
      outcome: record.outcome as "CORRECT" | "INCORRECT" | "PARTIAL",
      assistanceLevel: record.assistanceLevel,
      responseTimeMs: record.responseTimeMs ?? undefined,
      expectedResponseTimeMs: record.expectedResponseTimeMs ?? undefined,
      delayDays,
      occurredAt: record.occurredAt,
    }, context);
  }

  const data = {
    nextReviewAt: state.nextReviewAt,
    intervalDays: state.intervalDays,
    easeFactor: state.easeFactor,
    retrievalCount: state.retrievalCount,
    successfulRetrievals: state.successfulRetrievals,
    consecutiveSuccesses: state.consecutiveSuccesses,
    retentionConfidence: state.retentionConfidence,
    lastReviewAt: state.lastReviewAt,
    lastOutcome: state.lastOutcome,
    status: reviewScheduleStatus(state),
    reasonCodes: toJson(state.reasonCodes),
    scheduleVersion: state.scheduleVersion,
  };
  return prisma.skillReviewSchedule.upsert({
    where: { learnerId_skillId: { learnerId, skillId } },
    create: { learnerId, skillId, ...data },
    update: data,
    include: { skill: { include: { domain: true } } },
  });
}

export async function rebuildLearnerReviewSchedules(learnerId: string) {
  const mastery = await prisma.learnerSkillMastery.findMany({
    where: { learnerId, status: { not: "NOT_STARTED" } },
    select: { skillId: true, status: true, masteryProbability: true, uncertainty: true },
  });
  return Promise.all(mastery.map((state) =>
    rebuildSkillReviewSchedule(learnerId, state.skillId, state)
  ));
}

export async function getLearnerReviewQueue(learnerId: string, now = new Date()) {
  await prisma.skillReviewSchedule.updateMany({
    where: { learnerId, status: { not: "PAUSED" }, nextReviewAt: { lte: now } },
    data: { status: "DUE" },
  });
  return prisma.skillReviewSchedule.findMany({
    where: { learnerId, status: { not: "PAUSED" } },
    include: { skill: { include: { domain: true } } },
    orderBy: [{ nextReviewAt: "asc" }, { retentionConfidence: "asc" }],
  });
}

export function persistedScheduleState(schedule: {
  intervalDays: number;
  easeFactor: number;
  retrievalCount: number;
  successfulRetrievals: number;
  consecutiveSuccesses: number;
  retentionConfidence: number;
  lastReviewAt: Date | null;
  nextReviewAt: Date;
  lastOutcome: string | null;
  status: string;
  reasonCodes: Prisma.JsonValue;
}): ReviewScheduleState {
  return {
    ...schedule,
    lastOutcome: schedule.lastOutcome as ReviewScheduleState["lastOutcome"],
    status: schedule.status as ReviewScheduleState["status"],
    reasonCodes: Array.isArray(schedule.reasonCodes)
      ? schedule.reasonCodes.filter((value): value is string => typeof value === "string")
      : [],
    scheduleVersion: "math-retention-v1",
  };
}
