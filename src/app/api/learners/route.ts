import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";
import { DevelopmentalStage } from "@/lib/types";

function getDevelopmentalStage(grade: number): DevelopmentalStage {
  if (grade <= 2) return "EARLY_CHILDHOOD";
  if (grade <= 5) return "ELEMENTARY";
  if (grade <= 8) return "MIDDLE";
  return "HIGH_SCHOOL";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, age, grade, confidenceLevel, learningPreferences } = body;

    if (!name || !age || !grade) {
      return NextResponse.json({ error: "Name, age, and grade are required" }, { status: 400 });
    }

    const stage = getDevelopmentalStage(grade);

    if (DEMO_MODE) {
      const learner = {
        id: `learner-${Date.now()}`,
        guardianUserId: "demo-parent-1",
        name,
        age,
        grade,
        developmentalStage: stage,
        // Legacy compat
        gradeBand: stage === "EARLY_CHILDHOOD" ? "EARLY_ELEMENTARY" : stage === "MIDDLE" ? "MIDDLE_SCHOOL" : stage,
        confidenceLevel: confidenceLevel || 5,
        learningPreferences: learningPreferences || {},
        createdAt: new Date().toISOString(),
      };
      DEMO_STUDENTS.push(learner as any);
      return NextResponse.json({ learner, student: learner }); // dual response for compat
    }

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
        developmentalStage: stage,
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

    return NextResponse.json({ learner, student: learner });
  } catch (error) {
    console.error("Create learner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (DEMO_MODE) {
      return NextResponse.json({ learners: DEMO_STUDENTS, students: DEMO_STUDENTS });
    }

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learners = await prisma.learner.findMany({
      where: { guardianUserId: payload.userId },
      include: {
        profile: true,
        skillMastery: { include: { skill: true } },
        modules: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({ learners, students: learners });
  } catch (error) {
    console.error("Get learners error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
