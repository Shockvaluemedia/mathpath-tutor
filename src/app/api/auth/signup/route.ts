import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, DEMO_USER, DEMO_TOKEN } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      return NextResponse.json({
        user: { ...DEMO_USER, name, email },
        token: DEMO_TOKEN,
      });
    }

    // Production: use database
    const { prisma } = await import("@/lib/db");
    const { hashPassword, generateToken } = await import("@/lib/auth");

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "PARENT" },
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
