import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assessmentId, studentId } = body;

    if (!assessmentId || !studentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const student = DEMO_STUDENTS.find((s) => s.id === studentId);
      const grade = student?.grade || 5;

      // Return a demo skill profile
      const skillProfile = {
        estimatedLevel: `Grade ${grade} level with some gaps in foundational skills`,
        gradeLevelComparison: "Slightly below grade level in some areas, on track in others",
        masteredSkills: [
          { id: "s1", name: "Addition", domain: "Operations", masteryScore: 95, confidenceScore: 90, status: "MASTERED" },
          { id: "s2", name: "Subtraction", domain: "Operations", masteryScore: 88, confidenceScore: 85, status: "MASTERED" },
        ],
        developingSkills: [
          { id: "s3", name: "Multiplication", domain: "Operations", masteryScore: 65, confidenceScore: 55, status: "PRACTICING" },
          { id: "s4", name: "Word Problems", domain: "Problem Solving", masteryScore: 50, confidenceScore: 40, status: "DEVELOPING" },
        ],
        weakSkills: [
          { id: "s5", name: "Fractions", domain: "Number Sense", masteryScore: 25, confidenceScore: 20, status: "DEVELOPING" },
          { id: "s6", name: "Division", domain: "Operations", masteryScore: 30, confidenceScore: 25, status: "NOT_STARTED" },
        ],
        rootCauses: [
          "Incomplete understanding of place value affecting division",
          "Fraction concepts not connected to visual/concrete models",
          "Word problem reading comprehension needs scaffolding",
        ],
        recommendedStartingPoint: "Begin with visual fraction models to build number sense, then connect to division concepts",
      };

      return NextResponse.json({ skillProfile });
    }

    // Production
    const { prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");
    const { generateSkillProfile } = await import("@/lib/ai");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const responses = await prisma.assessmentResponse.findMany({
      where: { assessmentId },
      include: { skill: true },
    });

    const studentProfile = {
      id: student.id,
      name: student.name,
      age: student.age,
      grade: student.grade,
      gradeBand: student.gradeBand,
      confidenceLevel: student.confidenceLevel,
      learningPreferences: student.learningPreferences as unknown as any,
    };

    const assessmentData = {
      responses: responses.map((r) => ({
        skillId: r.skillId,
        skillName: r.skill.name,
        isCorrect: r.isCorrect,
        timeSpent: r.timeSpent,
        hintsUsed: r.hintsUsed,
        confidenceRating: r.confidenceRating,
        mistakeType: r.mistakeType,
      })),
      totalTime: responses.reduce((sum, r) => sum + r.timeSpent, 0),
      averageConfidence: responses.reduce((sum, r) => sum + r.confidenceRating, 0) / responses.length,
    };

    const skillProfile = await generateSkillProfile(studentProfile, assessmentData);

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        completedAt: new Date(),
        estimatedLevel: skillProfile.estimatedLevel,
        summary: JSON.parse(JSON.stringify(skillProfile)),
      },
    });

    return NextResponse.json({ skillProfile });
  } catch (error) {
    console.error("Complete diagnostic error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
