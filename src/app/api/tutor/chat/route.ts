import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_COGNITIVE_MODELS,
  DEMO_MODE,
  DEMO_STUDENTS,
  getDemoTutorResponse,
} from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { recomputeLearnerCognitiveModel } from "@/lib/learning/learner-model";
import { selectTutorTurn, type TutorLearnerState, type TutorTurnDecision } from "@/lib/tutor/orchestration";
import { getLearnerState } from "@/lib/tutor/tools";
import type { TutorResponseMetadata } from "@/lib/ai/tutor-chat";
import type { TutorMessage } from "@/lib/types";
import { recordThinkingCompetencyEvidenceBatch } from "@/lib/learning/competencies";
import { evaluateInterventionsAfterEvidence } from "@/lib/learning/interventions";

function storedTutorMessages(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    if (
      !["learner", "student", "tutor", "system"].includes(String(record.role)) ||
      typeof record.content !== "string" ||
      typeof record.timestamp !== "string"
    ) return [];
    return [{
      role: record.role as TutorMessage["role"],
      content: record.content,
      timestamp: record.timestamp,
    }];
  });
}

function metadataForDecision(
  message: string,
  response: string,
  decision: TutorTurnDecision
): TutorResponseMetadata {
  const normalized = message.toLowerCase();
  const frustrationDetected = [
    "i don't get", "i dont get", "i can't", "i cant", "give up", "too hard", "confused", "lost",
  ].some((signal) => normalized.includes(signal));
  return {
    frustrationDetected,
    encouragement: /great|good thinking|nice work|keep going|you can|okay to feel stuck/i.test(response),
    hintGiven: decision.action === "GIVE_HINT" || /hint|first step|consider/i.test(response),
    action: decision.action,
    strategy: decision.strategy,
    reasonCodes: decision.reasonCodes,
    targetSkillId: decision.targetSkillId,
    prerequisiteSkillId: decision.prerequisiteSkillId,
    orchestrationVersion: "tutor-orchestration-v1",
  };
}

function getDemoLearnerState(studentId?: string): TutorLearnerState {
  const student = DEMO_STUDENTS.find((candidate) => candidate.id === studentId) ?? DEMO_STUDENTS[0];
  const cognitiveModel = DEMO_COGNITIVE_MODELS[student.id as keyof typeof DEMO_COGNITIVE_MODELS];
  const isAlex = student.id === "demo-student-1";
  return {
    learnerId: student.id,
    developmentalStage: student.gradeBand,
    grade: student.grade,
    confidenceLevel: student.confidenceLevel,
    currentFrustration: false,
    targetSkill: isAlex
      ? { skillId: "fractions", slug: "fractions", name: "Adding Fractions", masteryProbability: 0.42, uncertainty: 0.58, status: "DEVELOPING" }
      : { skillId: "two-step-equations", slug: "two-step-equations", name: "Two-Step Equations", masteryProbability: 0.61, uncertainty: 0.39, status: "PRACTICING" },
    prerequisiteBlocker: null,
    activePatterns: cognitiveModel.patterns.map((pattern) => ({
      patternType: pattern.patternType,
      scopeKey: pattern.scopeKey,
      statement: pattern.statement,
      confidence: pattern.confidence,
    })),
    activeMisconceptions: isAlex
      ? [{ code: "FRACTION_COMPONENT_ADDITION", name: "Adds fraction components separately", probability: 0.68, status: "LIKELY" }]
      : [],
    successfulStrategies: cognitiveModel.strategyPerformance.map((strategy) => ({
      strategy: strategy.strategy,
      attempts: strategy.attempts,
      averageOutcomeScore: strategy.averageOutcomeScore,
    })),
    recentEvidence: isAlex
      ? []
      : [
          { skillId: "two-step-equations", outcome: "CORRECT", assistanceLevel: "INDEPENDENT", hintsUsed: 0, instructionalStrategy: "GUIDED_PRACTICE", occurredAt: new Date().toISOString() },
          { skillId: "two-step-equations", outcome: "CORRECT", assistanceLevel: "INDEPENDENT", hintsUsed: 0, instructionalStrategy: "WORKED_EXAMPLE", occurredAt: new Date(Date.now() - 60_000).toISOString() },
        ],
    activeInterventionTypes: [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, sessionId, message, lessonId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const state = getDemoLearnerState(studentId);
      const decision = selectTutorTurn({ message, state });
      const result = getDemoTutorResponse(message);
      return NextResponse.json({
        response: result.response,
        metadata: metadataForDecision(message, result.response, decision),
        sessionId: sessionId || `demo-session-${Date.now()}`,
      });
    }

    // Production
    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (lessonId) {
      const lesson = await prisma.learningModule.findFirst({
        where: { id: lessonId, learnerId: studentId },
        select: { id: true },
      });
      if (!lesson) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }
    }

    // Get or create session
    let session;
    let createdSession = false;
    if (sessionId) {
      session = await prisma.tutoringSession.findFirst({
        where: { id: sessionId, learnerId: studentId },
      });
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }
    if (!session) {
      session = await prisma.tutoringSession.create({
        data: { learnerId: studentId, moduleId: lessonId || null, messages: [] },
      });
      createdSession = true;
    }

    const existingMessages = storedTutorMessages(session.messages);
    const state = await getLearnerState({
      learnerId: studentId,
      moduleId: lessonId,
      sessionId: session.id,
    });
    if (!state) {
      return NextResponse.json({ error: "Learner state not found" }, { status: 404 });
    }
    const decision = selectTutorTurn({ message, state });

    // Try AI tutoring
    let tutorResponse: string;
    let metadata: TutorResponseMetadata;

    try {
      const { tutorChat } = await import("@/lib/ai");
      const context = {
        state,
        decision,
        recentMessages: existingMessages,
      };

      const result = await tutorChat(message, context);
      tutorResponse = result.response;
      metadata = result.metadata;
    } catch {
      // Fallback
      const fallback = getDemoTutorResponse(message);
      tutorResponse = fallback.response;
      metadata = metadataForDecision(message, tutorResponse, decision);
    }

    // Save messages
    const newMessages = [
      ...existingMessages,
      { role: "student", content: message, timestamp: new Date().toISOString() },
      { role: "tutor", content: tutorResponse, timestamp: new Date().toISOString(), metadata },
    ];

    await prisma.tutoringSession.update({
      where: { id: session.id },
      data: {
        messages: JSON.parse(JSON.stringify(newMessages)),
        frustrationDetected: session.frustrationDetected || metadata.frustrationDetected,
      },
    });
    if (decision.strategy === "TEACH_BACK") {
      const occurredAt = new Date();
      await recordThinkingCompetencyEvidenceBatch(["PROOF_EXPLANATION", "REASONING"].map((competencyCode) => ({
        idempotencyKey: `tutor-teach-back:${session.id}:${existingMessages.length}:${competencyCode}`,
        learnerId: studentId,
        competencyCode: competencyCode as "PROOF_EXPLANATION" | "REASONING",
        skillId: decision.targetSkillId ?? undefined,
        outcome: "UNGRADED" as const,
        contextType: "tutor-teach-back",
        sourceType: "tutoring-session",
        sourceId: session.id,
        metadata: { action: decision.action, strategy: decision.strategy, evaluationStatus: "NOT_EVALUATED" },
        occurredAt,
      })));
    }
    if (createdSession || (!session.frustrationDetected && metadata.frustrationDetected)) {
      await recomputeLearnerCognitiveModel(studentId);
    }
    await evaluateInterventionsAfterEvidence({ learnerId: studentId, sourceType: "tutor", sourceId: `${session.id}:${existingMessages.length}` });

    return NextResponse.json({
      response: tutorResponse,
      metadata,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Tutor chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
