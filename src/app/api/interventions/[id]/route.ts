import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { Prisma } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;
    const allowedStatuses = new Set(["active", "paused", "completed"]);
    if (status !== undefined && (typeof status !== "string" || !allowedStatuses.has(status))) {
      return NextResponse.json({ error: "Invalid intervention status" }, { status: 400 });
    }
    if (note !== undefined && (typeof note !== "string" || note.length > 1000)) {
      return NextResponse.json({ error: "Invalid progress note" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({ success: true, id, status: status || "active", note });
    }

    const existing = await prisma.intervention.findUnique({
      where: { id },
      select: { learnerId: true, outcomes: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Intervention not found" }, { status: 404 });
    }

    const access = await requireRequestLearnerAccess(request, existing.learnerId);
    if (!access.ok) return access.response;

    const existingOutcomes = existing.outcomes && typeof existing.outcomes === "object" && !Array.isArray(existing.outcomes)
      ? existing.outcomes as Record<string, unknown>
      : {};
    const existingNotes = Array.isArray(existingOutcomes.notes) ? existingOutcomes.notes : [];
    const updateData: Prisma.InterventionUpdateInput = {};
    if (status) {
      updateData.status = status;
      if (status === "completed") updateData.completedAt = new Date();
    }
    if (note) {
      updateData.outcomes = JSON.parse(JSON.stringify({
        ...existingOutcomes,
        notes: [...existingNotes, { note, authorUserId: access.user.userId, createdAt: new Date().toISOString() }],
      })) as Prisma.InputJsonValue;
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
