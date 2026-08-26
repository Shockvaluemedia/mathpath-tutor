import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeLearnerCognitiveModel } from "./cognitive-engine";
import type { CognitiveEvidenceRecord } from "./types";

export const COGNITIVE_MODEL_VERSION = "cognitive-v1";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function recomputeLearnerCognitiveModel(learnerId: string) {
  const recentThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
  const [persistedEvidence, mastery, misconceptions, sessions] = await Promise.all([
    prisma.learningEvidence.findMany({
      where: { learnerId },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.learnerSkillMastery.findMany({
      where: { learnerId },
      include: { skill: { select: { name: true } } },
    }),
    prisma.learnerMisconception.findMany({
      where: { learnerId },
      include: {
        misconception: { select: { code: true, name: true, skillId: true } },
        evidence: { select: { id: true }, orderBy: { observedAt: "desc" }, take: 20 },
      },
    }),
    prisma.tutoringSession.findMany({
      where: { learnerId },
      select: { id: true, frustrationDetected: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const evidence: CognitiveEvidenceRecord[] = persistedEvidence.map((record) => ({
    id: record.id,
    skillId: record.skillId,
    evidenceType: record.evidenceType,
    outcome: record.outcome,
    assistanceLevel: record.assistanceLevel,
    hintsUsed: record.hintsUsed,
    responseTimeMs: record.responseTimeMs ?? undefined,
    expectedResponseTimeMs: record.expectedResponseTimeMs ?? undefined,
    confidenceRating: record.confidenceRating ?? undefined,
    representation: record.representation ?? undefined,
    instructionalStrategy: record.instructionalStrategy ?? undefined,
    metadata: toMetadata(record.metadata),
    occurredAt: record.occurredAt,
  }));
  const computed = computeLearnerCognitiveModel({
    evidence,
    mastery: mastery.map((state) => ({
      skillId: state.skillId,
      skillName: state.skill.name,
      masteryProbability: state.masteryProbability,
      uncertainty: state.uncertainty,
      evidenceCount: state.evidenceCount,
      retentionScore: state.retentionScore,
      retentionAttempts: state.retentionAttempts,
      transferScore: state.transferScore,
      transferAttempts: state.transferAttempts,
      fluencyScore: state.fluencyScore,
    })),
    misconceptions: misconceptions.map((state) => ({
      code: state.misconception.code,
      name: state.misconception.name,
      skillId: state.misconception.skillId,
      probability: state.probability,
      evidenceCount: state.evidenceCount,
      status: state.status,
      sourceEvidenceIds: state.evidence.map((record) => record.id),
    })),
    frustration: {
      sessionCount: sessions.length,
      frustratedSessionCount: sessions.filter((session) => session.frustrationDetected).length,
      recentFrustratedSessionCount: sessions.filter(
        (session) => session.frustrationDetected && session.createdAt >= recentThreshold
      ).length,
      sourceSessionIds: sessions.filter((session) => session.frustrationDetected).slice(-20).map((session) => session.id),
      firstObservedAt: sessions.length
        ? new Date(Math.min(...sessions.map((session) => session.createdAt.getTime())))
        : undefined,
      lastObservedAt: sessions.length
        ? new Date(Math.max(...sessions.map((session) => session.createdAt.getTime())))
        : undefined,
    },
  });
  const activeKeys = new Set(
    computed.patterns.map((pattern) => `${pattern.patternType}:${pattern.scopeKey}`)
  );
  const existingPatterns = await prisma.learnerPattern.findMany({
    where: { learnerId, status: "ACTIVE" },
    select: { id: true, patternType: true, scopeKey: true },
  });
  const resolvedIds = existingPatterns
    .filter((pattern) => !activeKeys.has(`${pattern.patternType}:${pattern.scopeKey}`))
    .map((pattern) => pattern.id);

  await prisma.$transaction(async (transaction) => {
    if (resolvedIds.length > 0) {
      await transaction.learnerPattern.updateMany({
        where: { id: { in: resolvedIds } },
        data: { status: "RESOLVED", resolvedAt: new Date(), modelVersion: COGNITIVE_MODEL_VERSION },
      });
    }

    for (const current of computed.patterns) {
      await transaction.learnerPattern.upsert({
        where: {
          learnerId_patternType_scopeKey: {
            learnerId,
            patternType: current.patternType,
            scopeKey: current.scopeKey,
          },
        },
        create: {
          learnerId,
          patternType: current.patternType,
          scopeKey: current.scopeKey,
          statement: current.statement,
          confidence: current.confidence,
          evidence: toInputJson(current.evidence),
          status: "ACTIVE",
          modelVersion: COGNITIVE_MODEL_VERSION,
          firstObservedAt: current.firstObservedAt,
          lastObservedAt: current.lastObservedAt,
        },
        update: {
          statement: current.statement,
          confidence: current.confidence,
          evidence: toInputJson(current.evidence),
          status: "ACTIVE",
          modelVersion: COGNITIVE_MODEL_VERSION,
          lastObservedAt: current.lastObservedAt,
          resolvedAt: null,
        },
      });
    }

    for (const performance of computed.strategyPerformance) {
      await transaction.instructionalStrategyPerformance.upsert({
        where: {
          learnerId_strategy_scopeKey: {
            learnerId,
            strategy: performance.strategy,
            scopeKey: performance.scopeKey,
          },
        },
        create: {
          learnerId,
          skillId: performance.skillId,
          strategy: performance.strategy,
          scopeKey: performance.scopeKey,
          attempts: performance.attempts,
          successfulAttempts: performance.successfulAttempts,
          averageOutcomeScore: performance.averageOutcomeScore,
          averageMasteryGain: performance.averageMasteryGain,
          averageConfidenceGain: performance.averageConfidenceGain,
          averageTimeToSuccessMs: performance.averageTimeToSuccessMs,
          evidence: toInputJson(performance.evidence),
          modelVersion: COGNITIVE_MODEL_VERSION,
          firstUsedAt: performance.firstUsedAt,
          lastUsedAt: performance.lastUsedAt,
        },
        update: {
          skillId: performance.skillId,
          attempts: performance.attempts,
          successfulAttempts: performance.successfulAttempts,
          averageOutcomeScore: performance.averageOutcomeScore,
          averageMasteryGain: performance.averageMasteryGain,
          averageConfidenceGain: performance.averageConfidenceGain,
          averageTimeToSuccessMs: performance.averageTimeToSuccessMs,
          evidence: toInputJson(performance.evidence),
          modelVersion: COGNITIVE_MODEL_VERSION,
          lastUsedAt: performance.lastUsedAt,
        },
      });
    }

    await transaction.learnerProfile.upsert({
      where: { learnerId },
      create: {
        learnerId,
        cognitiveSummary: toInputJson(computed.summary),
        cognitiveModelVersion: COGNITIVE_MODEL_VERSION,
        cognitiveModelUpdatedAt: new Date(),
      },
      update: {
        cognitiveSummary: toInputJson(computed.summary),
        cognitiveModelVersion: COGNITIVE_MODEL_VERSION,
        cognitiveModelUpdatedAt: new Date(),
      },
    });
  });

  return computed;
}

export async function getPersistedLearnerCognitiveModel(learnerId: string) {
  const [profile, patterns, strategyPerformance] = await Promise.all([
    prisma.learnerProfile.findUnique({
      where: { learnerId },
      select: { cognitiveSummary: true, cognitiveModelVersion: true, cognitiveModelUpdatedAt: true },
    }),
    prisma.learnerPattern.findMany({
      where: { learnerId, status: "ACTIVE" },
      orderBy: [{ confidence: "desc" }, { lastObservedAt: "desc" }],
    }),
    prisma.instructionalStrategyPerformance.findMany({
      where: { learnerId },
      orderBy: [{ averageOutcomeScore: "desc" }, { attempts: "desc" }],
      include: { skill: { select: { name: true, slug: true } } },
    }),
  ]);

  return {
    modelVersion: profile?.cognitiveModelVersion ?? "uninitialized",
    updatedAt: profile?.cognitiveModelUpdatedAt,
    summary: profile?.cognitiveSummary ?? {},
    patterns,
    strategyPerformance,
  };
}
