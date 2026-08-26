import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { requireRequestRole } from "@/lib/auth-middleware";
import {
  getOrCreateActiveSprintEnrollment,
  isSprintEventName,
  recordSprintEvent,
} from "@/lib/sprint-events";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const learnerId = typeof body.studentId === "string" ? body.studentId : "";
    const name = body.name;
    const referenceId = typeof body.referenceId === "string"
      ? body.referenceId.slice(0, 200)
      : "manual";
    const metadata = body.metadata && typeof body.metadata === "object"
      ? body.metadata
      : {};

    if (!learnerId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (!isSprintEventName(name)) {
      return NextResponse.json({ error: "Invalid sprint event" }, { status: 400 });
    }

    if (name !== "invite_sent") {
      return NextResponse.json(
        { error: "Only invitation events can be recorded manually" },
        { status: 400 }
      );
    }

    if (DEMO_MODE) {
      return NextResponse.json({
        event: {
          id: `demo-${name}-${referenceId}`,
          name,
          occurredAt: new Date().toISOString(),
        },
      });
    }

    const auth = requireRequestRole(request, ["ADMIN"]);
    if (!auth.ok) return auth.response;

    const enrollment = await getOrCreateActiveSprintEnrollment(learnerId);
    const event = await recordSprintEvent({
      enrollmentId: enrollment.id,
      name,
      idempotencyKey: `${enrollment.id}:${name}:${referenceId}`,
      metadata,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Record sprint event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
