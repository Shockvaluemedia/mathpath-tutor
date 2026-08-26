import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  requireRequestLearnerAccess,
} from "@/lib/auth-middleware";

const DEMO_INTERVENTIONS: Array<Record<string, unknown>> = [
  {
    id: "int-1",
    learnerId: "demo-student-2",
    learnerName: "Maya",
    type: "CONFIDENCE_RECOVERY",
    reason: "Confidence has dropped below threshold (4/10). Multiple frustration events detected in algebra sessions. Engagement pattern declining.",
    status: "active",
    plan: {
      type: "CONFIDENCE_RECOVERY",
      goals: ["Rebuild belief in math ability", "Reduce frustration frequency", "Establish positive momentum"],
      steps: [
        "Start sessions with skills Maya has already mastered to build confidence",
        "Break algebra problems into micro-steps (one operation at a time)",
        "Celebrate every small win explicitly",
        "Reduce session length to 10 minutes to prevent overwhelm",
        "Introduce growth mindset language in tutor interactions",
      ],
      duration: "2 weeks",
      successCriteria: ["Confidence rises to 6+/10", "Frustration events drop by 50%", "Completes 3 consecutive sessions without frustration"],
    },
    startedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    progress: {
      daysActive: 3,
      goalsMetCount: 0,
      totalGoals: 3,
      notes: [
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), note: "Started with multiplication review — Maya completed without frustration", author: "System" },
        { date: new Date(Date.now() - 86400000).toISOString(), note: "Introduced one-step equations with scaffolding. Slight hesitation but no frustration.", author: "System" },
      ],
    },
    latestDecision: {
      status: "TRIGGERED",
      reasonCodes: ["DECLINING_REPORTED_CONFIDENCE", "RECURRING_FRUSTRATION"],
      evidence: { currentConfidence: 4, previousConfidence: 6, frustrationEvents: 3, recentFailureCount: 3 },
      thresholds: { confidenceDecline: -2, frustrationEvents: 2, repeatedFailures: 3 },
      actions: ["Begin with one verified, reachable success.", "Reduce step size and session load.", "Recheck confidence after independent work."],
      systemConfidence: 0.72,
      evaluatedAt: new Date().toISOString(),
    },
    outcomeRecords: [
      { id: "out-1", metric: "confidence_rating", baselineValue: 4, currentValue: 5, targetValue: 6, status: "IN_PROGRESS", measuredAt: new Date().toISOString() },
      { id: "out-2", metric: "frustration_events", baselineValue: 3, currentValue: 1, targetValue: 1, status: "ACHIEVED", measuredAt: new Date().toISOString() },
    ],
  },
  {
    id: "int-2",
    learnerId: "demo-student-1",
    learnerName: "Alex",
    type: "REMEDIATION",
    reason: "Fractions mastery at 28% after 2 weeks of practice. Root cause: weak division foundation preventing fraction understanding.",
    status: "active",
    plan: {
      type: "REMEDIATION",
      goals: ["Strengthen division fluency", "Build visual fraction models", "Connect division to fractions conceptually"],
      steps: [
        "Assess division fluency (target: 80% accuracy on single-digit division)",
        "Use visual models (pizza, chocolate bars) for fraction introduction",
        "Practice equal sharing problems before formal fraction notation",
        "Gradually introduce fraction notation once visual understanding is solid",
        "Daily 5-minute division fact practice",
      ],
      duration: "3 weeks",
      successCriteria: ["Division accuracy reaches 80%", "Fractions mastery reaches 50%", "Can explain what a fraction means in own words"],
    },
    startedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    progress: {
      daysActive: 5,
      goalsMetCount: 1,
      totalGoals: 3,
      notes: [
        { date: new Date(Date.now() - 4 * 86400000).toISOString(), note: "Division assessment: 65% accuracy. Needs more practice.", author: "System" },
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), note: "Division improved to 78%. Almost at target.", author: "System" },
        { date: new Date(Date.now() - 86400000).toISOString(), note: "Division reached 82%! ✓ Goal 1 met. Moving to visual fractions.", author: "System" },
      ],
    },
    latestDecision: {
      status: "TRIGGERED",
      reasonCodes: ["REPEATED_TARGET_FAILURE", "PREREQUISITE_BELOW_READINESS"],
      evidence: { targetFailureCount: 3, prerequisiteMastery: 0.42, prerequisiteSkill: "Fraction Equivalence" },
      thresholds: { targetFailures: 3, prerequisiteMasteryBelow: 0.6 },
      actions: ["Move to the lowest unresolved required prerequisite.", "Collect independent prerequisite evidence before returning to the target.", "Use a discriminating check to confirm the blocker."],
      systemConfidence: 0.68,
      evaluatedAt: new Date().toISOString(),
    },
    outcomeRecords: [
      { id: "out-3", metric: "prerequisite_mastery", baselineValue: 0.42, currentValue: 0.58, targetValue: 0.6, status: "IN_PROGRESS", measuredAt: new Date().toISOString() },
    ],
  },
];

export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ interventions: DEMO_INTERVENTIONS });
  }

  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const staffRoles = new Set([
    "MENTOR",
    "TEACHER",
    "TUTOR",
    "SCHOOL_ADMIN",
    "ORG_ADMIN",
    "FACILITATOR",
  ]);
  const where = auth.user.role === "ADMIN"
    ? {}
    : auth.user.role === "LEARNER"
      ? { learnerId: auth.user.userId }
      : staffRoles.has(auth.user.role)
        ? {
            learner: {
              guardian: {
                memberships: {
                  some: {
                    organization: {
                      memberships: { some: { userId: auth.user.userId } },
                    },
                  },
                },
              },
            },
          }
        : { learner: { guardianUserId: auth.user.userId } };

  const interventions = await prisma.intervention.findMany({
    where,
    include: {
      learner: { select: { id: true, name: true, grade: true, developmentalStage: true } },
      decisions: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      outcomeRecords: { orderBy: { measuredAt: "desc" }, take: 20 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ interventions: interventions.map((intervention) => ({
    ...intervention,
    learnerName: intervention.learner.name,
    latestDecision: intervention.decisions[0] ?? null,
  })) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { learnerId, type, reason, plan } = body;

    if (!learnerId || !type) {
      return NextResponse.json({ error: "Learner ID and type required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const intervention = {
        id: `int-${Date.now()}`,
        learnerId,
        learnerName: "Learner",
        type,
        reason: reason || "Manually created intervention",
        status: "active",
        plan: plan || { goals: [], steps: [], duration: "2 weeks", successCriteria: [] },
        startedAt: new Date().toISOString(),
        progress: { daysActive: 0, goalsMetCount: 0, totalGoals: plan?.goals?.length || 0, notes: [] },
        latestDecision: null,
        outcomeRecords: [],
      };
      DEMO_INTERVENTIONS.push(intervention);
      return NextResponse.json({ intervention });
    }

    const access = await requireRequestLearnerAccess(request, learnerId);
    if (!access.ok) return access.response;

    const intervention = await prisma.intervention.create({
      data: { learnerId, type, reason: reason || "", plan: plan || {}, status: "active" },
    });
    return NextResponse.json({ intervention });
  } catch (error) {
    console.error("Create intervention error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
