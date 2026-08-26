import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { DEMO_DIAGNOSTIC_QUESTIONS, DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import {
  DEFAULT_DIAGNOSTIC_STOPPING_RULES,
  selectNextDiagnosticAction,
  type DiagnosticNextAction,
  type DiagnosticResponseHistoryItem,
  type DiagnosticSkillCandidate,
} from "@/lib/learning/diagnostics";
import {
  buildAssessmentQuestionBank,
  mergeAssessmentQuestionBank,
  metadataWithQuestionBank,
  normalizeDiagnosticQuestions,
  readAssessmentQuestionBank,
  restoreSecuredDiagnosticQuestion,
  stripDiagnosticAnswerKeys,
  type SecuredDiagnosticQuestion,
} from "@/lib/learning/diagnostics/question-bank";
import { loadSkillGraph } from "@/lib/learning/graph";
import { isSprintEvidencePhase } from "@/lib/sprint-evidence";
import { getOrCreateActiveSprintEnrollment, recordSprintEvent } from "@/lib/sprint-events";
import { generateProblem } from "@/lib/math/problem-generators";

function getGradeBand(grade: number): string {
  if (grade <= 2) return "EARLY_ELEMENTARY";
  if (grade <= 5) return "ELEMENTARY";
  if (grade <= 8) return "MIDDLE_SCHOOL";
  return "HIGH_SCHOOL";
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function decisionHistory(metadata: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(metadata.diagnosticDecisions)
    ? metadata.diagnosticDecisions.filter(
        (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
      )
    : [];
}

function publicDecision(decision: DiagnosticNextAction) {
  return {
    action: decision.action,
    direction: decision.direction,
    reasonCodes: decision.reasonCodes,
    stopDecision: decision.stopDecision,
    ...(decision.action === "ASK" ? {
      selectedSkill: { skillId: decision.selectedSkill.slug, skillName: decision.selectedSkill.name },
      targetDifficulty: decision.targetDifficulty,
    } : {}),
  };
}

function auditableDecision(decision: DiagnosticNextAction, sequence: number) {
  return {
    sequence,
    recordedAt: new Date().toISOString(),
    action: decision.action,
    direction: decision.direction,
    reasonCodes: decision.reasonCodes,
    stopDecision: decision.stopDecision,
    candidateScores: decision.candidateScores,
    ...(decision.action === "ASK" ? {
      selectedSkillId: decision.selectedSkill.skillId,
      selectedSkillSlug: decision.selectedSkill.slug,
      targetDifficulty: decision.targetDifficulty,
    } : {}),
    modelVersion: "adaptive-diagnostic-v1",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, assessmentId } = body;
    const phase = isSprintEvidencePhase(body.phase) ? body.phase : "baseline";
    if (!studentId) return NextResponse.json({ error: "Student ID required" }, { status: 400 });

    if (DEMO_MODE) {
      const student = DEMO_STUDENTS.find((candidate) => candidate.id === studentId);
      const gradeBand = (student?.gradeBand || "ELEMENTARY") as keyof typeof DEMO_DIAGNOSTIC_QUESTIONS;
      const questions = DEMO_DIAGNOSTIC_QUESTIONS[gradeBand] || DEMO_DIAGNOSTIC_QUESTIONS.ELEMENTARY;
      return NextResponse.json({
        questions: stripDiagnosticAnswerKeys(questions as SecuredDiagnosticQuestion[]),
        assessmentId: `demo-assessment-${phase}-${Date.now()}`,
        phase,
        diagnosticDecision: {
          action: "ASK",
          direction: "START",
          reasonCodes: ["DEMO_FIXTURE"],
          stopDecision: { shouldStop: false, reason: null, questionCount: 0, coveredSkillCount: 0, meanUncertainty: 1, estimatedProgress: 0 },
        },
      });
    }

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;
    const learner = await prisma.learner.findUnique({ where: { id: studentId }, include: { profile: true } });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const existingAssessment = typeof assessmentId === "string"
      ? await prisma.assessment.findFirst({
          where: { id: assessmentId, learnerId: studentId },
          select: { id: true, assessmentType: true, metadata: true, completedAt: true, startedAt: true },
        })
      : null;
    if (assessmentId && !existingAssessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    if (existingAssessment?.completedAt) return NextResponse.json({ error: "Assessment is already complete" }, { status: 409 });
    const existingMetadata = asMetadata(existingAssessment?.metadata);
    if (existingMetadata.sprintPhase && existingMetadata.sprintPhase !== phase) {
      return NextResponse.json({ error: "Assessment phase does not match this request" }, { status: 409 });
    }

    const mathDomain = await prisma.subjectDomain.findUnique({ where: { slug: "mathematics" } });
    if (!mathDomain) return NextResponse.json({ error: "Domain not configured" }, { status: 500 });
    const enrollment = await getOrCreateActiveSprintEnrollment(studentId);
    const baselineSnapshots = phase === "endline"
      ? await prisma.sprintSkillSnapshot.findMany({ where: { enrollmentId: enrollment.id, phase: "baseline" }, orderBy: { score: "asc" } })
      : [];
    if (phase === "endline" && baselineSnapshots.length === 0) {
      return NextResponse.json({ error: "Complete the sprint baseline before starting the endline check" }, { status: 409 });
    }
    if (phase === "endline") {
      const [completedLessons, tutorSessions] = await Promise.all([
        prisma.learningModule.count({ where: { learnerId: studentId, completedAt: { gte: enrollment.startedAt } } }),
        prisma.tutoringSession.count({ where: { learnerId: studentId, createdAt: { gte: enrollment.startedAt } } }),
      ]);
      if (completedLessons + tutorSessions < 10) {
        return NextResponse.json({ error: "Complete 10 sprint sessions before starting the endline check" }, { status: 409 });
      }
    }

    const storedResponses = existingAssessment
      ? await prisma.assessmentResponse.findMany({
          where: { assessmentId: existingAssessment.id, verificationMethod: "SERVER_ANSWER_KEY" },
          orderBy: { createdAt: "asc" },
          select: { questionId: true, skillId: true, isCorrect: true, hintsUsed: true, confidenceRating: true, createdAt: true },
        })
      : [];
    const questionBank = readAssessmentQuestionBank(existingMetadata);
    const answeredQuestionIds = new Set(storedResponses.flatMap((response) => response.questionId ? [response.questionId] : []));
    const unansweredQuestion = questionBank.find((question) => !answeredQuestionIds.has(question.id));
    if (existingAssessment && unansweredQuestion) {
      return NextResponse.json({
        questions: stripDiagnosticAnswerKeys([restoreSecuredDiagnosticQuestion(unansweredQuestion)]),
        assessmentId: existingAssessment.id,
        phase,
        diagnosticDecision: decisionHistory(existingMetadata).at(-1) ?? {
          action: "ASK",
          stopDecision: { shouldStop: false, questionCount: storedResponses.length, estimatedProgress: 0 },
        },
        reServed: true,
      });
    }

    const [skills, masteryRows, misconceptionRows, graph] = await Promise.all([
      prisma.learningSkill.findMany({
        where: { domainId: mathDomain.id },
        select: { id: true, slug: true, name: true, gradeMin: true, gradeMax: true, difficulty: true },
      }),
      prisma.learnerSkillMastery.findMany({
        where: { learnerId: studentId, skill: { domainId: mathDomain.id } },
        select: { skillId: true, masteryProbability: true, uncertainty: true, evidenceCount: true },
      }),
      prisma.learnerMisconception.findMany({
        where: {
          learnerId: studentId,
          status: { in: ["SUSPECTED", "LIKELY", "CONFIRMED", "RESOLVING"] },
          misconception: { isActive: true, skill: { domainId: mathDomain.id } },
        },
        select: { probability: true, misconception: { select: { skillId: true } } },
      }),
      loadSkillGraph(mathDomain.id),
    ]);
    const masteryBySkill = new Map(masteryRows.map((row) => [row.skillId, row]));
    const misconceptionBySkill = new Map<string, number>();
    for (const row of misconceptionRows) {
      misconceptionBySkill.set(row.misconception.skillId, Math.max(misconceptionBySkill.get(row.misconception.skillId) ?? 0, row.probability));
    }
    const candidates: DiagnosticSkillCandidate[] = skills.map((skill) => {
      const mastery = masteryBySkill.get(skill.id);
      return {
        skillId: skill.id,
        slug: skill.slug,
        name: skill.name,
        gradeMin: skill.gradeMin,
        gradeMax: skill.gradeMax,
        difficulty: skill.difficulty,
        masteryProbability: mastery?.masteryProbability ?? 0.5,
        uncertainty: mastery?.uncertainty ?? 1,
        evidenceCount: mastery?.evidenceCount ?? 0,
        misconceptionProbability: misconceptionBySkill.get(skill.id) ?? 0,
      };
    });
    const questionsById = new Map(questionBank.map((question) => [question.id, question]));
    const history: DiagnosticResponseHistoryItem[] = storedResponses.flatMap((response) => response.questionId ? [{
      questionId: response.questionId,
      skillId: response.skillId,
      isCorrect: response.isCorrect,
      difficulty: questionsById.get(response.questionId)?.difficulty ?? 3,
      hintsUsed: response.hintsUsed,
      confidenceRating: response.confidenceRating,
      occurredAt: response.createdAt,
    }] : []);
    const focusSkillIds = phase === "endline"
      ? baselineSnapshots.map((snapshot) => snapshot.skillId).filter((id) => skills.some((skill) => skill.id === id))
      : undefined;
    const decision = selectNextDiagnosticAction({
      graph,
      candidates,
      history,
      grade: learner.grade,
      startedAt: existingAssessment?.startedAt,
      focusSkillIds,
    });
    const priorDecisions = decisionHistory(existingMetadata);
    const lastSequence = priorDecisions.at(-1)?.sequence;
    const nextSequence = typeof lastSequence === "number" ? lastSequence + 1 : priorDecisions.length + 1;
    const nextDecisions = [...priorDecisions, auditableDecision(decision, nextSequence)].slice(-50);

    if (decision.action === "STOP") {
      if (!existingAssessment) return NextResponse.json({ error: "No eligible diagnostic skills are configured" }, { status: 503 });
      await prisma.assessment.update({
        where: { id: existingAssessment.id },
        data: { metadata: toInputJson({
          ...existingMetadata,
          diagnosticDecisions: nextDecisions,
          diagnosticStatus: "READY_TO_COMPLETE",
          adaptiveModelVersion: "adaptive-diagnostic-v1",
        }) },
      });
      return NextResponse.json({ questions: [], assessmentId: existingAssessment.id, phase, diagnosticDecision: publicDecision(decision) });
    }

    const generationSeed = randomUUID();
    const parameterizedProblem = generateProblem({
      targetSkillId: decision.selectedSkill.slug,
      skillSlug: decision.selectedSkill.slug,
      skillName: decision.selectedSkill.name,
      difficulty: decision.targetDifficulty,
      seed: generationSeed,
    });
    let generatedQuestions: unknown[];
    if (parameterizedProblem) {
      generatedQuestions = [{
        id: `${parameterizedProblem.templateCode}:${generationSeed}`,
        skillId: decision.selectedSkill.slug,
        skillName: decision.selectedSkill.name,
        question: parameterizedProblem.prompt,
        correctAnswer: parameterizedProblem.correctAnswer,
        difficulty: parameterizedProblem.difficulty,
        hints: [],
        answerType: parameterizedProblem.answerType,
      }];
    } else {
      const { generateDiagnostic } = await import("@/lib/ai");
      generatedQuestions = await generateDiagnostic({
        id: learner.id,
        name: learner.name,
        age: learner.age,
        grade: learner.grade,
        gradeBand: getGradeBand(learner.grade),
        confidenceLevel: learner.profile?.confidenceLevel || 5,
        learningPreferences: learner.profile?.preferences || {},
      }, undefined, {
        purpose: phase,
        questionCount: 1,
        selection: {
          skillId: decision.selectedSkill.slug,
          skillName: decision.selectedSkill.name,
          targetDifficulty: decision.targetDifficulty,
          direction: decision.direction,
          reasonCodes: decision.reasonCodes,
        },
      });
    }
    const normalized = normalizeDiagnosticQuestions(
      generatedQuestions.slice(0, 1).map((question) => ({
        ...(question && typeof question === "object" ? question : {}),
        skillId: decision.selectedSkill.slug,
        skillName: decision.selectedSkill.name,
        difficulty: decision.targetDifficulty,
      })),
      randomUUID()
    );
    if (normalized.length === 0) {
      return NextResponse.json({ error: "The diagnostic generator returned no verifiable question" }, { status: 502 });
    }
    const incomingQuestionBank = buildAssessmentQuestionBank(normalized);
    const adaptiveMetadata = {
      sprintEnrollmentId: enrollment.id,
      sprintPhase: phase,
      stoppingRules: DEFAULT_DIAGNOSTIC_STOPPING_RULES,
      diagnosticDecisions: nextDecisions,
      diagnosticStatus: "ACTIVE",
      adaptiveModelVersion: "adaptive-diagnostic-v1",
      problemGeneration: parameterizedProblem ? {
        mode: "DETERMINISTIC_TEMPLATE",
        templateCode: parameterizedProblem.templateCode,
        generatorVersion: parameterizedProblem.generatorVersion,
      } : {
        mode: "AI_FALLBACK",
      },
    };

    if (!existingAssessment) {
      const assessment = await prisma.assessment.create({
        data: {
          learnerId: studentId,
          domainId: mathDomain.id,
          assessmentType: phase === "endline" ? "sprint-endline" : "diagnostic",
          metadata: toInputJson(metadataWithQuestionBank(adaptiveMetadata, incomingQuestionBank)),
        },
      });
      await recordSprintEvent({
        enrollmentId: enrollment.id,
        name: phase === "endline" ? "endline_started" : "diagnostic_started",
        idempotencyKey: `${enrollment.id}:${phase}_started:${assessment.id}`,
        metadata: { assessmentId: assessment.id },
      });
      return NextResponse.json({
        questions: stripDiagnosticAnswerKeys(normalized),
        assessmentId: assessment.id,
        phase,
        diagnosticDecision: publicDecision(decision),
      });
    }

    const mergedQuestionBank = mergeAssessmentQuestionBank(questionBank, incomingQuestionBank);
    await prisma.assessment.update({
      where: { id: existingAssessment.id },
      data: { metadata: toInputJson(metadataWithQuestionBank({ ...existingMetadata, ...adaptiveMetadata }, mergedQuestionBank)) },
    });
    return NextResponse.json({
      questions: stripDiagnosticAnswerKeys(normalized),
      assessmentId: existingAssessment.id,
      phase,
      diagnosticDecision: publicDecision(decision),
    });
  } catch (error) {
    console.error("Generate diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
