import {
  Prisma,
  type LearningEvidence as PersistedLearningEvidence,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeMasteryState } from "./mastery-engine";
import { calculateMisconceptionPenalty } from "./misconception-penalty";
import { recomputeLearnerCognitiveModel } from "../learner-model/prisma-learner-model";
import { rebuildSkillReviewSchedule } from "../retention/prisma-retention";
import type {
  ComputedMasteryState,
  EvidenceAssistanceLevel,
  EvidenceOutcome,
  EvidenceType,
  LearningEvidenceRecord,
} from "./types";

export interface PersistedMasteryProjection {
  learnerId: string;
  skillId: string;
  state: ComputedMasteryState;
}

export interface RecordLearningEvidenceResult {
  insertedEvidenceCount: number;
  projections: PersistedMasteryProjection[];
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function evidenceIdentity(record: LearningEvidenceRecord): string {
  return JSON.stringify([
    record.learnerId,
    record.skillId,
    record.evidenceType,
    record.outcome,
    record.assistanceLevel,
    record.sourceType,
    record.learnerAnswer ?? null,
    record.correctAnswer ?? null,
  ]);
}

function uniqueEvidence(records: LearningEvidenceRecord[]): LearningEvidenceRecord[] {
  const byKey = new Map<string, LearningEvidenceRecord>();
  for (const record of records) {
    if (!record.idempotencyKey || !record.learnerId || !record.skillId || !record.sourceType) {
      throw new Error("Learning evidence requires an idempotency key, learner, skill, and source");
    }
    if (!Number.isFinite(record.occurredAt.getTime())) {
      throw new Error(`Learning evidence has an invalid occurredAt: ${record.idempotencyKey}`);
    }

    const existing = byKey.get(record.idempotencyKey);
    if (existing && evidenceIdentity(existing) !== evidenceIdentity(record)) {
      throw new Error(`Conflicting learning evidence in batch: ${record.idempotencyKey}`);
    }
    byKey.set(record.idempotencyKey, record);
  }
  return [...byKey.values()];
}

function toMasteryEvidence(record: PersistedLearningEvidence): LearningEvidenceRecord {
  return {
    idempotencyKey: record.idempotencyKey,
    learnerId: record.learnerId,
    skillId: record.skillId,
    evidenceType: record.evidenceType as EvidenceType,
    outcome: record.outcome as EvidenceOutcome,
    assistanceLevel: record.assistanceLevel as EvidenceAssistanceLevel,
    sourceType: record.sourceType,
    sourceId: record.sourceId ?? undefined,
    learnerAnswer: record.learnerAnswer ?? undefined,
    correctAnswer: record.correctAnswer ?? undefined,
    hintsUsed: record.hintsUsed,
    responseTimeMs: record.responseTimeMs ?? undefined,
    expectedResponseTimeMs: record.expectedResponseTimeMs ?? undefined,
    confidenceRating: record.confidenceRating ?? undefined,
    difficulty: record.difficulty ?? undefined,
    delayDays: record.delayDays ?? undefined,
    representation: record.representation ?? undefined,
    instructionalStrategy: record.instructionalStrategy ?? undefined,
    metadata: toMetadata(record.metadata),
    occurredAt: record.occurredAt,
  };
}

function latestGradedEvidenceAt(records: LearningEvidenceRecord[]): Date | null {
  return records.reduce<Date | null>((latest, record) => {
    if (record.outcome === "UNGRADED") return latest;
    return !latest || record.occurredAt > latest ? record.occurredAt : latest;
  }, null);
}

export async function recordLearningEvidenceBatchAndUpdateMastery(
  records: LearningEvidenceRecord[]
): Promise<RecordLearningEvidenceResult> {
  const batch = uniqueEvidence(records);
  if (batch.length === 0) {
    return { insertedEvidenceCount: 0, projections: [] };
  }

  const result = await prisma.$transaction(async (transaction) => {
    const inserted = await transaction.learningEvidence.createMany({
      data: batch.map((record) => ({
        idempotencyKey: record.idempotencyKey,
        learnerId: record.learnerId,
        skillId: record.skillId,
        evidenceType: record.evidenceType,
        outcome: record.outcome,
        assistanceLevel: record.assistanceLevel,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        learnerAnswer: record.learnerAnswer,
        correctAnswer: record.correctAnswer,
        hintsUsed: record.hintsUsed ?? 0,
        responseTimeMs: record.responseTimeMs,
        expectedResponseTimeMs: record.expectedResponseTimeMs,
        confidenceRating: record.confidenceRating,
        difficulty: record.difficulty,
        delayDays: record.delayDays,
        representation: record.representation,
        instructionalStrategy: record.instructionalStrategy,
        metadata: toInputJson(record.metadata ?? {}),
        occurredAt: record.occurredAt,
      })),
      skipDuplicates: true,
    });

    const persistedBatch = await transaction.learningEvidence.findMany({
      where: { idempotencyKey: { in: batch.map((record) => record.idempotencyKey) } },
    });
    const persistedByKey = new Map(
      persistedBatch.map((record) => [record.idempotencyKey, record])
    );
    for (const record of batch) {
      const persisted = persistedByKey.get(record.idempotencyKey);
      if (!persisted || evidenceIdentity(toMasteryEvidence(persisted)) !== evidenceIdentity(record)) {
        throw new Error(`Learning evidence idempotency collision: ${record.idempotencyKey}`);
      }
    }

    const affectedPairs = new Map<string, { learnerId: string; skillId: string }>();
    for (const record of batch) {
      affectedPairs.set(`${record.learnerId}:${record.skillId}`, {
        learnerId: record.learnerId,
        skillId: record.skillId,
      });
    }

    const projections: PersistedMasteryProjection[] = [];
    for (const pair of affectedPairs.values()) {
      const [allPersistedEvidence, skill, misconceptionStates] = await Promise.all([
        transaction.learningEvidence.findMany({
          where: pair,
          orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        }),
        transaction.learningSkill.findUniqueOrThrow({
          where: { id: pair.skillId },
          select: { masteryThreshold: true },
        }),
        transaction.learnerMisconception.findMany({
          where: {
            learnerId: pair.learnerId,
            status: { in: ["LIKELY", "CONFIRMED", "RESOLVING"] },
            misconception: { skillId: pair.skillId, isActive: true },
          },
          select: {
            probability: true,
            status: true,
            misconception: { select: { severity: true } },
          },
        }),
      ]);
      const allEvidence = allPersistedEvidence.map(toMasteryEvidence);
      const misconceptionPenalty = calculateMisconceptionPenalty(
        misconceptionStates.map((state) => ({
          probability: state.probability,
          severity: state.misconception.severity,
          status: state.status as "LIKELY" | "CONFIRMED" | "RESOLVING",
        }))
      );
      const state = computeMasteryState(allEvidence, {
        misconceptionPenalty,
        config: {
          masteredProbability: Math.min(
            0.99,
            Math.max(0.85, skill.masteryThreshold / 100)
          ),
        },
      });

      await transaction.learnerSkillMastery.upsert({
        where: { learnerId_skillId: pair },
        create: {
          ...pair,
          masteryScore: state.masteryScore,
          masteryProbability: state.masteryProbability,
          uncertainty: state.uncertainty,
          confidenceScore: state.confidenceScore,
          confidenceCalibration: state.confidenceCalibration,
          independentSuccessRate: state.independentSuccessRate,
          assistedSuccessRate: state.assistedSuccessRate,
          retentionScore: state.retentionScore,
          transferScore: state.transferScore,
          fluencyScore: state.fluencyScore,
          evidenceCount: state.evidenceCount,
          independentAttempts: state.independentAttempts,
          assistedAttempts: state.assistedAttempts,
          retentionAttempts: state.retentionAttempts,
          transferAttempts: state.transferAttempts,
          status: state.status,
          attempts: state.gradedAttempts,
          lastPracticed: latestGradedEvidenceAt(allEvidence),
          lastEvidenceAt: state.lastEvidenceAt,
          masteryModelVersion: state.modelVersion,
          masteryReasons: toInputJson(state.reasonCodes),
        },
        update: {
          masteryScore: state.masteryScore,
          masteryProbability: state.masteryProbability,
          uncertainty: state.uncertainty,
          confidenceScore: state.confidenceScore,
          confidenceCalibration: state.confidenceCalibration,
          independentSuccessRate: state.independentSuccessRate,
          assistedSuccessRate: state.assistedSuccessRate,
          retentionScore: state.retentionScore,
          transferScore: state.transferScore,
          fluencyScore: state.fluencyScore,
          evidenceCount: state.evidenceCount,
          independentAttempts: state.independentAttempts,
          assistedAttempts: state.assistedAttempts,
          retentionAttempts: state.retentionAttempts,
          transferAttempts: state.transferAttempts,
          status: state.status,
          attempts: state.gradedAttempts,
          lastPracticed: latestGradedEvidenceAt(allEvidence),
          lastEvidenceAt: state.lastEvidenceAt,
          masteryModelVersion: state.modelVersion,
          masteryReasons: toInputJson(state.reasonCodes),
        },
      });
      projections.push({ ...pair, state });
    }

    return {
      insertedEvidenceCount: inserted.count,
      projections,
    };
  });

  if (result.insertedEvidenceCount > 0) {
    for (const projection of result.projections) {
      await rebuildSkillReviewSchedule(
        projection.learnerId,
        projection.skillId,
        {
          status: projection.state.status,
          masteryProbability: projection.state.masteryProbability,
          uncertainty: projection.state.uncertainty,
        }
      );
    }
    for (const learnerId of new Set(batch.map((record) => record.learnerId))) {
      await recomputeLearnerCognitiveModel(learnerId);
    }
  }
  return result;
}
