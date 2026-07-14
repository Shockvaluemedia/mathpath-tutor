import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    if (DEMO_MODE) {
      return NextResponse.json({ success: true, id, status: status || "active", note });
    }

    const existing = await prisma.intervention.findUnique({
      where: { id },
      select: { learnerId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
    }

    const access = await requireRequestLearnerAccess(request, existing.learnerId);
    if (!access.ok) return access.response;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "completed") updateData.completedAt = new Date();
    }

    const intervention = await prisma.intervention.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ intervention });
  } catch (error) {
    console.error("Update intervention error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
