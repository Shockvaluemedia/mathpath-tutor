import { NextRequest, NextResponse } from "next/server";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { DEMO_MODE } from "@/lib/demo-data";
import { evaluateInterventions } from "@/lib/learning/interventions/intervention-engine";
import { evaluateAndPersistInterventions } from "@/lib/learning/interventions/prisma-interventions";

function demoEvaluation(learnerId: string) {
  const maya = learnerId === "demo-student-2";
  return evaluateInterventions({
    learnerId, recentFailureCount: maya ? 1 : 3, recentEvidenceCount: 6,
    currentConfidence: maya ? 4 : 5, previousConfidence: maya ? 5 : 6,
    frustrationEvents: maya ? 1 : 2, avoidanceEvents: 0, disengagementEvents: 0,
    earlyTerminatedSessions: 0, targetSkillId: maya ? "equations" : "fractions",
    targetSkillName: maya ? "Two-Step Equations" : "Adding Fractions", targetFailureCount: maya ? 1 : 3,
    prerequisiteSkillId: maya ? "integers" : "equivalence", prerequisiteSkillName: maya ? "Integer Operations" : "Fraction Equivalence",
    prerequisiteMastery: maya ? 0.58 : 0.42,
    unresolvedMisconception: maya ? null : { code: "FRACTION_COMPONENT_ADDITION", probability: 0.68, evidenceCount: 3, strategiesTried: 2, ageDays: 8 },
    stuckSessionCount: maya ? 1 : 2, systemConfidence: maya ? 0.61 : 0.42, activeInterventions: [],
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (DEMO_MODE) return NextResponse.json({ sample: true, decisions: demoEvaluation(id) });
  const access = await requireRequestLearnerAccess(request, id);
  if (!access.ok) return access.response;
  const { prisma } = await import("@/lib/db");
  const decisions = await prisma.interventionDecision.findMany({ where: { learnerId: id }, orderBy: { evaluatedAt: "desc" }, take: 20 });
  return NextResponse.json({ sample: false, decisions });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (DEMO_MODE) return NextResponse.json({ sample: true, decisions: demoEvaluation(id) });
  const access = await requireRequestLearnerAccess(request, id);
  if (!access.ok) return access.response;
  const evaluation = await evaluateAndPersistInterventions({ learnerId: id, evaluationId: `manual:${id}:${new Date().toISOString()}` });
  if (!evaluation) return NextResponse.json({ error: "Learner not found" }, { status: 404 });
  return NextResponse.json({ sample: false, ...evaluation });
}
