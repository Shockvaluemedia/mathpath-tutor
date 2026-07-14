import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { authenticateRequest, requireRequestRole } from "@/lib/auth-middleware";

const DEMO_ORGS = [
  {
    id: "org-family-1",
    name: "Johnson Family",
    type: "family",
    slug: "johnson-family",
    memberCount: 3,
    learnerCount: 2,
    createdAt: "2025-01-15T00:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ organizations: DEMO_ORGS });
  }

  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const { db: prisma } = await import("@/lib/db");
  const orgs = await prisma.organization.findMany({
    where: auth.user.role === "ADMIN"
      ? {}
      : { memberships: { some: { userId: auth.user.userId } } },
    include: { memberships: true },
  });
  return NextResponse.json({
    organizations: orgs.map((o: any) => ({
      ...o,
      memberCount: o.memberships.length,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, slug } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const org = {
        id: `org-${Date.now()}`,
        name,
        type,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        memberCount: 1,
        learnerCount: 0,
        createdAt: new Date().toISOString(),
      };
      DEMO_ORGS.push(org);
      return NextResponse.json({ organization: org });
    }

    const auth = requireRequestRole(request, [
      "PARENT",
      "SCHOOL_ADMIN",
      "ORG_ADMIN",
      "ADMIN",
    ]);
    if (!auth.ok) return auth.response;

    const { db: prisma } = await import("@/lib/db");
    const org = await prisma.organization.create({
      data: {
        name,
        type,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        settings: {},
        memberships: {
          create: { userId: auth.user.userId, role: "admin" },
        },
      },
    });
    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Create org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
