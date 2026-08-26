import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { areMathAnswersEquivalent } from "@/lib/math/validators";
import { persistProblemInstance } from "@/lib/math/problem-generators";
import { generateTransferProblem, type TransferMode } from "@/lib/learning/transfer";
import { recordLearningEvidenceBatchAndUpdateMastery } from "@/lib/learning/mastery";
import { recordThinkingCompetencyEvidenceBatch, type ThinkingCompetencyCode } from "@/lib/learning/competencies";
import { evaluateInterventionsAfterEvidence } from "@/lib/learning/interventions";

const TRANSFER_MODES: TransferMode[] = [
  "DIFFERENT_REPRESENTATION", "WORD_PROBLEM", "UNFAMILIAR_NUMBERS", "MIXED_SKILL",
  "REAL_WORLD_MODELING", "ERROR_ANALYSIS", "REVERSE_PROBLEM", "TEACH_BACK",
];

function isTransferMode(value: string | null): value is TransferMode {
  return TRANSFER_MODES.includes(value as TransferMode);
}

function demoSkill(studentId: string) {
  return studentId === "demo-student-2"
    ? { id: "two-step-equations", slug: "equations", name: "One-Step Equations", difficulty: 4 }
    : { id: "fractions", slug: "fractions", name: "Fractions", difficulty: 3 };
}

function publicTransfer(instance: {
  id: string; prompt: string; difficulty: number; answerType: string; representationType: string;
  transferType: string | null; competencyCodes: string[];
}, gradingMode: "DETERMINISTIC" | "RUBRIC_REQUIRED") {
  return {
    id: instance.id,
    question: instance.prompt,
    difficulty: instance.difficulty,
    answerType: instance.answerType,
    representationType: instance.representationType,
    transferType: instance.transferType,
    competencyCodes: instance.competencyCodes,
    gradingMode,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: learnerId } = await params;
    const requestedMode = request.nextUrl.searchParams.get("mode");
    const mode: TransferMode = isTransferMode(requestedMode) ? requestedMode : "UNFAMILIAR_NUMBERS";
    const seed = randomUUID();
    if (DEMO_MODE) {
      if (!DEMO_STUDENTS.some((student) => student.id === learnerId)) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      const skill = demoSkill(learnerId);
      const problem = generateTransferProblem({ targetSkillId: skill.id, skillSlug: skill.slug, skillName: skill.name, difficulty: skill.difficulty, seed }, mode);
      if (!problem) return NextResponse.json({ error: "No transfer template available" }, { status: 404 });
      return NextResponse.json({ problem: publicTransfer({ ...problem, id: `demo:${mode}:${encodeURIComponent(seed)}` }, problem.gradingMode), evidence: { mode: "demo", persisted: false } });
    }

    const access = await requireRequestLearnerAccess(request, learnerId);
    if (!access.ok) return access.response;
    const mastery = await prisma.learnerSkillMastery.findFirst({
      where: { learnerId, status: { in: ["DEVELOPING", "PRACTICING", "MASTERED"] } },
      include: { skill: true },
      orderBy: [{ transferAttempts: "asc" }, { uncertainty: "desc" }],
    });
    if (!mastery) return NextResponse.json({ error: "No transfer-ready skill found" }, { status: 404 });
    const problem = generateTransferProblem({
      targetSkillId: mastery.skillId,
      skillSlug: mastery.skill.slug,
      skillName: mastery.skill.name,
      difficulty: Math.min(5, Math.max(1, Math.ceil(mastery.skill.difficulty / 2))),
      seed,
    }, mode);
    if (!problem) return NextResponse.json({ error: "No transfer template available" }, { status: 404 });
    const instance = await persistProblemInstance({ learnerId, problem });
    return NextResponse.json({ problem: publicTransfer(instance, problem.gradingMode) });
  } catch (error) {
    console.error("Generate transfer problem error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: learnerId } = await params;
    const body = await request.json();
    if (
      typeof body.problemId !== "string" || body.problemId.length > 300 ||
      typeof body.answer !== "string" || body.answer.length > 2_000 ||
      typeof body.attemptId !== "string" || body.attemptId.length < 1 || body.attemptId.length > 100
    ) {
      return NextResponse.json({ error: "Problem, answer, and attempt ID required" }, { status: 400 });
    }
    if (DEMO_MODE) {
      const match = body.problemId.match(/^demo:([^:]+):(.+)$/);
      const mode = match && isTransferMode(match[1]) ? match[1] : null;
      const skill = demoSkill(learnerId);
      const problem = mode ? generateTransferProblem({
        targetSkillId: skill.id,
        skillSlug: skill.slug,
        skillName: skill.name,
        difficulty: skill.difficulty,
        seed: decodeURIComponent(match![2]),
      }, mode) : null;
      if (!problem) return NextResponse.json({ error: "Transfer problem not found" }, { status: 404 });
      const rubricRequired = problem.gradingMode === "RUBRIC_REQUIRED";
      const correct = rubricRequired ? null : areMathAnswersEquivalent(body.answer, problem.correctAnswer).equivalent;
      return NextResponse.json({
        evaluated: !rubricRequired,
        correct,
        correctAnswer: rubricRequired ? undefined : problem.correctAnswer,
        explanation: problem.explanation,
        evidence: { mode: "demo", persisted: false },
        competencyStates: problem.competencyCodes.map((code) => ({ code, status: "INSUFFICIENT_EVIDENCE", reasonCodes: ["DEMO_ATTEMPT_NOT_PERSISTED"] })),
      });
    }
    const access = await requireRequestLearnerAccess(request, learnerId);
    if (!access.ok) return access.response;
    const instance = await prisma.problemInstance.findFirst({ where: { id: body.problemId, learnerId, transferType: { not: null } } });
    if (!instance) return NextResponse.json({ error: "Transfer problem not found" }, { status: 404 });
    if (instance.answeredAt) return NextResponse.json({ error: "Transfer problem already submitted" }, { status: 409 });
    const rubricRequired = instance.correctAnswer === "RUBRIC_REQUIRED";
    const correct = rubricRequired ? null : areMathAnswersEquivalent(body.answer, instance.correctAnswer).equivalent;
    const outcome = rubricRequired ? "UNGRADED" as const : correct ? "CORRECT" as const : "INCORRECT" as const;
    const now = new Date();
    const masteryResult = await recordLearningEvidenceBatchAndUpdateMastery([{
      idempotencyKey: `transfer:${learnerId}:${body.attemptId}`,
      learnerId,
      skillId: instance.targetSkillId,
      evidenceType: "TRANSFER",
      outcome,
      assistanceLevel: "INDEPENDENT",
      sourceType: "problem-instance",
      sourceId: instance.id,
      learnerAnswer: body.answer,
      correctAnswer: rubricRequired ? undefined : instance.correctAnswer,
      difficulty: instance.difficulty,
      representation: instance.representationType,
      instructionalStrategy: instance.transferType === "TEACH_BACK" ? "TEACH_BACK" : "CHALLENGE",
      metadata: { transferType: instance.transferType, competencyCodes: instance.competencyCodes, gradingMode: rubricRequired ? "RUBRIC_REQUIRED" : "DETERMINISTIC" },
      occurredAt: now,
    }]);
    const competencyResult = await recordThinkingCompetencyEvidenceBatch(instance.competencyCodes.map((code) => ({
      idempotencyKey: `competency:${learnerId}:${body.attemptId}:${code}`,
      learnerId,
      competencyCode: code as ThinkingCompetencyCode,
      skillId: instance.targetSkillId,
      outcome,
      contextType: instance.transferType ?? "TRANSFER",
      sourceType: "problem-instance",
      sourceId: instance.id,
      metadata: { transferType: instance.transferType },
      occurredAt: now,
    })));
    if (masteryResult.insertedEvidenceCount > 0) {
      await prisma.problemInstance.update({ where: { id: instance.id }, data: { answeredAt: now } });
      await evaluateInterventionsAfterEvidence({ learnerId, sourceType: "transfer", sourceId: body.attemptId });
    }
    return NextResponse.json({
      evaluated: !rubricRequired,
      correct,
      correctAnswer: rubricRequired ? undefined : instance.correctAnswer,
      explanation: instance.explanation,
      evidence: { transferInserted: masteryResult.insertedEvidenceCount, competencyInserted: competencyResult.insertedEvidenceCount },
      competencyStates: competencyResult.projections.map((projection) => ({ code: projection.competencyCode, ...projection.state })),
    });
  } catch (error) {
    console.error("Submit transfer problem error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
