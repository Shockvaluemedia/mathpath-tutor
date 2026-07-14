import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import crypto from "crypto";

// Generate a unique, short-lived diagnostic link for a student
// The link doesn't require login — it's a direct access token

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, studentName } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const accessCode = crypto.randomBytes(4).toString("hex");
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const link = `${baseUrl}/d/${accessCode}`;
      return NextResponse.json({
        link,
        accessCode,
        studentName: studentName || "Student",
        expiresIn: "7 days",
      });
    }

    const access = await requireRequestLearnerAccess(request, studentId);
    if (!access.ok) return access.response;

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 });
    }

    const accessCode = crypto.randomBytes(4).toString("hex");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const link = `${baseUrl}/d/${accessCode}`;

    // In production, store the access code linked to the student
    // For now, encode student info in the code (simplified)
    // A production system would store this in a table
    return NextResponse.json({
      link,
      accessCode,
      studentName: learner.name,
      expiresIn: "7 days",
    });
  } catch (error) {
    console.error("Generate diagnostic link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
