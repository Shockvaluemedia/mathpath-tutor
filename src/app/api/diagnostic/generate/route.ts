import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_DIAGNOSTIC_QUESTIONS, DEMO_STUDENTS } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";

function getGradeBand(grade: number): string {
  if (grade <= 2) return "EARLY_ELEMENTARY";
  if (grade <= 5) return "ELEMENTARY";
  if (grade <= 8) return "MIDDLE_SCHOOL";
  return "HIGH_SCHOOL";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, previousResponses } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const student = DEMO_STUDENTS.find((s) => s.id === studentId);
      const gradeBand = (student?.gradeBand || "ELEMENTARY") as keyof typeof DEMO_DIAGNOSTIC_QUESTIONS;
      const questions = DEMO_DIAGNOSTIC_QUESTIONS[gradeBand] || DEMO_DIAGNOSTIC_QUESTIONS.ELEMENTARY;
      return NextResponse.json({ questions, assessmentId: `demo-assessment-${Date.now()}` });
    }

    // Production
    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      include: { profile: true },
    });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Get the math domain
    const mathDomain = await prisma.subjectDomain.findUnique({ where: { slug: "mathematics" } });
    if (!mathDomain) return NextResponse.json({ error: "Domain not configured" }, { status: 500 });

    const studentProfile = {
      id: learner.id,
      name: learner.name,
      age: learner.age,
      grade: learner.grade,
      gradeBand: getGradeBand(learner.grade),
      confidenceLevel: learner.profile?.confidenceLevel || 5,
      learningPreferences: learner.profile?.preferences as any || {},
    };

    // Use AI to generate questions
    const { generateDiagnostic } = await import("@/lib/ai");
    const questions = await generateDiagnostic(studentProfile, previousResponses);

    // Create assessment record
    if (!previousResponses || previousResponses.length === 0) {
      const assessment = await prisma.assessment.create({
        data: {
          learnerId: studentId,
          domainId: mathDomain.id,
          assessmentType: "diagnostic",
        },
      });
      return NextResponse.json({ questions, assessmentId: assessment.id });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Generate diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
