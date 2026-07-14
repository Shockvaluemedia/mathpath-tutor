import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { authenticateRequest } from "@/lib/auth-middleware";

const DEMO_MEMBERS: Record<string, any[]> = {
  "org-family-1": [
    { id: "m1", userId: "demo-parent-1", name: "Sarah Johnson", email: "demo@mathpath.dev", role: "admin", joinedAt: "2025-01-15T00:00:00Z" },
    { id: "m2", userId: "demo-student-1", name: "Alex", email: "alex@student.mathpath.dev", role: "learner", joinedAt: "2025-01-15T00:00:00Z" },
    { id: "m3", userId: "demo-student-2", name: "Maya", email: "maya@student.mathpath.dev", role: "learner", joinedAt: "2025-01-15T00:00:00Z" },
  ],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (DEMO_MODE) {
    return NextResponse.json({ members: DEMO_MEMBERS[id] || [] });
  }

  const { db: prisma } = await import("@/lib/db");
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  if (auth.user.role !== "ADMIN") {
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: auth.user.userId,
        },
      },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    members: memberships.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    })),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const member = {
        id: `m-${Date.now()}`,
        userId: `user-${Date.now()}`,
        name: email.split("@")[0],
        email,
        role,
        joinedAt: new Date().toISOString(),
      };
      if (!DEMO_MEMBERS[id]) DEMO_MEMBERS[id] = [];
      DEMO_MEMBERS[id].push(member);
      return NextResponse.json({ member });
    }

    const { db: prisma } = await import("@/lib/db");
    const auth = authenticateRequest(request);
    if (!auth.ok) return auth.response;

    if (auth.user.role !== "ADMIN") {
      const membership = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId: auth.user.userId,
          },
        },
        select: { role: true },
      });
      if (!membership || !["admin", "owner"].includes(membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const validRoles = new Set(["member", "learner", "mentor", "teacher", "admin"]);
    if (typeof role !== "string" || !validRoles.has(role)) {
      return NextResponse.json({ error: "Invalid organization role" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found. They must create an account first." }, { status: 404 });
    }

    const membership = await prisma.organizationMembership.create({
      data: { organizationId: id, userId: user.id, role },
    });

    return NextResponse.json({ member: { ...membership, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Add member error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
