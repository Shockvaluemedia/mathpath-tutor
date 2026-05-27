import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS, DEMO_PROGRESS } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const gradeBand = searchParams.get("gradeBand") || "";

    if (DEMO_MODE) {
      let students = DEMO_STUDENTS.map((s) => {
        const progress = (DEMO_PROGRESS as any)[s.id];
        return {
          ...s,
          stats: progress?.stats || null,
          parentName: "Sarah Johnson",
          parentEmail: "demo@mathpath.dev",
        };
      });

      if (search) {
        students = students.filter((s) =>
          s.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (gradeBand) {
        students = students.filter((s) => s.gradeBand === gradeBand);
      }

      return NextResponse.json({ students, total: students.length });
    }

    const { db: prisma } = await import("@/lib/db");

    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (gradeBand) {
      where.gradeBand = gradeBand;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          parent: { select: { name: true, email: true } },
          skillMastery: true,
          lessons: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.count({ where }),
    ]);

    const enriched = students.map((s: any) => ({
      id: s.id,
      name: s.name,
      age: s.age,
      grade: s.grade,
      gradeBand: s.gradeBand,
      confidenceLevel: s.confidenceLevel,
      parentName: s.parent.name,
      parentEmail: s.parent.email,
      masteredSkills: s.skillMastery.filter((sm: any) => sm.status === "MASTERED").length,
      totalSkills: s.skillMastery.length,
      lastActive: s.lessons[0]?.createdAt || s.createdAt,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ students: enriched, total });
  } catch (error) {
    console.error("Admin get students error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
