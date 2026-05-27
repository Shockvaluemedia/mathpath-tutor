import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_DIAGNOSTIC_QUESTIONS, DEMO_STUDENTS } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, previousResponses } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      // Find student's grade band
      const student = DEMO_STUDENTS.find((s) => s.id === studentId);
      const gradeBand = (student?.gradeBand || "ELEMENTARY") as keyof typeof DEMO_DIAGNOSTIC_QUESTIONS;
      const questions = DEMO_DIAGNOSTIC_QUESTIONS[gradeBand] || DEMO_DIAGNOSTIC_QUESTIONS.ELEMENTARY;

      return NextResponse.json({
        questions,
        assessmentId: `demo-assessment-${Date.now()}`,
      });
    }

    // Production
    const { db: prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");
    const { generateDiagnostic } = await import("@/lib/ai");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const studentProfile = {
      id: student.id,
      name: student.name,
      age: student.age,
      grade: student.grade,
      gradeBand: student.gradeBand,
      confidenceLevel: student.confidenceLevel,
      learningPreferences: student.learningPreferences as unknown as any,
    };

    const questions = await generateDiagnostic(studentProfile, previousResponses);

    if (!previousResponses || previousResponses.length === 0) {
      const assessment = await prisma.assessment.create({
        data: { studentId, assessmentType: "diagnostic" },
      });
      return NextResponse.json({ questions, assessmentId: assessment.id });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Generate diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
