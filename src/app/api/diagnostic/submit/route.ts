import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, studentId, responses } = body;

    if (!assessmentId || !studentId || !responses) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (DEMO_MODE) {
      // Return mock evaluations
      const evaluations = responses.map((r: any) => ({
        isCorrect: r.isCorrect,
        mistakeType: r.isCorrect ? null : "conceptual",
        skillAffected: r.skillId,
        explanation: r.isCorrect
          ? "Great understanding of this concept!"
          : "This suggests a gap in foundational understanding. Let's work on building this skill.",
        nextAction: r.isCorrect ? "advance" : "reinforce",
      }));
      return NextResponse.json({ evaluations });
    }

    // Production
    const { prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");
    const { evaluateResponse } = await import("@/lib/ai");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const evaluations = [];
    for (const response of responses) {
      const evaluation = await evaluateResponse(response, student.age, student.gradeBand);
      await prisma.assessmentResponse.create({
        data: {
          assessmentId,
          studentId,
          skillId: response.skillId,
          question: response.question,
          studentAnswer: response.studentAnswer,
          correctAnswer: response.correctAnswer,
          isCorrect: evaluation.isCorrect,
          timeSpent: response.timeSpent,
          hintsUsed: response.hintsUsed,
          confidenceRating: response.confidenceRating,
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
