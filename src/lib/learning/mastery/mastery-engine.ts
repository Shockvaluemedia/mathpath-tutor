import type {
  ComputedMasteryState,
  EvidenceAssistanceLevel,
  EvidenceOutcome,
  EvidenceType,
  LearningEvidenceRecord,
  MasteryComputationConfig,
  MasteryComputationContext,
} from "./types";

export const DEFAULT_MASTERY_CONFIG: MasteryComputationConfig = {
  priorProbability: 0.1,
  masteredProbability: 0.85,
  maximumUncertaintyForMastery: 0.35,
  minimumIndependentSuccesses: 3,
  minimumIndependentSuccessRate: 0.75,
  minimumRetentionSuccesses: 1,
  minimumRetentionScore: 0.75,
  minimumTransferSuccesses: 1,
  minimumTransferScore: 0.75,
  maximumMisconceptionPenaltyForMastery: 0.05,
};

const TYPE_WEIGHT: Record<EvidenceType, number> = {
  EXPOSURE: 0,
  ASSESSMENT: 0.8,
  PRACTICE: 0.65,
  RETENTION: 1.1,
  TRANSFER: 1.25,
};

const ASSISTANCE_WEIGHT: Record<EvidenceAssistanceLevel, number> = {
  NONE: 0.15,
  INDEPENDENT: 1,
  HINTED: 0.45,
  GUIDED: 0.3,
  WORKED_EXAMPLE: 0.15,
};

const INFORMATION_WEIGHT: Record<EvidenceType, number> = {
  EXPOSURE: 0.15,
  ASSESSMENT: 1,
  PRACTICE: 1,
  RETENTION: 1.4,
  TRANSFER: 1.5,
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function logit(probability: number): number {
  const safeProbability = clamp(probability, 0.01, 0.99);
  return Math.log(safeProbability / (1 - safeProbability));
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function outcomeValue(outcome: EvidenceOutcome): number | null {
  if (outcome === "CORRECT") return 1;
  if (outcome === "PARTIAL") return 0.5;
  if (outcome === "INCORRECT") return 0;
  return null;
}

function successRate(records: LearningEvidenceRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce(
    (sum, evidence) => sum + (outcomeValue(evidence.outcome) ?? 0),
    0
  );
  return round(total / records.length);
}

function evidenceSignal(evidence: LearningEvidenceRecord): number {
  const result = outcomeValue(evidence.outcome);
  if (result === null) return 0;

  const typeWeight = TYPE_WEIGHT[evidence.evidenceType];
  const assistanceWeight = ASSISTANCE_WEIGHT[evidence.assistanceLevel];
  const difficulty = clamp(evidence.difficulty ?? 3, 1, 5);
  const correctDifficultyFactor = 0.8 + difficulty * 0.08;
  const incorrectDifficultyFactor = 2 - correctDifficultyFactor;
  let signal: number;

  if (result === 1) {
    signal = typeWeight * assistanceWeight * correctDifficultyFactor;
  } else if (result === 0.5) {
    signal = typeWeight * assistanceWeight * correctDifficultyFactor * 0.15;
  } else {
    signal = -typeWeight * (0.5 + assistanceWeight * 0.5) * incorrectDifficultyFactor;
  }

  if (
    result === 1 &&
    evidence.assistanceLevel === "INDEPENDENT" &&
    evidence.responseTimeMs !== undefined &&
    evidence.expectedResponseTimeMs !== undefined &&
    evidence.responseTimeMs <= evidence.expectedResponseTimeMs
  ) {
    signal += 0.15;
  }

  if (evidence.evidenceType === "RETENTION" && evidence.delayDays) {
    const delayMultiplier = 1 + Math.min(evidence.delayDays / 60, 0.3);
    signal *= delayMultiplier;
  }

  if (evidence.confidenceRating !== undefined) {
    const confidence = clamp(evidence.confidenceRating / 10, 0, 1);
    signal += result === 0 ? -0.12 * confidence : 0.08 * confidence * result;
  }

  return signal;
}

function computeFluency(records: LearningEvidenceRecord[]): number {
  const eligible = records.filter(
    (evidence) =>
      evidence.assistanceLevel === "INDEPENDENT" &&
      evidence.responseTimeMs !== undefined &&
      evidence.expectedResponseTimeMs !== undefined &&
      evidence.outcome !== "UNGRADED"
  );
  if (eligible.length === 0) return 0;

  return round(
    eligible.reduce((sum, evidence) => {
      if (evidence.outcome !== "CORRECT") return sum;
      const ratio = evidence.responseTimeMs! / evidence.expectedResponseTimeMs!;
      if (ratio <= 1) return sum + 1;
      if (ratio <= 1.5) return sum + 0.7;
      return sum + 0.4;
    }, 0) / eligible.length
  );
}

function computeConfidence(records: LearningEvidenceRecord[]): {
  score: number;
  calibration: number;
} {
  const rated = records.filter(
    (evidence) =>
      evidence.confidenceRating !== undefined &&
      outcomeValue(evidence.outcome) !== null
  );
  if (rated.length === 0) return { score: 0, calibration: 0 };

  const score = rated.reduce(
    (sum, evidence) => sum + clamp(evidence.confidenceRating!, 0, 10),
    0
  ) / rated.length;
  const calibration = rated.reduce((sum, evidence) => {
    const confidence = clamp(evidence.confidenceRating! / 10, 0, 1);
    const result = outcomeValue(evidence.outcome) ?? 0;
    return sum + (1 - Math.abs(confidence - result));
  }, 0) / rated.length;

  return { score: round(score * 10, 1), calibration: round(calibration) };
}

function computeUncertainty(
  records: LearningEvidenceRecord[],
  misconceptionPenalty: number
): number {
  const information = records.reduce((sum, evidence) => {
    const assistance = evidence.outcome === "UNGRADED"
      ? 1
      : ASSISTANCE_WEIGHT[evidence.assistanceLevel];
    return sum + INFORMATION_WEIGHT[evidence.evidenceType] * assistance;
  }, 0);
  const categories = new Set<string>();
  if (records.some((evidence) => evidence.assistanceLevel === "INDEPENDENT" && evidence.outcome !== "UNGRADED")) categories.add("independent");
  if (records.some((evidence) => evidence.evidenceType === "RETENTION" && evidence.outcome !== "UNGRADED")) categories.add("retention");
  if (records.some((evidence) => evidence.evidenceType === "TRANSFER" && evidence.outcome !== "UNGRADED")) categories.add("transfer");
  const diversityReduction = Math.max(0, categories.size - 1) * 0.04;

  return round(clamp(
    1 / Math.sqrt(1 + information) - diversityReduction + misconceptionPenalty * 0.4,
    0.05,
    1
  ));
}

export function computeMasteryState(
  evidence: LearningEvidenceRecord[],
  context: MasteryComputationContext = {}
): ComputedMasteryState {
  const config = { ...DEFAULT_MASTERY_CONFIG, ...context.config };
  const misconceptionPenalty = clamp(context.misconceptionPenalty ?? 0, 0, 0.25);
  const graded = evidence.filter((record) => outcomeValue(record.outcome) !== null);
  const independent = graded.filter((record) => record.assistanceLevel === "INDEPENDENT");
  const assisted = graded.filter((record) =>
    ["HINTED", "GUIDED", "WORKED_EXAMPLE"].includes(record.assistanceLevel)
  );
  const retention = graded.filter((record) => record.evidenceType === "RETENTION");
  const transfer = graded.filter((record) => record.evidenceType === "TRANSFER");
  const independentSuccesses = independent.filter((record) => record.outcome === "CORRECT").length;
  const assistedSuccesses = assisted.filter((record) => record.outcome === "CORRECT").length;
  const retentionSuccesses = retention.filter((record) => record.outcome === "CORRECT").length;
  const transferSuccesses = transfer.filter((record) => record.outcome === "CORRECT").length;
  const independentSuccessRate = successRate(independent);
  const assistedSuccessRate = successRate(assisted);
  const retentionScore = successRate(retention);
  const transferScore = successRate(transfer);
  const confidence = computeConfidence(graded);
  const rawProbability = logistic(
    logit(config.priorProbability) + graded.reduce((sum, record) => sum + evidenceSignal(record), 0)
  );
  const masteryProbability = round(clamp(rawProbability - misconceptionPenalty, 0.01, 0.99));
  const uncertainty = computeUncertainty(evidence, misconceptionPenalty);
  const reasonCodes: string[] = [];

  if (masteryProbability < config.masteredProbability) reasonCodes.push("MASTERY_PROBABILITY_BELOW_THRESHOLD");
  if (uncertainty > config.maximumUncertaintyForMastery) reasonCodes.push("UNCERTAINTY_TOO_HIGH");
  if (independentSuccesses < config.minimumIndependentSuccesses) reasonCodes.push("INSUFFICIENT_INDEPENDENT_SUCCESS");
  if (independentSuccessRate < config.minimumIndependentSuccessRate) reasonCodes.push("INDEPENDENT_SUCCESS_RATE_TOO_LOW");
  if (retentionSuccesses < config.minimumRetentionSuccesses) reasonCodes.push("RETENTION_NOT_VERIFIED");
  if (retention.length > 0 && retentionScore < config.minimumRetentionScore) reasonCodes.push("RETENTION_SUCCESS_RATE_TOO_LOW");
  if (transferSuccesses < config.minimumTransferSuccesses) reasonCodes.push("TRANSFER_NOT_VERIFIED");
  if (transfer.length > 0 && transferScore < config.minimumTransferScore) reasonCodes.push("TRANSFER_SUCCESS_RATE_TOO_LOW");
  if (misconceptionPenalty > 0) reasonCodes.push("ACTIVE_MISCONCEPTION_PENALTY");
  if (misconceptionPenalty > config.maximumMisconceptionPenaltyForMastery) reasonCodes.push("ACTIVE_MISCONCEPTION_BLOCKS_MASTERY");

  const masteryRequirementsMet = reasonCodes.every(
    (reason) => reason === "ACTIVE_MISCONCEPTION_PENALTY"
  );
  let status: ComputedMasteryState["status"];
  if (evidence.length === 0) status = "NOT_STARTED";
  else if (masteryRequirementsMet) status = "MASTERED";
  else if (masteryProbability < 0.3) status = "EMERGING";
  else if (masteryProbability < 0.55) status = "DEVELOPING";
  else status = "PRACTICING";

  if (status === "MASTERED") {
    const hasActiveMisconceptionPenalty = reasonCodes.includes("ACTIVE_MISCONCEPTION_PENALTY");
    reasonCodes.splice(
      0,
      reasonCodes.length,
      "DURABLE_MASTERY_EVIDENCE_MET",
      ...(hasActiveMisconceptionPenalty ? ["ACTIVE_MISCONCEPTION_PENALTY"] : [])
    );
  }

  const lastEvidenceAt = evidence.reduce<Date | null>(
    (latest, record) => !latest || record.occurredAt > latest ? record.occurredAt : latest,
    null
  );

  return {
    masteryProbability,
    masteryScore: round(masteryProbability * 100, 1),
    uncertainty,
    confidenceScore: confidence.score,
    confidenceCalibration: confidence.calibration,
    independentSuccessRate,
    assistedSuccessRate,
    retentionScore,
    transferScore,
    fluencyScore: computeFluency(graded),
    evidenceCount: evidence.length,
    gradedAttempts: graded.length,
    independentAttempts: independent.length,
    independentSuccesses,
    assistedAttempts: assisted.length,
    assistedSuccesses,
    retentionAttempts: retention.length,
    retentionSuccesses,
    transferAttempts: transfer.length,
    transferSuccesses,
    status,
    lastEvidenceAt,
    modelVersion: "evidence-v1",
    reasonCodes,
  };
}
