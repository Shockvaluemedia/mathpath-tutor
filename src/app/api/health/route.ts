import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
    aiProvider: process.env.AI_PROVIDER || "openai",
    region: process.env.AWS_REGION || "unknown",
  };

  // Check database connectivity (skip in demo mode)
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    try {
      const { db: prisma } = await import("@/lib/db");
      await prisma.$queryRaw`SELECT 1`;
      (health as any).database = "connected";
    } catch {
      (health as any).database = "disconnected";
      (health as any).status = "degraded";
    }
  }

  const statusCode = 200; // Always return 200 for ALB health checks
  return NextResponse.json(health, { status: statusCode });
}
