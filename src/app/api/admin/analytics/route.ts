import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

export async function GET() {
  try {
    if (DEMO_MODE) {
      return NextResponse.json({
        overview: {
          totalStudents: 2,
          totalParents: 1,
          totalLessonsCompleted: 18,
          totalTutorSessions: 13,
          avgMasteryScore: 62,
          avgConfidence: 5.6,
          activeThisWeek: 2,
        },
        gradeBandDistribution: [
          { band: "EARLY_ELEMENTARY", count: 0 },
          { band: "ELEMENTARY", count: 1 },
          { band: "MIDDLE_SCHOOL", count: 1 },
          { band: "HIGH_SCHOOL", count: 0 },
        ],
        weeklyActivity: [
          { day: "Mon", lessons: 3, tutorSessions: 2 },
          { day: "Tue", lessons: 4, tutorSessions: 3 },
          { day: "Wed", lessons: 2, tutorSessions: 1 },
          { day: "Thu", lessons: 5, tutorSessions: 4 },
          { day: "Fri", lessons: 3, tutorSessions: 2 },
          { day: "Sat", lessons: 1, tutorSessions: 1 },
          { day: "Sun", lessons: 0, tutorSessions: 0 },
        ],
        topSkillGaps: [
          { skill: "Fractions", studentsStruggling: 2, avgMastery: 26 },
          { skill: "Division", studentsStruggling: 1, avgMastery: 35 },
          { skill: "Expressions & Equations", studentsStruggling: 1, avgMastery: 20 },
          { skill: "Decimals", studentsStruggling: 1, avgMastery: 15 },
        ],
        recentSignups: [
          { name: "Sarah Johnson", date: "2025-01-15", students: 2 },
        ],
      });
    }

    const { prisma } = await import("@/lib/db");

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      totalStudents,
      totalParents,
      totalLessonsCompleted,
      totalTutorSessions,
      activeThisWeek,
      skillMasteryData,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.user.count({ where: { role: "PARENT" } }),
      prisma.lesson.count({ where: { completedAt: { not: null } } }),
      prisma.tutorSession.count(),
      prisma.student.count({
        where: { lessons: { some: { createdAt: { gte: weekAgo } } } },
      }),
      prisma.studentSkillMastery.aggregate({ _avg: { masteryScore: true, confidenceScore: true } }),
    ]);

    const gradeBandDistribution = await prisma.student.groupBy({
      by: ["gradeBand"],
      _count: true,
    });

    return NextResponse.json({
      overview: {
        totalStudents,
        totalParents,
        totalLessonsCompleted,
        totalTutorSessions,
        avgMasteryScore: Math.round(skillMasteryData._avg.masteryScore || 0),
        avgConfidence: Math.round((skillMasteryData._avg.confidenceScore || 0) * 10) / 10,
        activeThisWeek,
      },
      gradeBandDistribution: gradeBandDistribution.map((g) => ({
        band: g.gradeBand,
        count: g._count,
      })),
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
