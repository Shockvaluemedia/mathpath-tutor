import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { DevelopmentalStage } from "@/lib/types";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

function getStage(grade: number): DevelopmentalStage {
  if (grade <= 2) return "EARLY_CHILDHOOD";
  if (grade <= 5) return "ELEMENTARY";
  if (grade <= 8) return "MIDDLE";
  return "HIGH_SCHOOL";
}

// Legacy grade band for frontend compat
function getGradeBand(grade: number): string {
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
      return NextResponse.json({ error: "Name, age, and grade are required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const student = {
        id: `demo-student-${Date.now()}`,
        parentUserId: "demo-parent-1",
        name,
        age,
        grade,
        gradeBand: getGradeBand(grade),
        confidenceLevel: confidenceLevel || 5,
        learningPreferences: learningPreferences || {},
        createdAt: new Date().toISOString(),
      };
      DEMO_STUDENTS.push(student as any);
      return NextResponse.json({ student });
    }

    // Production — use new Learner model
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.create({
      data: {
        guardianUserId: payload.userId,
        name,
        age,
        grade,
        developmentalStage: getStage(grade),
      },
    });

    // Create learner profile
    await prisma.learnerProfile.create({
      data: {
        learnerId: learner.id,
        confidenceLevel: confidenceLevel || 5,
        preferredStyle: learningPreferences?.style || "visual",
        challenges: learningPreferences?.hardTopics || [],
        preferences: learningPreferences || {},
      },
    });

    // Return in legacy format for frontend compat
    const student = {
      id: learner.id,
      parentUserId: learner.guardianUserId,
      name: learner.name,
      age: learner.age,
      grade: learner.grade,
      gradeBand: getGradeBand(learner.grade),
      confidenceLevel: confidenceLevel || 5,
      learningPreferences: learningPreferences || {},
      createdAt: learner.createdAt,
    };

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

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learners = await prisma.learner.findMany({
      where: { guardianUserId: payload.userId },
      include: {
        profile: true,
        skillMastery: true,
        modules: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    // Map to legacy format
    const students = learners.map((l) => ({
      id: l.id,
      parentUserId: l.guardianUserId,
      name: l.name,
      age: l.age,
      grade: l.grade,
      gradeBand: getGradeBand(l.grade),
      confidenceLevel: l.profile?.confidenceLevel || 5,
      learningPreferences: l.profile?.preferences || {},
      skillMastery: l.skillMastery,
      lessons: l.modules,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
