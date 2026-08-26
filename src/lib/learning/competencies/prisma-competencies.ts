import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { THINKING_COMPETENCIES, type ThinkingCompetencyCode } from "./catalog";
import { computeCompetencyState, type CompetencyEvidenceRecord } from "./competency-engine";

export interface ThinkingCompetencyEvidenceInput {
  idempotencyKey: string;
  learnerId: string;
  competencyCode: ThinkingCompetencyCode;
  skillId?: string;
  outcome: "CORRECT" | "INCORRECT" | "PARTIAL" | "UNGRADED";
  weight?: number;
  contextType: string;
  sourceType: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordThinkingCompetencyEvidenceBatch(inputs: ThinkingCompetencyEvidenceInput[]) {
  if (inputs.length === 0) return { insertedEvidenceCount: 0, projections: [] };
  return prisma.$transaction(async (transaction) => {
    const competencyIds = new Map<ThinkingCompetencyCode, string>();
    for (const code of new Set(inputs.map((input) => input.competencyCode))) {
      const definition = THINKING_COMPETENCIES[code];
      const competency = await transaction.thinkingCompetency.upsert({
        where: { code },
        create: { code, ...definition },
        update: { ...definition, isActive: true },
      });
      competencyIds.set(code, competency.id);
    }
    const inserted = await transaction.thinkingCompetencyEvidence.createMany({
      data: inputs.map((input) => ({
        idempotencyKey: input.idempotencyKey,
        learnerId: input.learnerId,
        competencyId: competencyIds.get(input.competencyCode)!,
        skillId: input.skillId,
        outcome: input.outcome,
        weight: Math.min(1.5, Math.max(0.2, input.weight ?? 1)),
        contextType: input.contextType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metadata: toJson(input.metadata ?? {}),
        occurredAt: input.occurredAt,
      })),
      skipDuplicates: true,
    });
    const projections: Array<{
      learnerId: string;
      competencyCode: ThinkingCompetencyCode;
      state: ReturnType<typeof computeCompetencyState>;
    }> = [];
    for (const [code, competencyId] of competencyIds) {
      const learnerIds = new Set(inputs.filter((input) => input.competencyCode === code).map((input) => input.learnerId));
      for (const learnerId of learnerIds) {
        const records = await transaction.thinkingCompetencyEvidence.findMany({
          where: { learnerId, competencyId },
          orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        });
        const state = computeCompetencyState(records.map((record): CompetencyEvidenceRecord => ({
          idempotencyKey: record.idempotencyKey,
          competencyCode: code,
          outcome: record.outcome,
          weight: record.weight,
          contextType: record.contextType,
          occurredAt: record.occurredAt,
        })));
        await transaction.learnerThinkingCompetency.upsert({
          where: { learnerId_competencyId: { learnerId, competencyId } },
          create: {
            learnerId, competencyId, probability: state.probability, uncertainty: state.uncertainty,
            evidenceCount: state.evidenceCount, successfulEvidence: state.successfulEvidence,
            contextCount: state.contextCount, status: state.status, reasonCodes: toJson(state.reasonCodes),
            modelVersion: state.modelVersion, lastEvidenceAt: state.lastEvidenceAt,
          },
          update: {
            probability: state.probability, uncertainty: state.uncertainty,
            evidenceCount: state.evidenceCount, successfulEvidence: state.successfulEvidence,
            contextCount: state.contextCount, status: state.status, reasonCodes: toJson(state.reasonCodes),
            modelVersion: state.modelVersion, lastEvidenceAt: state.lastEvidenceAt,
          },
        });
        projections.push({ learnerId, competencyCode: code, state });
      }
    }
    return { insertedEvidenceCount: inserted.count, projections };
  });
}
