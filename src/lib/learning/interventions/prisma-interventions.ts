import { InterventionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { loadSkillGraph } from "../graph";
import { evaluateInterventions } from "./intervention-engine";
import type {
  InterventionDecision,
  InterventionEvaluationInput,
  InterventionOutcomeTarget,
  SystematicInterventionType,
} from "./types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function numericOutcome(
  target: InterventionOutcomeTarget,
  input: InterventionEvaluationInput
): number | null {
  const values: Record<string, number | null> = {
    confidence_rating: input.currentConfidence,
    recent_failure_rate: input.recentEvidenceCount ? input.recentFailureCount / input.recentEvidenceCount : null,
    prerequisite_mastery: input.prerequisiteMastery,
    early_terminated_sessions: input.earlyTerminatedSessions,
    disengagement_events: input.disengagementEvents,
    stuck_session_count: input.stuckSessionCount,
    misconception_probability: input.unresolvedMisconception?.probability ?? null,
  };
  return values[target.metric] ?? null;
}

function outcomeStatus(target: InterventionOutcomeTarget, currentValue: number | null): string {
  if (currentValue === null) return "PENDING";
  return target.direction === "AT_LEAST"
    ? currentValue >= target.targetValue ? "ACHIEVED" : "IN_PROGRESS"
    : currentValue <= target.targetValue ? "ACHIEVED" : "IN_PROGRESS";
}

export async function deriveInterventionEvaluationInput(
  learnerId: string,
  now = new Date()
): Promise<InterventionEvaluationInput | null> {
  const since = new Date(now.getTime() - 14 * 86_400_000);
  const [learner, mastery, evidence, confidenceResponses, sessions, emotionalLogs, misconception, patterns, strategies, activeInterventions, graph] = await Promise.all([
    prisma.learner.findUnique({ where: { id: learnerId }, include: { profile: true } }),
    prisma.learnerSkillMastery.findMany({ where: { learnerId }, include: { skill: true }, orderBy: [{ uncertainty: "desc" }, { masteryProbability: "asc" }] }),
    prisma.learningEvidence.findMany({ where: { learnerId, outcome: { not: "UNGRADED" }, occurredAt: { gte: since } }, orderBy: { occurredAt: "desc" }, take: 30, select: { skillId: true, outcome: true } }),
    prisma.assessmentResponse.findMany({ where: { learnerId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, select: { confidenceRating: true } }),
    prisma.tutoringSession.findMany({ where: { learnerId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, select: { frustrationDetected: true, terminationReason: true } }),
    prisma.emotionalLog.findMany({ where: { learnerId, createdAt: { gte: since }, state: { in: ["FRUSTRATED", "DISENGAGED", "OVERWHELMED"] } }, select: { state: true } }),
    prisma.learnerMisconception.findFirst({ where: { learnerId, status: { in: ["LIKELY", "CONFIRMED", "RESOLVING"] } }, include: { misconception: true }, orderBy: { probability: "desc" } }),
    prisma.learnerPattern.findMany({ where: { learnerId, status: "ACTIVE" }, select: { patternType: true, confidence: true } }),
    prisma.instructionalStrategyPerformance.findMany({ where: { learnerId, attempts: { gt: 0 } }, select: { skillId: true, strategy: true } }),
    prisma.intervention.findMany({ where: { learnerId, status: "active" }, include: { outcomeRecords: { orderBy: { measuredAt: "desc" } } } }),
    loadSkillGraph(),
  ]);
  if (!learner) return null;
  const target = mastery.find((state) => ["EMERGING", "DEVELOPING", "PRACTICING"].includes(state.status)) ?? mastery[0] ?? null;
  const estimates = mastery.map((state) => ({ skillId: state.skillId, masteryProbability: state.masteryProbability }));
  const remediation = target ? graph.findLowestUnresolvedPrerequisite(target.skillId, estimates) : null;
  const prerequisite = remediation ? mastery.find((state) => state.skillId === remediation.blockerSkillId) ?? null : null;
  const prerequisiteNode = remediation ? graph.getSkill(remediation.blockerSkillId) : null;
  const relevantEvidence = target ? evidence.filter((record) => record.skillId === target.skillId).slice(0, 8) : evidence.slice(0, 8);
  const failures = relevantEvidence.filter((record) => record.outcome === "INCORRECT").length;
  const confidence = confidenceResponses.map((response) => response.confidenceRating);
  const currentConfidence = confidence.length ? confidence.slice(0, Math.min(5, confidence.length)).reduce((sum, value) => sum + value, 0) / Math.min(5, confidence.length) : learner.profile?.confidenceLevel ?? 5;
  const priorConfidence = confidence.length >= 6 ? confidence.slice(5).reduce((sum, value) => sum + value, 0) / confidence.slice(5).length : null;
  const misconceptionStrategies = misconception
    ? new Set(strategies.filter((strategy) => strategy.skillId === misconception.misconception.skillId).map((strategy) => strategy.strategy)).size
    : 0;
  const frustrationEvents = emotionalLogs.filter((log) => log.state === "FRUSTRATED" || log.state === "OVERWHELMED").length + sessions.filter((session) => session.frustrationDetected).length;
  const disengagementEvents = emotionalLogs.filter((log) => log.state === "DISENGAGED").length;
  const stuckPattern = patterns.some((pattern) => ["FAILURE_CASCADE_RISK", "FRUSTRATION_PATTERN"].includes(pattern.patternType) && pattern.confidence >= 0.6);
  return {
    learnerId,
    recentFailureCount: failures,
    recentEvidenceCount: relevantEvidence.length,
    currentConfidence,
    previousConfidence: priorConfidence,
    frustrationEvents,
    avoidanceEvents: disengagementEvents,
    disengagementEvents,
    earlyTerminatedSessions: sessions.filter((session) => session.terminationReason === "EARLY_EXIT").length,
    targetSkillId: target?.skillId ?? null,
    targetSkillName: target?.skill.name ?? null,
    targetFailureCount: failures,
    prerequisiteSkillId: prerequisite?.skillId ?? prerequisiteNode?.id ?? null,
    prerequisiteSkillName: prerequisite?.skill.name ?? prerequisiteNode?.name ?? null,
    prerequisiteMastery: prerequisite?.masteryProbability ?? (prerequisiteNode ? 0 : null),
    unresolvedMisconception: misconception ? {
      code: misconception.misconception.code,
      probability: misconception.probability,
      evidenceCount: misconception.evidenceCount,
      strategiesTried: misconceptionStrategies,
      ageDays: Math.max(0, (now.getTime() - misconception.firstObservedAt.getTime()) / 86_400_000),
    } : null,
    stuckSessionCount: stuckPattern ? sessions.filter((session) => session.frustrationDetected).length : 0,
    systemConfidence: target ? Math.max(0, Math.min(1, 1 - target.uncertainty)) : 0.2,
    activeInterventions: activeInterventions.flatMap((active) => {
      if (!["CONFIDENCE_RECOVERY", "REMEDIATION", "PARENT_ENGAGEMENT", "HUMAN_TUTOR_ESCALATION"].includes(active.type)) return [];
      const success = active.outcomeRecords.filter((outcome) => outcome.metric === "success_rate");
      return [{
        type: active.type as SystematicInterventionType,
        daysActive: Math.max(0, (now.getTime() - active.startedAt.getTime()) / 86_400_000),
        baselineSuccessRate: success.at(-1)?.baselineValue ?? null,
        currentSuccessRate: success[0]?.currentValue ?? null,
      }];
    }),
  };
}

export async function evaluateAndPersistInterventions(input: {
  learnerId: string;
  evaluationId: string;
  now?: Date;
}) {
  const evaluationInput = await deriveInterventionEvaluationInput(input.learnerId, input.now);
  if (!evaluationInput) return null;
  const decisions = evaluateInterventions(evaluationInput);
  const persisted: Array<InterventionDecision & { interventionId: string | null }> = [];
  for (const item of decisions) {
    let intervention = await prisma.intervention.findFirst({
      where: { learnerId: input.learnerId, type: item.type as InterventionType, status: "active" },
      orderBy: { startedAt: "desc" },
    });
    if (item.status === "TRIGGERED" && !intervention) {
      intervention = await prisma.intervention.create({
        data: {
          learnerId: input.learnerId,
          type: item.type as InterventionType,
          reason: item.reason,
          plan: toJson({ actions: item.actions, thresholds: item.thresholds, outcomeTargets: item.outcomeTargets, reasonCodes: item.reasonCodes, modelVersion: item.modelVersion }),
          outcomes: toJson({ status: "PENDING", lastEvaluatedAt: (input.now ?? new Date()).toISOString() }),
        },
      });
    }
    const evaluationKey = `${input.evaluationId}:${item.type}`;
    await prisma.interventionDecision.upsert({
      where: { evaluationKey },
      create: { evaluationKey, learnerId: input.learnerId, interventionId: intervention?.id, type: item.type as InterventionType, status: item.status, evidence: toJson(item.evidence), thresholds: toJson(item.thresholds), reason: item.reason, reasonCodes: toJson(item.reasonCodes), actions: toJson(item.actions), systemConfidence: item.systemConfidence, modelVersion: item.modelVersion, evaluatedAt: input.now },
      update: { interventionId: intervention?.id, status: item.status, evidence: toJson(item.evidence), thresholds: toJson(item.thresholds), reason: item.reason, reasonCodes: toJson(item.reasonCodes), actions: toJson(item.actions), systemConfidence: item.systemConfidence, evaluatedAt: input.now },
    });
    if (intervention && item.status === "TRIGGERED") {
      await prisma.interventionOutcome.createMany({
        data: item.outcomeTargets.map((target) => {
          const currentValue = numericOutcome(target, evaluationInput);
          return { interventionId: intervention!.id, metric: target.metric, baselineValue: target.baselineValue, currentValue, targetValue: target.targetValue, status: outcomeStatus(target, currentValue), evidence: toJson({ direction: target.direction, evaluationKey }) };
        }),
      });
    }
    persisted.push({ ...item, interventionId: intervention?.id ?? null });
  }
  return { input: evaluationInput, decisions: persisted };
}

export async function evaluateInterventionsAfterEvidence(input: {
  learnerId: string;
  sourceType: string;
  sourceId: string;
}) {
  try {
    return await evaluateAndPersistInterventions({
      learnerId: input.learnerId,
      evaluationId: `${input.sourceType}:${input.sourceId}`,
    });
  } catch (error) {
    console.error("Intervention evaluation failed:", error);
    return null;
  }
}
