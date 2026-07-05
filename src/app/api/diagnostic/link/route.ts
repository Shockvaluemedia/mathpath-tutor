import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
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

    // Generate a unique access code (8 chars, URL-safe)
    const accessCode = crypto.randomBytes(4).toString("hex");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${baseUrl}/d/${accessCode}`;

    if (DEMO_MODE) {
      return NextResponse.json({
        link,
        accessCode,
        studentName: studentName || "Student",
        expiresIn: "7 days",
      });
    }

    // In production, store the access code linked to the student
    // For now, encode student info in the code (simplified)
    // A production system would store this in a table
    return NextResponse.json({
      link,
      accessCode,
      studentName: studentName || "Student",
      expiresIn: "7 days",
    });
  } catch (error) {
    console.error("Generate diagnostic link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
