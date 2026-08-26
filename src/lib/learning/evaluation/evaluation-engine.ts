import type { EvaluationInput, EvaluationMetric, LearningEvaluationSnapshot, VariantComparison } from "./types";

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function metric(input: Omit<EvaluationMetric, "status"> & { status?: EvaluationMetric["status"] }): EvaluationMetric {
  return { ...input, status: input.status ?? (input.value === null ? "INSUFFICIENT_EVIDENCE" : "MEASURED") };
}

function compareVariants(input: EvaluationInput): VariantComparison[] {
  const variants = new Map<string, string[]>();
  for (const assignment of input.variants) variants.set(assignment.variant, [...(variants.get(assignment.variant) ?? []), assignment.learnerId]);
  return [...variants.entries()].map(([variant, learnerIds]) => {
    const learnerSet = new Set(learnerIds);
    const evidence = input.evidence.filter((item) => learnerSet.has(item.learnerId) && item.outcome !== "UNGRADED");
    const retention = evidence.filter((item) => item.evidenceType === "RETENTION");
    const mastered = input.masteries.filter((item) => learnerSet.has(item.learnerId) && item.status === "MASTERED").length;
    const enough = learnerIds.length >= 3 && evidence.length >= 12;
    return {
      variant,
      learnerCount: learnerIds.length,
      verifiedSuccessRate: enough ? ratio(evidence.filter((item) => item.outcome === "CORRECT").length, evidence.length) : null,
      masteredSkillsPerLearner: enough ? mastered / learnerIds.length : null,
      retentionRate: enough ? ratio(retention.filter((item) => item.outcome === "CORRECT").length, retention.length) : null,
      status: enough ? "MEASURED" as const : "INSUFFICIENT_EVIDENCE" as const,
    };
  }).sort((left, right) => left.variant.localeCompare(right.variant));
}

export function buildLearningEvaluationSnapshot(input: EvaluationInput, now = new Date()): LearningEvaluationSnapshot {
  const graded = input.evidence.filter((item) => item.outcome !== "UNGRADED");
  const retention = graded.filter((item) => item.evidenceType === "RETENTION");
  const transfer = graded.filter((item) => item.evidenceType === "TRANSFER");
  const hinted = graded.filter((item) => item.hintsUsed > 0 || item.assistanceLevel === "HINTED");
  const mastered = input.masteries.filter((item) => item.status === "MASTERED" && item.lastEvidenceAt);
  const prerequisiteClosures = mastered.filter((item) => item.isPrerequisite && item.firstEvidenceAt && item.lastEvidenceAt)
    .map((item) => (item.lastEvidenceAt!.getTime() - item.firstEvidenceAt!.getTime()) / 86_400_000)
    .filter((days) => days >= 0);
  const resolvedMisconceptions = input.misconceptions.filter((item) => item.status === "RESOLVED" || item.resolvedAt);
  const completedInterventions = input.interventions.filter((item) => item.status === "completed");
  const successfulInterventions = completedInterventions.filter((item) => item.outcomeStatuses.includes("ACHIEVED"));
  const returningLearners = input.learners.filter((learner) => new Set(learner.activeDates).size >= 2).length;
  const confidenceChanges = input.learners.flatMap((learner) => {
    const values = graded.filter((item) => item.learnerId === learner.id && item.confidenceRating !== null)
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())
      .map((item) => item.confidenceRating!);
    return values.length >= 2 ? [values.at(-1)! - values[0]] : [];
  });
  const tokenCount = input.aiUsage.reduce((sum, item) => sum + item.inputTokens + item.outputTokens, 0);
  const pricedUsage = input.aiUsage.filter((item) => item.pricingConfigured && item.costMicros !== null);
  const totalCostUsd = pricedUsage.length === input.aiUsage.length && input.aiUsage.length > 0
    ? input.aiUsage.reduce((sum, item) => sum + (item.costMicros ?? 0), 0) / 1_000_000
    : null;
  const sessionCount = input.modules.filter((module) => module.completed).length;
  const learnerWeeks = input.learners.length * Math.max(1, input.periodDays / 7);
  const operationTotal = input.deterministicOperationCount + input.aiOperationCount;

  const metrics = [
    metric({ key: "diagnostic_scoring_accuracy", label: "Diagnostic scoring integrity", value: ratio(input.diagnostics.serverVerifiedCount, input.diagnostics.responseCount), unit: "PERCENT", numerator: input.diagnostics.serverVerifiedCount, denominator: input.diagnostics.responseCount, definition: "Share of diagnostic responses scored from a server-owned answer key." }),
    metric({ key: "questions_to_diagnostic_confidence", label: "Questions to diagnostic confidence", value: average(input.diagnostics.completedQuestionCounts), unit: "COUNT", numerator: input.diagnostics.completedQuestionCounts.reduce((sum, value) => sum + value, 0), denominator: input.diagnostics.completedQuestionCounts.length, definition: "Average accepted responses before the diagnostic stopping rule completed." }),
    metric({ key: "mastery_velocity", label: "Mastery velocity", value: learnerWeeks ? mastered.length / learnerWeeks : null, unit: "COUNT", numerator: mastered.length, denominator: learnerWeeks, definition: "Skills reaching durable mastery per active learner-week in the selected period." }),
    metric({ key: "prerequisite_gap_closure_time", label: "Prerequisite gap closure time", value: average(prerequisiteClosures), unit: "DAYS", numerator: prerequisiteClosures.reduce((sum, value) => sum + value, 0), denominator: prerequisiteClosures.length, definition: "Average observed days from first evidence to durable mastery for prerequisite skills." }),
    metric({ key: "misconception_resolution_rate", label: "Misconception resolution", value: ratio(resolvedMisconceptions.length, input.misconceptions.length), unit: "PERCENT", numerator: resolvedMisconceptions.length, denominator: input.misconceptions.length, definition: "Resolved misconception hypotheses divided by all observed hypotheses in scope." }),
    metric({ key: "retention_rate", label: "Delayed retention", value: ratio(retention.filter((item) => item.outcome === "CORRECT").length, retention.length), unit: "PERCENT", numerator: retention.filter((item) => item.outcome === "CORRECT").length, denominator: retention.length, definition: "Correct delayed retrieval evidence divided by graded retention checks." }),
    metric({ key: "transfer_success_rate", label: "Transfer success", value: ratio(transfer.filter((item) => item.outcome === "CORRECT").length, transfer.length), unit: "PERCENT", numerator: transfer.filter((item) => item.outcome === "CORRECT").length, denominator: transfer.length, definition: "Correct changed-context evidence divided by graded transfer checks." }),
    metric({ key: "hint_dependency", label: "Hint dependency", value: ratio(hinted.length, graded.length), unit: "PERCENT", numerator: hinted.length, denominator: graded.length, definition: "Graded evidence requiring hints divided by all graded evidence." }),
    metric({ key: "confidence_change", label: "Confidence change", value: average(confidenceChanges), unit: "COUNT", numerator: confidenceChanges.reduce((sum, value) => sum + value, 0), denominator: confidenceChanges.length, definition: "Average within-learner change between first and latest reported confidence." }),
    metric({ key: "session_completion", label: "Session completion", value: ratio(input.modules.filter((item) => item.completed).length, input.modules.length), unit: "PERCENT", numerator: input.modules.filter((item) => item.completed).length, denominator: input.modules.length, definition: "Completed learning modules divided by modules started." }),
    metric({ key: "intervention_success", label: "Intervention success", value: ratio(successfulInterventions.length, completedInterventions.length), unit: "PERCENT", numerator: successfulInterventions.length, denominator: completedInterventions.length, definition: "Completed interventions with at least one achieved tracked outcome." }),
    metric({ key: "learner_return_rate", label: "Learner return rate", value: ratio(returningLearners, input.learners.length), unit: "PERCENT", numerator: returningLearners, denominator: input.learners.length, definition: "Learners active on at least two distinct days in the period." }),
    metric({ key: "ai_tokens", label: "AI token usage", value: tokenCount, unit: "TOKENS", numerator: tokenCount, denominator: input.aiUsage.length, definition: "Provider-reported input and output tokens across AI operations." }),
    metric({ key: "ai_cost_per_session", label: "AI cost per completed session", value: totalCostUsd !== null && sessionCount ? totalCostUsd / sessionCount : null, unit: "USD", numerator: totalCostUsd, denominator: sessionCount, status: input.aiUsage.length > 0 && totalCostUsd === null ? "PRICING_NOT_CONFIGURED" : undefined, definition: "Attributed AI cost divided by completed learning modules." }),
    metric({ key: "ai_cost_per_mastery_gain", label: "AI cost per mastery gain", value: totalCostUsd !== null && mastered.length ? totalCostUsd / mastered.length : null, unit: "USD", numerator: totalCostUsd, denominator: mastered.length, status: input.aiUsage.length > 0 && totalCostUsd === null ? "PRICING_NOT_CONFIGURED" : undefined, definition: "Attributed AI cost divided by skills reaching durable mastery." }),
  ];

  return {
    periodDays: input.periodDays,
    metrics,
    variantComparison: compareVariants(input),
    operations: { deterministic: input.deterministicOperationCount, ai: input.aiOperationCount, deterministicShare: ratio(input.deterministicOperationCount, operationTotal) },
    generatedAt: now.toISOString(),
    modelVersion: "learning-evaluation-v1",
  };
}
