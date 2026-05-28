import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, getDemoTutorResponse } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

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
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      include: { profile: true, skillMastery: { include: { skill: true } } },
    });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Get or create session
    let session;
    if (sessionId) {
      session = await prisma.tutoringSession.findUnique({ where: { id: sessionId } });
    }
    if (!session) {
      session = await prisma.tutoringSession.create({
        data: { learnerId: studentId, moduleId: lessonId || null, messages: [] },
      });
    }

    const existingMessages = (session.messages as any[]) || [];

    // Try AI tutoring
    let tutorResponse: string;
    let metadata = { frustrationDetected: false, encouragement: false, hintGiven: false };

    try {
      const { tutorChat } = await import("@/lib/ai");
      const context = {
        studentProfile: {
          id: learner.id,
          name: learner.name,
          age: learner.age,
          grade: learner.grade,
          gradeBand: learner.developmentalStage,
          confidenceLevel: learner.profile?.confidenceLevel || 5,
          learningPreferences: learner.profile?.preferences as any || {},
        },
        currentLesson: lessonId || undefined,
        recentMessages: existingMessages,
        skillsBeingPracticed: learner.skillMastery
          .filter((sm) => sm.status === "DEVELOPING" || sm.status === "PRACTICING")
          .map((sm) => sm.skill.name),
      };

      const result = await tutorChat(message, context);
      tutorResponse = result.response;
      metadata = result.metadata;
    } catch {
      // Fallback
      const fallback = getDemoTutorResponse(message);
      tutorResponse = fallback.response;
      metadata = fallback.metadata;
    }

    // Save messages
    const newMessages = [
      ...existingMessages,
      { role: "student", content: message, timestamp: new Date().toISOString() },
      { role: "tutor", content: tutorResponse, timestamp: new Date().toISOString(), metadata },
    ];

    await prisma.tutoringSession.update({
      where: { id: session.id },
      data: {
        messages: JSON.parse(JSON.stringify(newMessages)),
        frustrationDetected: session.frustrationDetected || metadata.frustrationDetected,
      },
    });

    return NextResponse.json({
      response: tutorResponse,
      metadata,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Tutor chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
