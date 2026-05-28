import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

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
      const skillProfile = {
        estimatedLevel: `Grade ${grade} level with some gaps in foundational skills`,
        levelComparison: "Slightly below grade level in some areas, on track in others",
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
        ],
        recommendedStartingPoint: "Begin with visual fraction models to build number sense",
      };
      return NextResponse.json({ skillProfile });
    }

    // Production
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.findUnique({ where: { id: studentId }, include: { profile: true } });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const responses = await prisma.assessmentResponse.findMany({
      where: { assessmentId },
      include: { skill: true },
    });

    // Generate skill profile with AI
    let skillProfile;
    try {
      const { generateSkillProfile } = await import("@/lib/ai");
      const studentProfile = {
        id: learner.id,
        name: learner.name,
        age: learner.age,
        grade: learner.grade,
        gradeBand: learner.developmentalStage,
        confidenceLevel: learner.profile?.confidenceLevel || 5,
        learningPreferences: learner.profile?.preferences as any || {},
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
        averageConfidence: responses.length > 0 ? responses.reduce((sum, r) => sum + r.confidenceRating, 0) / responses.length : 5,
      };

      skillProfile = await generateSkillProfile(studentProfile, assessmentData);
    } catch (aiError) {
      // Fallback if AI fails
      skillProfile = {
        estimatedLevel: `Grade ${learner.grade}`,
        levelComparison: "Assessment complete",
        masteredSkills: [],
        developingSkills: [],
        weakSkills: [],
        rootCauses: ["Assessment data collected — analysis pending"],
        recommendedStartingPoint: "Start with foundational skills",
      };
    }

    // Update assessment record
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
