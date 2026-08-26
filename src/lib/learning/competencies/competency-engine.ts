import type { ThinkingCompetencyCode } from "./catalog";

export interface CompetencyEvidenceRecord {
  idempotencyKey: string;
  competencyCode: ThinkingCompetencyCode;
  outcome: "CORRECT" | "INCORRECT" | "PARTIAL" | "UNGRADED";
  weight: number;
  contextType: string;
  occurredAt: Date;
}

export interface ComputedCompetencyState {
  probability: number;
  uncertainty: number;
  evidenceCount: number;
  successfulEvidence: number;
  contextCount: number;
  status: "INSUFFICIENT_EVIDENCE" | "EMERGING" | "DEVELOPING" | "ESTABLISHED";
  reasonCodes: string[];
  lastEvidenceAt: Date | null;
  modelVersion: "thinking-v1";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeCompetencyState(records: CompetencyEvidenceRecord[]): ComputedCompetencyState {
  const graded = records.filter((record) => record.outcome !== "UNGRADED");
  let probability = 0.2;
  for (const record of graded) {
    const weight = clamp(record.weight, 0.2, 1.5);
    if (record.outcome === "CORRECT") probability += (1 - probability) * 0.12 * weight;
    if (record.outcome === "PARTIAL") probability += (0.55 - probability) * 0.05 * weight;
    if (record.outcome === "INCORRECT") probability -= probability * 0.1 * weight;
    probability = clamp(probability, 0.05, 0.95);
  }
  const contextCount = new Set(graded.map((record) => record.contextType)).size;
  const successfulEvidence = graded.filter((record) => record.outcome === "CORRECT").length;
  const uncertainty = clamp(1 / Math.sqrt(1 + graded.length * Math.max(1, contextCount)), 0.08, 1);
  let status: ComputedCompetencyState["status"] = "INSUFFICIENT_EVIDENCE";
  const reasonCodes: string[] = [];
  if (graded.length >= 3) status = "EMERGING";
  if (graded.length >= 6 && contextCount >= 2 && probability >= 0.55) status = "DEVELOPING";
  if (graded.length >= 10 && contextCount >= 3 && probability >= 0.75 && uncertainty <= 0.2) status = "ESTABLISHED";
  if (graded.length < 3) reasonCodes.push("SPARSE_EVIDENCE_NO_CONCLUSION");
  if (contextCount < 2) reasonCodes.push("CONTEXT_DIVERSITY_NOT_ESTABLISHED");
  if (status === "ESTABLISHED") reasonCodes.push("REPEATED_SUCCESS_ACROSS_CONTEXTS");
  return {
    probability: Math.round(probability * 10_000) / 10_000,
    uncertainty: Math.round(uncertainty * 10_000) / 10_000,
    evidenceCount: graded.length,
    successfulEvidence,
    contextCount,
    status,
    reasonCodes,
    lastEvidenceAt: records.reduce<Date | null>((latest, record) => !latest || record.occurredAt > latest ? record.occurredAt : latest, null),
    modelVersion: "thinking-v1",
  };
}
