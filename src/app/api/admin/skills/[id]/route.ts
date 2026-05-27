import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, domain, gradeMin, gradeMax, prerequisites, description } = body;

    if (DEMO_MODE) {
      // Import the demo skills from the parent route module
      // In demo mode we just return success
      return NextResponse.json({
        skill: { id, name, domain, gradeMin, gradeMax, prerequisites: prerequisites || [], description: description || "" },
      });
    }

    const { prisma } = await import("@/lib/db");
    const skill = await prisma.skill.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(domain && { domain }),
        ...(gradeMin !== undefined && { gradeMin }),
        ...(gradeMax !== undefined && { gradeMax }),
        ...(prerequisites && { prerequisites }),
        ...(description && { description }),
      },
    });

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("Update skill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (DEMO_MODE) {
      return NextResponse.json({ success: true });
    }

    const { prisma } = await import("@/lib/db");
    await prisma.skill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete skill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
