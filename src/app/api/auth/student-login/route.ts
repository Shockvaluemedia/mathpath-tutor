import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, studentName } = body;

    if (!code) {
      return NextResponse.json({ error: "Access code is required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      // In demo mode, accept any code and match by student name or use first student
      const student = studentName
        ? DEMO_STUDENTS.find((s) => s.name.toLowerCase() === studentName.toLowerCase())
        : DEMO_STUDENTS[0];

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          id: student.id,
          name: student.name,
          email: `${student.name.toLowerCase()}@student.mathpath.dev`,
          role: "STUDENT",
        },
        token: `demo-student-token-${student.id}`,
        student: {
          id: student.id,
          name: student.name,
          grade: student.grade,
          gradeBand: student.gradeBand,
        },
      });
    }

    // Production: look up student by access code
    const { prisma } = await import("@/lib/db");
    const { generateToken } = await import("@/lib/auth");

    // Access code is the first 8 chars of the student ID (simplified)
    // In production, you'd have a dedicated access_codes table
    const students = await prisma.student.findMany();
    const student = students.find((s) => s.id.slice(0, 8) === code.toLowerCase());

    if (!student) {
      return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
    }

    const token = generateToken({
      userId: student.id,
      email: `${student.name.toLowerCase()}@student.mathpath.dev`,
      role: "STUDENT",
    });

    return NextResponse.json({
      user: {
        id: student.id,
        name: student.name,
        email: `${student.name.toLowerCase()}@student.mathpath.dev`,
        role: "STUDENT",
      },
      token,
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
        gradeBand: student.gradeBand,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
