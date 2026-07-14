import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import {
  authenticateLearnerAccess,
  learnerGradeBand,
  learnerSessionEmail,
} from "@/lib/learner-access";

const INVALID_ACCESS_CODE = "Invalid or expired access code";

function invalidAccessCodeResponse() {
  return NextResponse.json({ error: INVALID_ACCESS_CODE }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: unknown;
      studentName?: unknown;
    };

    if (typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json({ error: "Access code is required" }, { status: 400 });
    }
    if (body.studentName !== undefined && typeof body.studentName !== "string") {
      return NextResponse.json({ error: "Student name must be text" }, { status: 400 });
    }
    const studentName = typeof body.studentName === "string" ? body.studentName : undefined;

    if (DEMO_MODE) {
      const student = studentName
        ? DEMO_STUDENTS.find(
            (candidate) =>
              candidate.name.toLowerCase() === studentName.trim().toLowerCase()
          )
        : DEMO_STUDENTS[0];

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      return NextResponse.json(
        {
          user: {
            id: student.id,
            name: student.name,
            email: `${student.name.toLowerCase()}@student.mathpath.dev`,
            role: "LEARNER",
          },
          token: `demo-student-token-${student.id}`,
          student: {
            id: student.id,
            name: student.name,
            grade: student.grade,
            gradeBand: student.gradeBand,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const now = new Date();
    const credential = await authenticateLearnerAccess({
      code: body.code,
      studentName,
      now,
      lookup: async (codeHash) =>
        prisma.learnerAccessCredential.findUnique({
          where: { codeHash },
          include: { learner: true },
        }),
    });

    if (!credential) return invalidAccessCodeResponse();

    const markedUsed = await prisma.learnerAccessCredential.updateMany({
      where: {
        id: credential.id,
        codeHash: credential.codeHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { lastUsedAt: now },
    });
    if (markedUsed.count !== 1) return invalidAccessCodeResponse();

    const learner = credential.learner;
    const email = learnerSessionEmail(learner.id);
    const token = generateToken(
      { userId: learner.id, email, role: "LEARNER" },
      "24h"
    );

    return NextResponse.json(
      {
        user: {
          id: learner.id,
          name: learner.name,
          email,
          role: "LEARNER",
        },
        token,
        student: {
          id: learner.id,
          name: learner.name,
          grade: learner.grade,
          gradeBand: learnerGradeBand(learner.developmentalStage),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
