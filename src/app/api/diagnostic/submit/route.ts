import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, studentId, responses } = body;

    if (!assessmentId || !studentId || !responses) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const evaluations = responses.map((r: any) => ({
        isCorrect: r.isCorrect,
        mistakeType: r.isCorrect ? null : "conceptual",
        skillAffected: r.skillId,
        explanation: r.isCorrect ? "Great understanding!" : "This suggests a gap. Let's work on it.",
        nextAction: r.isCorrect ? "advance" : "reinforce",
      }));
      return NextResponse.json({ evaluations });
    }

    // Production
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.findUnique({ where: { id: studentId }, include: { profile: true } });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Get or create a default skill for responses that reference non-existent skills
    const mathDomain = await prisma.subjectDomain.findUnique({ where: { slug: "mathematics" } });

    const evaluations: any[] = [];
    for (const response of responses) {
      // Find or create the skill
      let skill = await prisma.learningSkill.findFirst({ where: { slug: response.skillId } });
      if (!skill && mathDomain) {
        skill = await prisma.learningSkill.create({
          data: {
            domainId: mathDomain.id,
            name: response.skillId,
            slug: response.skillId,
            description: `Auto-created: ${response.skillId}`,
            stageMin: "ELEMENTARY",
            stageMax: "HIGH_SCHOOL",
            gradeMin: 0,
            gradeMax: 12,
          },
        });
      }

      if (!skill) continue;

      // Use AI to evaluate if available, otherwise simple check
      let evaluation;
      try {
        const { evaluateResponse } = await import("@/lib/ai");
        evaluation = await evaluateResponse(response, learner.age, learner.developmentalStage);
      } catch {
        evaluation = {
          isCorrect: response.isCorrect,
          mistakeType: response.isCorrect ? null : "conceptual",
          skillAffected: response.skillId,
          explanation: response.isCorrect ? "Correct!" : "Needs practice.",
          nextAction: response.isCorrect ? "advance" : "reinforce",
        };
      }

      await prisma.assessmentResponse.create({
        data: {
          assessmentId,
          learnerId: studentId,
          skillId: skill.id,
          question: response.question || "",
          learnerAnswer: response.studentAnswer || response.learnerAnswer || "",
          correctAnswer: response.correctAnswer || "",
          isCorrect: evaluation.isCorrect,
          timeSpent: response.timeSpent || 0,
          hintsUsed: response.hintsUsed || 0,
          confidenceRating: response.confidenceRating || 5,
          mistakeType: evaluation.mistakeType,
        },
      });

      evaluations.push(evaluation);
    }

    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("Submit diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
