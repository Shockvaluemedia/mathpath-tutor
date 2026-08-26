export type MetricStatus = "MEASURED" | "INSUFFICIENT_EVIDENCE" | "PRICING_NOT_CONFIGURED";

export interface EvaluationMetric {
  key: string;
  label: string;
  value: number | null;
  unit: "PERCENT" | "COUNT" | "DAYS" | "USD" | "TOKENS";
  numerator: number | null;
  denominator: number | null;
  status: MetricStatus;
  definition: string;
}

export interface EvaluationEvidenceRecord {
  learnerId: string;
  evidenceType: string;
  outcome: string;
  assistanceLevel: string;
  hintsUsed: number;
  confidenceRating: number | null;
  occurredAt: Date;
}

export interface EvaluationInput {
  periodDays: number;
  learners: Array<{ id: string; activeDates: string[] }>;
  diagnostics: {
    responseCount: number;
    serverVerifiedCount: number;
    completedQuestionCounts: number[];
  };
  evidence: EvaluationEvidenceRecord[];
  masteries: Array<{
    learnerId: string;
    status: string;
    lastEvidenceAt: Date | null;
    firstEvidenceAt: Date | null;
    isPrerequisite: boolean;
  }>;
  misconceptions: Array<{ status: string; firstObservedAt: Date; resolvedAt: Date | null }>;
  modules: Array<{ learnerId: string; completed: boolean }>;
  interventions: Array<{ status: string; outcomeStatuses: string[] }>;
  aiUsage: Array<{ learnerId: string | null; inputTokens: number; outputTokens: number; costMicros: number | null; pricingConfigured: boolean; success: boolean }>;
  deterministicOperationCount: number;
  aiOperationCount: number;
  variants: Array<{ learnerId: string; variant: string }>;
}

export interface VariantComparison {
  variant: string;
  learnerCount: number;
  verifiedSuccessRate: number | null;
  masteredSkillsPerLearner: number | null;
  retentionRate: number | null;
  status: "MEASURED" | "INSUFFICIENT_EVIDENCE";
}

export interface LearningEvaluationSnapshot {
  periodDays: number;
  metrics: EvaluationMetric[];
  variantComparison: VariantComparison[];
  operations: {
    deterministic: number;
    ai: number;
    deterministicShare: number | null;
  };
  generatedAt: string;
  modelVersion: "learning-evaluation-v1";
}
