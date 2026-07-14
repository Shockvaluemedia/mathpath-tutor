import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import {
  generateLearnerAccessCode,
  hashLearnerAccessCode,
  learnerAccessExpiresAt,
} from "@/lib/learner-access";

function learnerLink(request: NextRequest, accessCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return new URL(`/d/${accessCode}`, baseUrl).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { studentId?: unknown; studentName?: unknown };
    if (typeof body.studentId !== "string" || !body.studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const accessCode = generateLearnerAccessCode();
    const expiresAt = learnerAccessExpiresAt();

    if (DEMO_MODE) {
      return NextResponse.json(
        {
          link: learnerLink(request, accessCode),
          accessCode,
          studentName:
            typeof body.studentName === "string" ? body.studentName : "Student",
          expiresAt: expiresAt.toISOString(),
          expiresIn: "7 days",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const access = await requireRequestLearnerAccess(request, body.studentId);
    if (!access.ok) return access.response;

    const learner = await prisma.learner.findUnique({
      where: { id: body.studentId },
      select: { name: true },
    });
    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 });
    }

    const codeHash = hashLearnerAccessCode(accessCode);
    await prisma.learnerAccessCredential.upsert({
      where: { learnerId: body.studentId },
      create: {
        learnerId: body.studentId,
        codeHash,
        expiresAt,
      },
      update: {
        codeHash,
        expiresAt,
        revokedAt: null,
        lastUsedAt: null,
      },
    });

    return NextResponse.json(
      {
        link: learnerLink(request, accessCode),
        accessCode,
        studentName: learner.name,
        expiresAt: expiresAt.toISOString(),
        expiresIn: "7 days",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Generate diagnostic link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { studentId?: unknown };
    if (typeof body.studentId !== "string" || !body.studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({ revoked: true });
    }

    const access = await requireRequestLearnerAccess(request, body.studentId);
    if (!access.ok) return access.response;

    await prisma.learnerAccessCredential.updateMany({
      where: { learnerId: body.studentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ revoked: true });
  } catch (error) {
    console.error("Revoke diagnostic link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
