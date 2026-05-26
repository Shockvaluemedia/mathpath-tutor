import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { GradeBand } from "@/lib/types";

function getGradeBand(grade: number): GradeBand {
  if (grade <= 2) return "EARLY_ELEMENTARY";
  if (grade <= 5) return "ELEMENTARY";
  if (grade <= 8) return "MIDDLE_SCHOOL";
  return "HIGH_SCHOOL";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, age, grade, confidenceLevel, learningPreferences } = body;

    if (!name || !age || !grade) {
      return NextResponse.json(
        { error: "Name, age, and grade are required" },
        { status: 400 }
      );
    }

    const gradeBand = getGradeBand(grade);

    if (DEMO_MODE) {
      const student = {
        id: `demo-student-${Date.now()}`,
        parentUserId: "demo-parent-1",
        name,
        age,
        grade,
        gradeBand,
        confidenceLevel: confidenceLevel || 5,
        learningPreferences: learningPreferences || {},
        createdAt: new Date().toISOString(),
      };
      // Add to in-memory demo students
      DEMO_STUDENTS.push(student as any);
      return NextResponse.json({ student });
    }

    // Production
    const { prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.create({
      data: {
        parentUserId: payload.userId,
        name,
        age,
        grade,
        gradeBand,
        confidenceLevel: confidenceLevel || 5,
        learningPreferences: learningPreferences || {},
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (DEMO_MODE) {
      return NextResponse.json({ students: DEMO_STUDENTS });
    }

    const { prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const students = await prisma.student.findMany({
      where: { parentUserId: payload.userId },
      include: {
        skillMastery: true,
        lessons: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
