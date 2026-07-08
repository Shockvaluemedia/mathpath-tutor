import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_USER, DEMO_TOKEN } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      // Accept any credentials in demo mode
      return NextResponse.json({
        user: { ...DEMO_USER, email },
        token: DEMO_TOKEN,
      });
    }

    // Production: use database
    const { db: prisma } = await import("@/lib/db");
    const { verifyPassword, generateToken } = await import("@/lib/auth");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, planId: user.planId },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
