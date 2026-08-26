import { prisma } from "@/lib/db";
import { loadSkillGraph } from "../graph";
import { buildAndPersistDailyLearningPath } from "../planning";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function trendNarrative(values: number[], label: string): string {
  if (values.length < 4) return `${label} needs more evidence before a trend is available.`;
  const midpoint = Math.floor(values.length / 2);
  const older = values.slice(0, midpoint);
  const newer = values.slice(midpoint);
  const average = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / items.length;
  return `${label} moved from ${Math.round(average(older) * 100)}% to ${Math.round(average(newer) * 100)}% across ${values.length} recent evidence points.`;
}

export async function buildLearnerIntelligenceSnapshot(learnerId: string) {
  const [learner, mastery, misconception, patterns, strategies, interventions, confidenceResponses, graph, plan] = await Promise.all([
    prisma.learner.findUnique({ where: { id: learnerId }, include: { profile: true } }),
    prisma.learnerSkillMastery.findMany({ where: { learnerId }, include: { skill: true }, orderBy: [{ uncertainty: "desc" }, { masteryProbability: "asc" }] }),
    prisma.learnerMisconception.findFirst({ where: { learnerId, status: { in: ["SUSPECTED", "LIKELY", "CONFIRMED", "RESOLVING"] }, misconception: { isActive: true } }, include: { misconception: true }, orderBy: { probability: "desc" } }),
    prisma.learnerPattern.findMany({ where: { learnerId, status: "ACTIVE" }, orderBy: { confidence: "desc" }, take: 8 }),
    prisma.instructionalStrategyPerformance.findMany({ where: { learnerId, attempts: { gte: 3 } }, orderBy: [{ averageOutcomeScore: "desc" }, { attempts: "desc" }], take: 3 }),
    prisma.intervention.findMany({ where: { learnerId, status: "active" }, select: { type: true, reason: true } }),
    prisma.assessmentResponse.findMany({ where: { learnerId }, orderBy: { createdAt: "asc" }, take: 20, select: { confidenceRating: true } }),
    loadSkillGraph(),
    buildAndPersistDailyLearningPath(learnerId),
  ]);
  if (!learner) return null;
  const target = mastery.find((state) => ["EMERGING", "DEVELOPING", "PRACTICING"].includes(state.status)) ?? mastery[0] ?? null;
  if (!target) return null;
  const masteryEstimates = mastery.map((state) => ({ skillId: state.skillId, masteryProbability: state.masteryProbability }));
  const remediation = graph.findLowestUnresolvedPrerequisite(target.skillId, masteryEstimates);
  const blocker = remediation ? mastery.find((state) => state.skillId === remediation.blockerSkillId) : null;
  const blockerNode = remediation ? graph.getSkill(remediation.blockerSkillId) : null;
  const evidence = await prisma.learningEvidence.findMany({
    where: { learnerId, skillId: target.skillId, outcome: { not: "UNGRADED" } },
    orderBy: { occurredAt: "asc" }, take: 20,
    select: { outcome: true, assistanceLevel: true, evidenceType: true },
  });
  const independent = evidence.filter((item) => item.outcome === "CORRECT" && ["NONE", "INDEPENDENT"].includes(item.assistanceLevel)).length;
  const assisted = evidence.filter((item) => item.outcome === "CORRECT" && !["NONE", "INDEPENDENT"].includes(item.assistanceLevel)).length;
  const recentAccuracy = evidence.map((item) => item.outcome === "CORRECT" ? 1 : 0);
  const bestStrategy = strategies[0];
  const nextItem = plan?.items[0];
  const humanActions = [
    ...(interventions.length ? [`Follow the active ${interventions[0].type.toLowerCase().replaceAll("_", " ")} plan and note whether the learner re-engages.`] : []),
    ...(misconception?.probability && misconception.probability >= 0.55 ? ["Ask the learner to compare two methods aloud; avoid supplying the rule first."] : []),
    ...(target.retentionAttempts > 0 && target.retentionScore < 0.6 ? [`Use one short ${target.skill.name} retrieval check outside the app this week.`] : []),
  ];
  return {
    sample: false,
    currentTarget: target.skill.name,
    currentLearningLevel: `Grade ${learner.grade}; ${target.status.toLowerCase()} on ${target.skill.name}`,
    targetState: `${Math.round(target.masteryProbability * 100)}% mastery estimate with ${Math.round(target.uncertainty * 100)}% uncertainty`,
    blocker: {
      skill: blocker?.skill.name ?? blockerNode?.name ?? "No required blocker identified",
      explanation: blocker || blockerNode
        ? `${blocker?.skill.name ?? blockerNode?.name} is the lowest unresolved prerequisite on the path to ${target.skill.name}.`
        : `Required prerequisites for ${target.skill.name} are currently ready.`,
      masteryProbability: blocker?.masteryProbability ?? target.masteryProbability,
    },
    prerequisiteGaps: remediation?.skillIds ?? [],
    hypothesis: misconception ? { name: misconception.misconception.name, status: misconception.status, probability: misconception.probability, evidenceCount: misconception.evidenceCount } : null,
    adaptation: {
      from: "General practice",
      to: bestStrategy ? bestStrategy.strategy.toLowerCase().replaceAll("_", " ") : nextItem?.type.toLowerCase().replaceAll("_", " ") ?? "evidence gathering",
      reason: bestStrategy
        ? `${bestStrategy.strategy} produced ${percent(bestStrategy.averageOutcomeScore)} verified success across ${bestStrategy.attempts} attempts.`
        : nextItem?.adultExplanation ?? "There is not enough strategy evidence to claim a preferred approach yet.",
    },
    evidence: {
      assistedSuccesses: assisted,
      independentSuccesses: independent,
      retention: target.retentionAttempts ? `${percent(target.retentionScore)} across ${target.retentionAttempts} delayed checks` : "Not tested yet",
      transfer: target.transferAttempts ? `${percent(target.transferScore)} across ${target.transferAttempts} changed contexts` : "Not tested yet",
    },
    masteryTrajectory: trendNarrative(recentAccuracy, "Verified accuracy"),
    confidenceTrajectory: trendNarrative(confidenceResponses.map((response) => response.confidenceRating / 10), "Reported confidence"),
    interventionStatus: interventions.length ? `${interventions.length} active: ${interventions.map((item) => item.type.toLowerCase().replaceAll("_", " ")).join(", ")}` : "No active intervention",
    recommendedHumanActions: humanActions.length ? humanActions : ["Continue the current path and let MathPath collect more independent evidence."],
    nextStep: nextItem?.adultExplanation ?? `Collect another independent ${target.skill.name} observation.`,
    activePatternCount: patterns.length,
  };
}
