import { prisma } from "@/lib/db";
import { buildLearningEvaluationSnapshot } from "./evaluation-engine";
import type { EvaluationInput, LearningEvaluationSnapshot } from "./types";

export interface OperatorDecisionItem {
  id: string;
  learnerName: string;
  type: string;
  reason: string;
  reasonCodes: string[];
  actions: string[];
  evaluatedAt: string;
}

export interface OperatorLearningSystemSnapshot {
  sample: boolean;
  overview: {
    diagnosticCompletions: number;
    learnerActivations: number;
    skillsMastered: number;
    prerequisiteGaps: number;
    unresolvedMisconceptions: number;
    confidenceRiskLearners: number;
    retentionFailures: number;
    interventionTriggers: number;
    tutorEscalations: number;
  };
  evaluation: LearningEvaluationSnapshot;
  decisionQueue: OperatorDecisionItem[];
  aiByOperation: Array<{ operationType: string; calls: number; tokens: number; costUsd: number | null; successRate: number }>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function buildOperatorLearningSystemSnapshot(periodDays = 14): Promise<OperatorLearningSystemSnapshot> {
  const now = new Date();
  const since = new Date(now.getTime() - periodDays * 86_400_000);
  const [learners, assessments, evidence, masteries, misconceptions, modules, sessions, interventions, usage, deterministicProblems, dailyPaths, decisions, assignments, dependencies] = await Promise.all([
    prisma.learner.findMany({ select: { id: true, name: true, profile: { select: { confidenceLevel: true } } } }),
    prisma.assessment.findMany({ where: { startedAt: { gte: since } }, include: { responses: { select: { verificationMethod: true } } } }),
    prisma.learningEvidence.findMany({ where: { occurredAt: { gte: since } }, select: { learnerId: true, skillId: true, evidenceType: true, outcome: true, assistanceLevel: true, hintsUsed: true, confidenceRating: true, occurredAt: true } }),
    prisma.learnerSkillMastery.findMany({ select: { learnerId: true, skillId: true, status: true, masteryProbability: true, lastEvidenceAt: true } }),
    prisma.learnerMisconception.findMany({ select: { status: true, firstObservedAt: true, resolvedAt: true } }),
    prisma.learningModule.findMany({ where: { createdAt: { gte: since } }, select: { learnerId: true, completedAt: true, createdAt: true } }),
    prisma.tutoringSession.findMany({ where: { createdAt: { gte: since } }, select: { learnerId: true, createdAt: true } }),
    prisma.intervention.findMany({ where: { OR: [{ startedAt: { gte: since } }, { completedAt: { gte: since } }] }, select: { status: true, type: true, outcomeRecords: { select: { status: true } } } }),
    prisma.aIUsageEvent.findMany({ where: { occurredAt: { gte: since } }, select: { learnerId: true, operationType: true, inputTokens: true, outputTokens: true, costMicros: true, pricingConfigured: true, success: true } }),
    prisma.problemInstance.count({ where: { createdAt: { gte: since } } }),
    prisma.dailyLearningPath.count({ where: { createdAt: { gte: since } } }),
    prisma.interventionDecision.findMany({ where: { evaluatedAt: { gte: since }, status: "TRIGGERED" }, include: { learner: { select: { name: true } } }, orderBy: { evaluatedAt: "desc" }, take: 20 }),
    prisma.learningExperimentAssignment.findMany({ where: { experimentKey: "daily-path-v1" }, select: { learnerId: true, variant: true } }),
    prisma.skillDependency.findMany({ where: { dependencyType: "REQUIRED" }, select: { prerequisiteSkillId: true, minimumMasteryRequired: true } }),
  ]);

  const diagnosticAssessments = assessments.filter((assessment) => assessment.assessmentType.toLowerCase().includes("diagnostic"));
  const firstEvidence = new Map<string, Date>();
  for (const item of evidence) {
    const key = `${item.learnerId}:${item.skillId}`;
    const current = firstEvidence.get(key);
    if (!current || item.occurredAt < current) firstEvidence.set(key, item.occurredAt);
  }
  const prerequisiteThresholds = new Map(dependencies.map((dependency) => [dependency.prerequisiteSkillId, dependency.minimumMasteryRequired]));
  const activeDates = new Map<string, Set<string>>();
  const addActivity = (learnerId: string, date: Date) => {
    const dates = activeDates.get(learnerId) ?? new Set<string>();
    dates.add(date.toISOString().slice(0, 10));
    activeDates.set(learnerId, dates);
  };
  evidence.forEach((item) => addActivity(item.learnerId, item.occurredAt));
  modules.forEach((item) => addActivity(item.learnerId, item.createdAt));
  sessions.forEach((item) => addActivity(item.learnerId, item.createdAt));

  const evaluationInput: EvaluationInput = {
    periodDays,
    learners: learners.map((learner) => ({ id: learner.id, activeDates: [...(activeDates.get(learner.id) ?? [])] })),
    diagnostics: {
      responseCount: diagnosticAssessments.reduce((sum, assessment) => sum + assessment.responses.length, 0),
      serverVerifiedCount: diagnosticAssessments.reduce((sum, assessment) => sum + assessment.responses.filter((response) => response.verificationMethod === "SERVER_ANSWER_KEY").length, 0),
      completedQuestionCounts: diagnosticAssessments.filter((assessment) => assessment.completedAt).map((assessment) => assessment.responses.length),
    },
    evidence: evidence.map((item) => ({ learnerId: item.learnerId, evidenceType: item.evidenceType, outcome: item.outcome, assistanceLevel: item.assistanceLevel, hintsUsed: item.hintsUsed, confidenceRating: item.confidenceRating, occurredAt: item.occurredAt })),
    masteries: masteries.filter((mastery) => mastery.lastEvidenceAt && mastery.lastEvidenceAt >= since).map((mastery) => ({ learnerId: mastery.learnerId, status: mastery.status, lastEvidenceAt: mastery.lastEvidenceAt, firstEvidenceAt: firstEvidence.get(`${mastery.learnerId}:${mastery.skillId}`) ?? null, isPrerequisite: prerequisiteThresholds.has(mastery.skillId) })),
    misconceptions,
    modules: modules.map((module) => ({ learnerId: module.learnerId, completed: Boolean(module.completedAt) })),
    interventions: interventions.map((intervention) => ({ status: intervention.status, outcomeStatuses: intervention.outcomeRecords.map((outcome) => outcome.status) })),
    aiUsage: usage.map((item) => ({ learnerId: item.learnerId, inputTokens: item.inputTokens, outputTokens: item.outputTokens, costMicros: item.costMicros, pricingConfigured: item.pricingConfigured, success: item.success })),
    deterministicOperationCount: deterministicProblems + dailyPaths + decisions.length,
    aiOperationCount: usage.length,
    variants: assignments,
  };
  const evaluation = buildLearningEvaluationSnapshot(evaluationInput, now);
  const masteryByKey = new Map(masteries.map((mastery) => [`${mastery.learnerId}:${mastery.skillId}`, mastery]));
  const prerequisiteGaps = learners.reduce((total, learner) => total + dependencies.filter((dependency) => {
    const mastery = masteryByKey.get(`${learner.id}:${dependency.prerequisiteSkillId}`);
    return !mastery || mastery.masteryProbability < dependency.minimumMasteryRequired;
  }).length, 0);
  const usageByOperation = new Map<string, typeof usage>();
  for (const item of usage) usageByOperation.set(item.operationType, [...(usageByOperation.get(item.operationType) ?? []), item]);
  const aiByOperation = [...usageByOperation.entries()].map(([operationType, records]) => {
    const fullyPriced = records.every((record) => record.pricingConfigured && record.costMicros !== null);
    return {
      operationType,
      calls: records.length,
      tokens: records.reduce((sum, record) => sum + record.inputTokens + record.outputTokens, 0),
      costUsd: fullyPriced ? records.reduce((sum, record) => sum + (record.costMicros ?? 0), 0) / 1_000_000 : null,
      successRate: records.filter((record) => record.success).length / records.length,
    };
  }).sort((left, right) => right.tokens - left.tokens);

  return {
    sample: false,
    overview: {
      diagnosticCompletions: diagnosticAssessments.filter((assessment) => assessment.completedAt).length,
      learnerActivations: activeDates.size,
      skillsMastered: masteries.filter((mastery) => mastery.status === "MASTERED").length,
      prerequisiteGaps,
      unresolvedMisconceptions: misconceptions.filter((item) => item.status !== "RESOLVED").length,
      confidenceRiskLearners: learners.filter((learner) => (learner.profile?.confidenceLevel ?? 5) <= 3).length,
      retentionFailures: evidence.filter((item) => item.evidenceType === "RETENTION" && item.outcome === "INCORRECT").length,
      interventionTriggers: decisions.length,
      tutorEscalations: interventions.filter((item) => item.type === "HUMAN_TUTOR_ESCALATION" && item.status === "active").length,
    },
    evaluation,
    decisionQueue: decisions.map((decision) => ({ id: decision.id, learnerName: decision.learner.name, type: decision.type, reason: decision.reason, reasonCodes: stringArray(decision.reasonCodes), actions: stringArray(decision.actions), evaluatedAt: decision.evaluatedAt.toISOString() })),
    aiByOperation,
  };
}

export function buildDemoOperatorLearningSystemSnapshot(): OperatorLearningSystemSnapshot {
  const now = new Date("2026-08-25T12:00:00.000Z");
  const learnerIds = ["a1", "a2", "a3", "l1", "l2", "l3"];
  const evidence = learnerIds.flatMap((learnerId, index) => {
    const adaptive = index < 3;
    return [0, 1, 2, 3].map((item) => ({ learnerId, evidenceType: item === 1 ? "RETENTION" : item === 2 ? "TRANSFER" : "PRACTICE", outcome: adaptive || item < 2 ? "CORRECT" : "INCORRECT", assistanceLevel: item === 3 ? "HINTED" : "INDEPENDENT", hintsUsed: item === 3 ? 1 : 0, confidenceRating: adaptive ? 6 : 5, occurredAt: new Date(now.getTime() - item * 86_400_000) }));
  });
  const evaluation = buildLearningEvaluationSnapshot({
    periodDays: 14,
    learners: learnerIds.map((id) => ({ id, activeDates: ["2026-08-20", "2026-08-24"] })),
    diagnostics: { responseCount: 30, serverVerifiedCount: 30, completedQuestionCounts: [5, 5, 6, 6, 7, 6] },
    evidence,
    masteries: learnerIds.map((learnerId, index) => ({ learnerId, status: index < 4 ? "MASTERED" : "DEVELOPING", lastEvidenceAt: now, firstEvidenceAt: new Date(now.getTime() - (index + 4) * 86_400_000), isPrerequisite: true })),
    misconceptions: [{ status: "RESOLVED", firstObservedAt: new Date(now.getTime() - 8 * 86_400_000), resolvedAt: now }, { status: "LIKELY", firstObservedAt: new Date(now.getTime() - 4 * 86_400_000), resolvedAt: null }],
    modules: learnerIds.map((learnerId, index) => ({ learnerId, completed: index !== 5 })),
    interventions: [{ status: "completed", outcomeStatuses: ["ACHIEVED"] }, { status: "active", outcomeStatuses: ["IN_PROGRESS"] }],
    aiUsage: [{ learnerId: "a1", inputTokens: 8200, outputTokens: 3100, costMicros: 18400, pricingConfigured: true, success: true }],
    deterministicOperationCount: 64,
    aiOperationCount: 11,
    variants: learnerIds.map((learnerId, index) => ({ learnerId, variant: index < 3 ? "ADAPTIVE" : "LINEAR" })),
  }, now);
  return {
    sample: true,
    overview: { diagnosticCompletions: 6, learnerActivations: 6, skillsMastered: 4, prerequisiteGaps: 3, unresolvedMisconceptions: 1, confidenceRiskLearners: 1, retentionFailures: 1, interventionTriggers: 2, tutorEscalations: 0 },
    evaluation,
    decisionQueue: [{ id: "decision-demo-1", learnerName: "Alex", type: "REMEDIATION", reason: "Fraction equivalence remains below readiness after repeated target failures.", reasonCodes: ["REPEATED_TARGET_FAILURE", "PREREQUISITE_BELOW_READINESS"], actions: ["Move to fraction equivalence.", "Collect independent evidence before returning."], evaluatedAt: now.toISOString() }],
    aiByOperation: [{ operationType: "TUTOR_CHAT", calls: 11, tokens: 11300, costUsd: 0.0184, successRate: 1 }],
  };
}
