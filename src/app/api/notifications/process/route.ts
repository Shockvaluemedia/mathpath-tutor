import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { sendEmail, weeklyReportEmail, streakReminderEmail, inactivityNudgeEmail } from "@/lib/email";

// Batch processor: scans all students and sends appropriate notifications
// Designed to be called daily by EventBridge/cron

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!DEMO_MODE && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({
        processed: true,
        results: {
          weeklyReports: 1,
          streakReminders: 0,
          inactivityNudges: 0,
        },
        message: "Demo mode — no emails sent",
      });
    }

    const { prisma } = await import("@/lib/db");

    const now = new Date();
    const today = now.getDay(); // 0=Sun, 1=Mon...
    const results = { weeklyReports: 0, streakReminders: 0, inactivityNudges: 0 };

    // Get all students with their parents
    const students = await prisma.student.findMany({
      include: {
        parent: true,
        lessons: { orderBy: { createdAt: "desc" }, take: 7 },
        skillMastery: { include: { skill: true } },
        assessmentResponses: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    for (const student of students) {
      const parentEmail = student.parent.email;
      const parentName = student.parent.name;

      const completedLessons = student.lessons.filter((l) => l.completedAt);
      const lastActive = completedLessons[0]?.completedAt || student.createdAt;
      const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);

      // Weekly report — send on Sundays
      if (today === 0) {
        const confidenceRatings = student.assessmentResponses.map((r) => r.confidenceRating);
        const avgConfidence = confidenceRatings.length > 0
          ? confidenceRatings.reduce((a, b) => a + b, 0) / confidenceRatings.length
          : student.confidenceLevel;

        const email = weeklyReportEmail({
          parentName,
          studentName: student.name,
          progressSummary: `${student.name} completed ${completedLessons.length} lessons this week.`,
          strengths: student.skillMastery.filter((sm) => sm.status === "MASTERED").slice(0, 3).map((sm) => sm.skill.name + " is solid"),
          weaknesses: student.skillMastery.filter((sm) => sm.masteryScore < 40).slice(0, 2).map((sm) => sm.skill.name + " needs more practice"),
          recommendedNextSteps: ["Continue daily practice", "Focus on weak areas identified"],
          lessonsCompleted: completedLessons.length,
          timeSpentMinutes: student.assessmentResponses.reduce((sum, r) => sum + r.timeSpent, 0) / 60,
          confidenceTrend: avgConfidence > 6 ? "improving" : avgConfidence < 4 ? "declining" : "stable",
        });

        await sendEmail({ to: parentEmail, ...email });
        results.weeklyReports++;
      }

      // Streak reminder — if they have a streak and haven't practiced today
      if (daysSinceActive === 1 && completedLessons.length >= 3) {
        const streak = completedLessons.length; // Simplified
        const email = streakReminderEmail({
          parentName,
          studentName: student.name,
          currentStreak: Math.min(streak, 30),
          lastActive: lastActive.toISOString(),
        });
        await sendEmail({ to: parentEmail, ...email });
        results.streakReminders++;
      }

      // Inactivity nudge — if inactive for 3+ days
      if (daysSinceActive >= 3 && daysSinceActive <= 7) {
        const email = inactivityNudgeEmail({
          parentName,
          studentName: student.name,
          daysSinceActive,
        });
        await sendEmail({ to: parentEmail, ...email });
        results.inactivityNudges++;
      }
    }

    return NextResponse.json({ processed: true, results });
  } catch (error) {
    console.error("Process notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
