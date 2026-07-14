import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_STUDENTS, DEMO_PROGRESS } from "@/lib/demo-data";
import { requireRequestRole } from "@/lib/auth-middleware";

// Returns learners assigned to the current mentor/teacher

export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    const learners = DEMO_STUDENTS.map((s) => {
      const progress = (DEMO_PROGRESS as any)[s.id];
      return {
        id: s.id,
        name: s.name,
        age: s.age,
        grade: s.grade,
        stage: s.gradeBand,
        confidenceLevel: s.confidenceLevel,
        stats: progress?.stats || null,
        skills: progress?.skills || null,
        needsIntervention: s.confidenceLevel <= 4 || (progress?.stats?.avgConfidence || 5) < 4,
        lastActive: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString(),
        enrolledDomains: s.id === "demo-student-1" ? ["Mathematics", "Reading"] : ["Mathematics", "AI Literacy"],
      };
    });
    return NextResponse.json({ learners });
  }

  const { db: prisma } = await import("@/lib/db");
  const auth = requireRequestRole(request, [
    "MENTOR",
    "TEACHER",
    "TUTOR",
    "SCHOOL_ADMIN",
    "ORG_ADMIN",
    "FACILITATOR",
    "ADMIN",
  ]);
  if (!auth.ok) return auth.response;

  const learners = await prisma.learner.findMany({
    where: auth.user.role === "ADMIN"
      ? {}
      : {
          guardian: {
            memberships: {
              some: {
                organization: {
                  memberships: { some: { userId: auth.user.userId } },
                },
              },
            },
          },
        },
    include: { profile: true, skillMastery: true },
  });

  return NextResponse.json({ learners });
}
