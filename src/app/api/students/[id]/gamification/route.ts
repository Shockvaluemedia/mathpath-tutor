import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_GAMIFICATION } from "@/lib/demo-data";
import { calculateLevel, PlayerStats } from "@/lib/gamification";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    if (DEMO_MODE) {
      const data = (DEMO_GAMIFICATION as any)[studentId];
      if (!data) {
        // Return starter stats for new students
        const levelInfo = calculateLevel(0);
        const stats: PlayerStats = {
          xp: 0, level: levelInfo.level, levelName: `${levelInfo.emoji} ${levelInfo.name}`,
          xpToNextLevel: levelInfo.xpToNext, xpProgress: levelInfo.progress,
          streak: 0, longestStreak: 0, badges: [], totalLessons: 0, totalCorrect: 0, totalQuestions: 0,
        };
        return NextResponse.json(stats);
      }

      const levelInfo = calculateLevel(data.xp);

      const stats: PlayerStats = {
        xp: data.xp,
        level: levelInfo.level,
        levelName: `${levelInfo.emoji} ${levelInfo.name}`,
        xpToNextLevel: levelInfo.xpToNext,
        xpProgress: levelInfo.progress,
        streak: data.streak,
        longestStreak: data.longestStreak,
        badges: data.badges,
        totalLessons: data.totalLessons,
        totalCorrect: data.totalCorrect,
        totalQuestions: data.totalQuestions,
      };

      return NextResponse.json(stats);
    }

    // Production: calculate from database
    const { db: prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        lessons: { orderBy: { createdAt: "desc" } },
        assessmentResponses: true,
        tutorSessions: true,
        skillMastery: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Calculate XP from activity
    const completedLessons = student.lessons.filter((l) => l.completedAt).length;
    const correctAnswers = student.assessmentResponses.filter((r) => r.isCorrect).length;
    const totalXp = (completedLessons * 50) + (correctAnswers * 10) + (student.tutorSessions.length * 15);

    const levelInfo = calculateLevel(totalXp);

    // Calculate streak from lesson dates
    let streak = 0;
    const today = new Date();
    const completedDates = student.lessons
      .filter((l) => l.completedAt)
      .map((l) => l.completedAt!.toDateString())
      .filter((v, i, a) => a.indexOf(v) === i);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 86400000).toDateString();
      if (completedDates.includes(checkDate)) streak++;
      else if (i > 0) break;
    }

    const stats: PlayerStats = {
      xp: totalXp,
      level: levelInfo.level,
      levelName: `${levelInfo.emoji} ${levelInfo.name}`,
      xpToNextLevel: levelInfo.xpToNext,
      xpProgress: levelInfo.progress,
      streak,
      longestStreak: streak, // Simplified — would need historical tracking
      badges: [], // Would need a badges table in production
      totalLessons: completedLessons,
      totalCorrect: correctAnswers,
      totalQuestions: student.assessmentResponses.length,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get gamification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
