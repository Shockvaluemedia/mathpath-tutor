import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({
        report: {
          studentName: "Alex",
          weekStart: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
          weekEnd: new Date().toISOString().split("T")[0],
          strengths: [
            "Showing strong persistence when problems are challenging",
            "Multiplication fluency improving steadily",
            "Good use of hints — asking for help is a strength!",
          ],
          weaknesses: [
            "Fractions still need visual support — not yet ready for abstract fraction operations",
            "Division word problems cause hesitation",
          ],
          progressSummary: "A solid week of growth! Completed 4 lessons with increasing confidence. The focus on visual fraction models is paying off — understanding is building even if speed isn't there yet.",
          recommendedNextSteps: [
            "Continue fraction practice with real objects (pizza slices, chocolate bars)",
            "Try 10 minutes of multiplication facts practice daily",
            "Encourage Alex to explain math problems out loud — teaching builds understanding",
          ],
          timeSpent: 52,
          lessonsCompleted: 4,
          confidenceTrend: "improving",
          skillsGained: ["Multiplication fluency"],
        },
      });
    }

    // Production
    const { prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");
    const { generateParentReport } = await import("@/lib/ai");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        skillMastery: { include: { skill: true } },
        lessons: { orderBy: { createdAt: "desc" }, take: 7 },
        tutorSessions: { orderBy: { createdAt: "desc" }, take: 7 },
        assessmentResponses: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const progressData = {
      studentName: student.name,
      age: student.age,
      grade: student.grade,
      gradeBand: student.gradeBand,
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: now.toISOString().split("T")[0],
      lessonsCompleted: student.lessons.filter((l) => l.completedAt).length,
      totalTimeMinutes: Math.round(student.assessmentResponses.reduce((sum, r) => sum + r.timeSpent, 0) / 60),
      skillsWorkedOn: student.skillMastery.map((sm) => ({
        name: sm.skill.name,
        startMastery: Math.max(0, sm.masteryScore - 10),
        endMastery: sm.masteryScore,
      })),
      assessmentResults: [{
        correct: student.assessmentResponses.filter((r) => r.isCorrect).length,
        total: student.assessmentResponses.length,
      }],
      confidenceRatings: student.assessmentResponses.map((r) => r.confidenceRating),
      frustrationEvents: student.tutorSessions.filter((s) => s.frustrationDetected).length,
      tutorInteractions: student.tutorSessions.length,
    };

    const report = await generateParentReport(progressData);

    await prisma.parentReport.create({
      data: {
        studentId,
        weekStart,
        weekEnd: now,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        progressSummary: report.progressSummary,
        recommendedNextSteps: report.recommendedNextSteps,
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
