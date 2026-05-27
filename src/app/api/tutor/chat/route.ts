import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, getDemoTutorResponse } from "@/lib/demo-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, sessionId, message, lessonId } = body;

    if (!studentId || !message) {
      return NextResponse.json({ error: "Student ID and message required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const result = getDemoTutorResponse(message);
      return NextResponse.json({
        response: result.response,
        metadata: result.metadata,
        sessionId: sessionId || `demo-session-${Date.now()}`,
      });
    }

    // Production
    const { db: prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");
    const { tutorChat } = await import("@/lib/ai");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { skillMastery: { include: { skill: true } } },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    let session;
    if (sessionId) {
      session = await prisma.tutorSession.findUnique({ where: { id: sessionId } });
    }
    if (!session) {
      session = await prisma.tutorSession.create({
        data: { studentId, lessonId: lessonId || null, messages: [] },
      });
    }

    const existingMessages = (session.messages as unknown as any[]) || [];

    const context = {
      studentProfile: {
        id: student.id,
        name: student.name,
        age: student.age,
        grade: student.grade,
        gradeBand: student.gradeBand,
        confidenceLevel: student.confidenceLevel,
        learningPreferences: student.learningPreferences as unknown as any,
      },
      currentLesson: lessonId || undefined,
      recentMessages: existingMessages,
      skillsBeingPracticed: student.skillMastery
        .filter((sm) => sm.status === "DEVELOPING" || sm.status === "PRACTICING")
        .map((sm) => sm.skill.name),
    };

    const result = await tutorChat(message, context);

    const newMessages = [
      ...existingMessages,
      { role: "student", content: message, timestamp: new Date().toISOString() },
      { role: "tutor", content: result.response, timestamp: new Date().toISOString(), metadata: result.metadata },
    ];

    await prisma.tutorSession.update({
      where: { id: session.id },
      data: {
        messages: JSON.parse(JSON.stringify(newMessages)),
        frustrationDetected: session.frustrationDetected || result.metadata.frustrationDetected,
      },
    });

    return NextResponse.json({
      response: result.response,
      metadata: result.metadata,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Tutor chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
