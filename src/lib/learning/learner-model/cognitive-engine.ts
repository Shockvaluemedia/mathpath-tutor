import type {
  CognitiveEvidenceRecord,
  CognitiveFrustrationSummary,
  CognitiveMasterySnapshot,
  CognitiveMisconceptionSnapshot,
  ComputedLearnerCognitiveModel,
  ComputedLearnerPattern,
  ComputedStrategyPerformance,
  LearnerPatternType,
} from "./types";

const MIN_GENERAL_EVIDENCE = 4;
const MIN_SPECIALIZED_EVIDENCE = 2;

function clamp(value: number, minimum = 0, maximum = 1): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function mean(values: number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function outcomeScore(record: CognitiveEvidenceRecord): number | null {
  if (record.outcome === "CORRECT") return 1;
  if (record.outcome === "PARTIAL") return 0.5;
  if (record.outcome === "INCORRECT") return 0;
  return null;
}

function confidenceForSample(size: number, minimum: number, signal = 1): number {
  return round(clamp((0.5 + (size - minimum) * 0.07) * clamp(signal, 0.65, 1), 0, 0.95));
}

function dates(records: CognitiveEvidenceRecord[]): { first: Date; last: Date } {
  const ordered = [...records].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  return { first: ordered[0].occurredAt, last: ordered.at(-1)!.occurredAt };
}

function evidenceSummary(records: CognitiveEvidenceRecord[], extra: Record<string, unknown>) {
  return {
    sampleSize: records.length,
    sourceEvidenceIds: records.slice(-20).map((record) => record.id),
    ...extra,
  };
}

function pattern(
  patternType: LearnerPatternType,
  scopeKey: string,
  statement: string,
  confidence: number,
  records: CognitiveEvidenceRecord[],
  evidence: Record<string, unknown>
): ComputedLearnerPattern {
  const observed = dates(records);
  return {
    patternType,
    scopeKey,
    statement,
    confidence,
    evidence: evidenceSummary(records, evidence),
    firstObservedAt: observed.first,
    lastObservedAt: observed.last,
  };
}

function numericMetadata(record: CognitiveEvidenceRecord, key: string): number | undefined {
  const value = record.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function computeStrategyPerformance(
  graded: CognitiveEvidenceRecord[]
): ComputedStrategyPerformance[] {
  const groups = new Map<string, CognitiveEvidenceRecord[]>();
  for (const record of graded) {
    if (!record.instructionalStrategy) continue;
    const key = `${record.instructionalStrategy}:${record.skillId}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return [...groups.entries()].map(([scopeKey, records]) => {
    const scores = records.flatMap((record) => {
      const score = outcomeScore(record);
      return score === null ? [] : [score];
    });
    const successes = records.filter((record) => record.outcome === "CORRECT");
    const masteryGains = records.flatMap((record) => {
      const before = numericMetadata(record, "masteryBefore");
      const after = numericMetadata(record, "masteryAfter");
      return before === undefined || after === undefined ? [] : [after - before];
    });
    const confidenceGains = records.flatMap((record) => {
      const before = numericMetadata(record, "confidenceBefore");
      const after = numericMetadata(record, "confidenceAfter");
      return before === undefined || after === undefined ? [] : [after - before];
    });
    const successfulTimes = successes.flatMap((record) =>
      record.responseTimeMs === undefined ? [] : [record.responseTimeMs]
    );
    const observed = dates(records);
    const strategy = records[0].instructionalStrategy!;
    return {
      skillId: records[0].skillId,
      strategy,
      scopeKey,
      attempts: records.length,
      successfulAttempts: successes.length,
      averageOutcomeScore: round(mean(scores) ?? 0),
      averageMasteryGain: masteryGains.length ? round(mean(masteryGains)!) : undefined,
      averageConfidenceGain: confidenceGains.length ? round(mean(confidenceGains)!) : undefined,
      averageTimeToSuccessMs: successfulTimes.length ? Math.round(mean(successfulTimes)!) : undefined,
      evidence: evidenceSummary(records, {
        reasonCode: "AGGREGATED_VERIFIED_STRATEGY_OUTCOMES",
        masteryGainSampleSize: masteryGains.length,
        confidenceGainSampleSize: confidenceGains.length,
      }),
      firstUsedAt: observed.first,
      lastUsedAt: observed.last,
    };
  });
}

export function computeLearnerCognitiveModel(input: {
  evidence: CognitiveEvidenceRecord[];
  mastery?: CognitiveMasterySnapshot[];
  misconceptions?: CognitiveMisconceptionSnapshot[];
  frustration?: CognitiveFrustrationSummary;
  now?: Date;
}): ComputedLearnerCognitiveModel {
  const now = input.now ?? new Date();
  const graded = input.evidence
    .filter((record) => outcomeScore(record) !== null)
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const patterns: ComputedLearnerPattern[] = [];
  const strategyPerformance = computeStrategyPerformance(graded);

  const calibrated = graded.filter((record) => record.confidenceRating !== undefined);
  if (calibrated.length >= MIN_GENERAL_EVIDENCE) {
    const accuracy = mean(calibrated.map((record) => outcomeScore(record)!))!;
    const reportedConfidence = mean(calibrated.map((record) => (record.confidenceRating! - 1) / 9))!;
    const gap = reportedConfidence - accuracy;
    const label = gap > 0.2 ? "overestimates" : gap < -0.2 ? "underestimates" : "is well aligned with";
    patterns.push(pattern(
      "CONFIDENCE_CALIBRATION",
      "global",
      `Reported confidence ${label} verified performance.`,
      confidenceForSample(calibrated.length, MIN_GENERAL_EVIDENCE, Math.max(0.65, Math.abs(gap) + 0.65)),
      calibrated,
      { accuracy: round(accuracy), reportedConfidence: round(reportedConfidence), calibrationGap: round(gap), reasonCode: "VERIFIED_CONFIDENCE_OUTCOME_COMPARISON" }
    ));
  }

  if (graded.length >= MIN_GENERAL_EVIDENCE) {
    const assisted = graded.filter((record) => record.hintsUsed > 0 || !["NONE", "INDEPENDENT"].includes(record.assistanceLevel));
    const independent = graded.filter((record) => record.hintsUsed === 0 && ["NONE", "INDEPENDENT"].includes(record.assistanceLevel));
    const assistedRate = assisted.length / graded.length;
    const independentSuccess = mean(independent.map((record) => outcomeScore(record)!)) ?? 0;
    if (assistedRate >= 0.5 && independentSuccess < 0.65) {
      patterns.push(pattern(
        "HINT_DEPENDENCY",
        "global",
        "Performance currently depends on hints or guided support more than independent work.",
        confidenceForSample(graded.length, MIN_GENERAL_EVIDENCE, assistedRate),
        graded,
        { assistedAttemptRate: round(assistedRate), independentSuccessRate: round(independentSuccess), reasonCode: "ASSISTANCE_EXCEEDS_INDEPENDENT_SUCCESS" }
      ));
    }
  }

  const timed = graded.filter((record) => record.responseTimeMs !== undefined && record.expectedResponseTimeMs !== undefined && record.expectedResponseTimeMs > 0);
  if (timed.length >= MIN_GENERAL_EVIDENCE) {
    const paceRatio = mean(timed.map((record) => record.responseTimeMs! / record.expectedResponseTimeMs!))!;
    const accuracy = mean(timed.map((record) => outcomeScore(record)!))!;
    if (paceRatio < 0.65 && accuracy < 0.75) {
      patterns.push(pattern("RUSHING_RISK", "global", "Fast responses are currently associated with lower accuracy.", confidenceForSample(timed.length, MIN_GENERAL_EVIDENCE), timed, { averagePaceRatio: round(paceRatio), accuracy: round(accuracy), reasonCode: "FAST_RELATIVE_LATENCY_WITH_ERRORS" }));
    } else if (paceRatio > 1.4 && accuracy >= 0.7) {
      patterns.push(pattern("DELIBERATE_PACE", "global", "The learner is accurate when given additional processing time.", confidenceForSample(timed.length, MIN_GENERAL_EVIDENCE), timed, { averagePaceRatio: round(paceRatio), accuracy: round(accuracy), reasonCode: "SLOW_RELATIVE_LATENCY_WITH_ACCURACY" }));
    }
  }

  const recoveryOpportunities = graded.flatMap((record, index) =>
    record.outcome === "INCORRECT" && graded[index + 1] ? [{ failure: record, next: graded[index + 1] }] : []
  );
  if (recoveryOpportunities.length >= 3) {
    const recovered = recoveryOpportunities.filter(({ next }) => next.outcome === "CORRECT").length;
    const recoveryRate = recovered / recoveryOpportunities.length;
    const records = recoveryOpportunities.flatMap(({ failure, next }) => [failure, next]);
    if (recoveryRate >= 0.6) {
      patterns.push(pattern("PERSISTENCE_STRENGTH", "global", "The learner frequently recovers with a correct response after an error.", confidenceForSample(recoveryOpportunities.length, 3, recoveryRate), records, { recoveryRate: round(recoveryRate), opportunities: recoveryOpportunities.length, reasonCode: "POST_FAILURE_RECOVERY" }));
    } else if (recoveryRate <= 0.33) {
      patterns.push(pattern("FAILURE_CASCADE_RISK", "global", "Errors are often followed by another unsuccessful attempt, suggesting a need for smaller steps.", confidenceForSample(recoveryOpportunities.length, 3, 1 - recoveryRate), records, { recoveryRate: round(recoveryRate), opportunities: recoveryOpportunities.length, reasonCode: "REPEATED_FAILURE_SEQUENCE" }));
    }
  }

  for (const [type, strengthType, needType, strengthText, needText] of [
    ["RETENTION", "RETENTION_STRENGTH", "RETENTION_NEED", "Delayed retrieval is holding across checks.", "Delayed retrieval is not yet stable and needs review."],
    ["TRANSFER", "TRANSFER_STRENGTH", "TRANSFER_NEED", "The learner applies knowledge successfully in new contexts.", "Application in new contexts still needs support."],
  ] as const) {
    const records = graded.filter((record) => record.evidenceType === type);
    if (records.length < MIN_SPECIALIZED_EVIDENCE) continue;
    const successRate = mean(records.map((record) => outcomeScore(record)!))!;
    patterns.push(pattern(
      successRate >= 0.7 ? strengthType : needType,
      "global",
      successRate >= 0.7 ? strengthText : needText,
      confidenceForSample(records.length, MIN_SPECIALIZED_EVIDENCE, Math.max(successRate, 1 - successRate)),
      records,
      { successRate: round(successRate), reasonCode: `${type}_OUTCOME_RATE` }
    ));
  }

  const representationGroups = new Map<string, CognitiveEvidenceRecord[]>();
  for (const record of graded) {
    if (!record.representation) continue;
    representationGroups.set(record.representation, [...(representationGroups.get(record.representation) ?? []), record]);
  }
  for (const [representation, records] of representationGroups) {
    if (records.length < 3) continue;
    const successRate = mean(records.map((record) => outcomeScore(record)!))!;
    if (successRate < 0.7) continue;
    patterns.push(pattern("REPRESENTATION_EFFECTIVENESS", representation, `${representation} representations are associated with successful verified responses.`, confidenceForSample(records.length, 3, successRate), records, { representation, successRate: round(successRate), reasonCode: "REPRESENTATION_VERIFIED_SUCCESS_RATE" }));
  }

  for (const performance of strategyPerformance) {
    if (performance.attempts < 3) continue;
    const records = graded.filter((record) => record.instructionalStrategy === performance.strategy && record.skillId === performance.skillId);
    if (performance.averageOutcomeScore >= 0.75) {
      patterns.push(pattern("SUCCESSFUL_STRATEGY", performance.scopeKey, `${performance.strategy} is producing strong verified outcomes for this skill.`, confidenceForSample(performance.attempts, 3, performance.averageOutcomeScore), records, { strategy: performance.strategy, skillId: performance.skillId, successRate: performance.averageOutcomeScore, reasonCode: "STRATEGY_VERIFIED_SUCCESS_RATE" }));
    } else if (performance.averageOutcomeScore <= 0.4) {
      patterns.push(pattern("INEFFECTIVE_STRATEGY", performance.scopeKey, `${performance.strategy} is not yet producing reliable outcomes for this skill.`, confidenceForSample(performance.attempts, 3, 1 - performance.averageOutcomeScore), records, { strategy: performance.strategy, skillId: performance.skillId, successRate: performance.averageOutcomeScore, reasonCode: "STRATEGY_LOW_VERIFIED_SUCCESS_RATE" }));
    }
  }

  const errorGroups = new Map<string, CognitiveEvidenceRecord[]>();
  for (const record of graded.filter((candidate) => candidate.outcome === "INCORRECT")) {
    const mistakeType = typeof record.metadata.mistakeType === "string" ? record.metadata.mistakeType : undefined;
    if (!mistakeType) continue;
    errorGroups.set(mistakeType, [...(errorGroups.get(mistakeType) ?? []), record]);
  }
  for (const [mistakeType, records] of errorGroups) {
    if (records.length < 2) continue;
    patterns.push(pattern("ERROR_PATTERN", mistakeType, `${mistakeType} errors recur across verified responses.`, confidenceForSample(records.length, 2), records, { mistakeType, reasonCode: "RECURRING_CLASSIFIED_ERROR" }));
  }

  const bySkill = new Map<string, CognitiveEvidenceRecord[]>();
  for (const record of graded) bySkill.set(record.skillId, [...(bySkill.get(record.skillId) ?? []), record]);
  for (const [skillId, records] of bySkill) {
    if (records.length < 6) continue;
    const previous = records.slice(-6, -3);
    const recent = records.slice(-3);
    const previousRate = mean(previous.map((record) => outcomeScore(record)!))!;
    const recentRate = mean(recent.map((record) => outcomeScore(record)!))!;
    const delta = recentRate - previousRate;
    if (delta >= 0.34) {
      patterns.push(pattern("RECENT_BREAKTHROUGH", skillId, "Recent verified performance shows a meaningful breakthrough on this skill.", confidenceForSample(records.length, 6, delta), records.slice(-6), { skillId, previousSuccessRate: round(previousRate), recentSuccessRate: round(recentRate), reasonCode: "ROLLING_SUCCESS_RATE_INCREASE" }));
    } else if (delta <= -0.34) {
      patterns.push(pattern("RECENT_REGRESSION", skillId, "Recent verified performance has regressed on this skill.", confidenceForSample(records.length, 6, Math.abs(delta)), records.slice(-6), { skillId, previousSuccessRate: round(previousRate), recentSuccessRate: round(recentRate), reasonCode: "ROLLING_SUCCESS_RATE_DECREASE" }));
    }
  }

  for (const mastery of input.mastery ?? []) {
    const needsRetentionReview = mastery.retentionAttempts > 0 && mastery.retentionScore < 0.6;
    const recentRegression = patterns.some((candidate) => candidate.patternType === "RECENT_REGRESSION" && candidate.scopeKey === mastery.skillId);
    if (!needsRetentionReview && !recentRegression) continue;
    const records = bySkill.get(mastery.skillId) ?? graded.slice(-1);
    if (records.length === 0) continue;
    patterns.push(pattern("REVIEW_NEED", mastery.skillId, `${mastery.skillName} needs targeted review before advancement.`, confidenceForSample(Math.max(records.length, 2), 2), records, { skillId: mastery.skillId, retentionScore: mastery.retentionScore, retentionAttempts: mastery.retentionAttempts, recentRegression, reasonCode: needsRetentionReview ? "WEAK_RETENTION_EVIDENCE" : "RECENT_REGRESSION" }));
  }

  for (const misconception of input.misconceptions ?? []) {
    if (misconception.probability < 0.55 || misconception.evidenceCount < 2 || misconception.status === "RESOLVED") continue;
    const records = bySkill.get(misconception.skillId) ?? graded.slice(-1);
    if (records.length === 0) continue;
    patterns.push(pattern("RECURRING_MISCONCEPTION", misconception.code, `${misconception.name} remains a recurring misconception hypothesis.`, round(clamp(misconception.probability)), records, { misconceptionCode: misconception.code, skillId: misconception.skillId, probability: misconception.probability, misconceptionEvidenceCount: misconception.evidenceCount, misconceptionEvidenceIds: misconception.sourceEvidenceIds ?? [], reasonCode: "ACTIVE_MISCONCEPTION_HYPOTHESIS" }));
  }

  const frustration = input.frustration;
  if (frustration && frustration.sessionCount >= 3) {
    const rate = frustration.frustratedSessionCount / frustration.sessionCount;
    if (rate >= 0.4) {
      const records = graded.length ? graded : input.evidence;
      if (records.length) {
        const frustrationPattern = pattern("FRUSTRATION_PATTERN", "global", "Frustration is recurring across recent tutoring sessions.", confidenceForSample(frustration.sessionCount, 3, rate), records, { ...frustration, frustrationRate: round(rate), reasonCode: "RECURRING_SESSION_FRUSTRATION" });
        frustrationPattern.firstObservedAt = frustration.firstObservedAt ?? frustrationPattern.firstObservedAt;
        frustrationPattern.lastObservedAt = frustration.lastObservedAt ?? frustrationPattern.lastObservedAt;
        patterns.push(frustrationPattern);
      }
    }
  }

  patterns.sort((left, right) => right.confidence - left.confidence || left.patternType.localeCompare(right.patternType));
  return {
    patterns,
    strategyPerformance,
    summary: {
      modelVersion: "cognitive-v1",
      evidenceCount: input.evidence.length,
      activePatternCount: patterns.length,
      highConfidencePatternCount: patterns.filter((candidate) => candidate.confidence >= 0.7).length,
      strategyCount: strategyPerformance.length,
      topPatternTypes: patterns.slice(0, 5).map((candidate) => candidate.patternType),
      generatedAt: now.toISOString(),
    },
  };
}
