import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestRole } from "@/lib/auth-middleware";
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

    const auth = requireRequestRole(request, ["PARENT", "ADMIN"]);
    if (!auth.ok) return auth.response;

    const learner = await prisma.learner.create({
      data: {
        guardianUserId: auth.user.userId,
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

    const auth = requireRequestRole(request, ["PARENT", "LEARNER", "ADMIN"]);
    if (!auth.ok) return auth.response;

    const learners = await prisma.learner.findMany({
      where: auth.user.role === "ADMIN"
        ? {}
        : auth.user.role === "LEARNER"
          ? { id: auth.user.userId }
          : { guardianUserId: auth.user.userId },
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
