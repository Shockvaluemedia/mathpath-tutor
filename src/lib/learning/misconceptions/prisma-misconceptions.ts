import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { applyMisconceptionEvidence } from "./hypothesis-engine";
import type {
  MisconceptionEvidenceDirection,
  MisconceptionLifecycleStatus,
} from "./types";

export interface RecordMisconceptionEvidenceInput {
  learnerId: string;
  misconceptionCode: string;
  direction: MisconceptionEvidenceDirection;
  sourceType: string;
  sourceId?: string;
  observedAnswer?: string;
  expectedAnswer?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordMisconceptionEvidence(
  input: RecordMisconceptionEvidenceInput
) {
  return prisma.$transaction(async (transaction) => {
    const misconception = await transaction.misconception.findUnique({
      where: { code: input.misconceptionCode },
      select: { id: true },
    });
    if (!misconception) {
      throw new Error(`Unknown misconception: ${input.misconceptionCode}`);
    }

    const existing = await transaction.learnerMisconception.findUnique({
      where: {
        learnerId_misconceptionId: {
          learnerId: input.learnerId,
          misconceptionId: misconception.id,
        },
      },
    });
    const update = applyMisconceptionEvidence(
      existing
        ? {
            probability: existing.probability,
            status: existing.status as MisconceptionLifecycleStatus,
            evidenceCount: existing.evidenceCount,
            contradictingEvidenceCount: existing.contradictingEvidenceCount,
          }
        : {
            probability: 0.1,
            status: "SUSPECTED",
            evidenceCount: 0,
            contradictingEvidenceCount: 0,
          },
      { direction: input.direction, weight: input.weight }
    );
    const now = new Date();

    const state = await transaction.learnerMisconception.upsert({
      where: {
        learnerId_misconceptionId: {
          learnerId: input.learnerId,
          misconceptionId: misconception.id,
        },
      },
      create: {
        learnerId: input.learnerId,
        misconceptionId: misconception.id,
        probability: update.probability,
        status: update.status,
        evidenceCount: update.evidenceCount,
        contradictingEvidenceCount: update.contradictingEvidenceCount,
        firstObservedAt: now,
        lastObservedAt: now,
        resolvedAt: update.resolved ? now : null,
      },
      update: {
        probability: update.probability,
        status: update.status,
        evidenceCount: update.evidenceCount,
        contradictingEvidenceCount: update.contradictingEvidenceCount,
        lastObservedAt: now,
        resolvedAt: update.resolved ? now : null,
      },
    });

    await transaction.learnerMisconceptionEvidence.create({
      data: {
        learnerMisconceptionId: state.id,
        direction: input.direction,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        observedAnswer: input.observedAnswer,
        expectedAnswer: input.expectedAnswer,
        weight: input.weight ?? 1,
        metadata: toInputJson(input.metadata ?? {}),
      },
    });

    return { state, update };
  });
}
