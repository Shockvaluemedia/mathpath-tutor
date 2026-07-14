import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { buildDemoPilotSummary, buildPilotCsv, buildPilotOperatorAction, buildPilotSummary, PilotFeedback, PilotParticipant } from "@/lib/pilot";
import { buildSprintReport } from "@/lib/sprint";
import { requireRequestRole } from "@/lib/auth-middleware";

function wantsCsv(request: NextRequest) {
  return request.nextUrl.searchParams.get("format") === "csv";
}

function csvResponse(csv: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=mathpath-pilot-evidence.csv",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    if (DEMO_MODE) {
      const summary = buildDemoPilotSummary();
      return wantsCsv(request) ? csvResponse(buildPilotCsv(summary)) : NextResponse.json(summary);
    }

    const auth = requireRequestRole(request, ["ADMIN"]);
    if (!auth.ok) return auth.response;

    const { db: prisma } = await import("@/lib/db");

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

    const learners = await prisma.learner.findMany({
      take: 25,
      orderBy: { createdAt: "desc" },
      include: {
        guardian: true,
        profile: true,
        skillMastery: { include: { skill: true }, orderBy: { masteryScore: "desc" } },
        modules: { orderBy: { createdAt: "desc" }, take: 20, include: { skill: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 20 },
        assessmentResponses: { orderBy: { createdAt: "desc" }, take: 40 },
        assessments: { orderBy: { startedAt: "desc" }, take: 5 },
        reports: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    const feedback: PilotFeedback[] = learners.flatMap((learner: any) =>
      learner.reports
        .filter((report: any) => report.reportType === "pilot-feedback")
        .map((report: any) => ({
          id: report.id,
          studentId: learner.id,
          studentName: learner.name,
          submittedAt: report.createdAt.toISOString(),
          clarityRating: Number(report.data?.clarityRating ?? 0),
          continueIntent: report.data?.continueIntent ?? "maybe",
          concern: report.data?.concern ?? "",
          quote: report.data?.quote ?? "",
        }))
    );

    const participants: PilotParticipant[] = learners.map((learner: any) => {
      const recentModules = learner.modules.filter((module: any) => module.createdAt >= twoWeeksAgo);
      const recentSessions = learner.sessions.filter((session: any) => session.createdAt >= twoWeeksAgo);
      const recentResponses = learner.assessmentResponses.filter((response: any) => response.createdAt >= twoWeeksAgo);
      const recentFeedback = feedback.find((item) => item.studentId === learner.id);
      const completedLessons = recentModules.filter((module: any) => module.completedAt).length;
      const avgConfidence = recentResponses.length > 0
        ? recentResponses.reduce((sum: number, response: any) => sum + response.confidenceRating, 0) / recentResponses.length
        : learner.profile?.confidenceLevel ?? 5;
      const sprintReport = buildSprintReport({
        student: {
          id: learner.id,
          name: learner.name,
          grade: learner.grade,
          confidenceLevel: learner.profile?.confidenceLevel ?? 5,
        },
        stats: {
          lessonsCompletedThisWeek: completedLessons,
          totalLessons: learner.modules.length,
          timeSpentMinutes: Math.round(recentResponses.reduce((sum: number, response: any) => sum + response.timeSpent, 0) / 60),
          masteredSkillsCount: learner.skillMastery.filter((skill: any) => skill.status === "MASTERED").length,
          avgConfidence,
          confidenceTrend: "stable",
          tutorSessionsThisWeek: recentSessions.length,
        },
        skills: {
          mastered: learner.skillMastery
            .filter((skill: any) => skill.status === "MASTERED")
            .map((skill: any) => ({ name: skill.skill.name, domain: "Math", score: skill.masteryScore })),
          developing: learner.skillMastery
            .filter((skill: any) => skill.status === "DEVELOPING" || skill.status === "PRACTICING")
            .map((skill: any) => ({ name: skill.skill.name, domain: "Math", score: skill.masteryScore })),
          weak: learner.skillMastery
            .filter((skill: any) => skill.status === "NOT_STARTED" || skill.masteryScore < 40)
            .map((skill: any) => ({ name: skill.skill.name, domain: "Math", score: skill.masteryScore })),
        },
        latestReport: learner.reports.find((report: any) => report.reportType !== "pilot-feedback")?.data ?? null,
      });

      const diagnosticStarted = learner.assessments.length > 0 || recentResponses.length > 0;
      const diagnosticCompleted = learner.assessments.some((assessment: any) => assessment.completedAt);
      const threeSessions = sprintReport.sessionsCompleted >= 3;
      const reportViewed = learner.reports.some((report: any) => report.reportType !== "pilot-feedback");
      const status: PilotParticipant["status"] = recentFeedback || threeSessions
        ? "proof_ready"
        : completedLessons > 0 || diagnosticCompleted
          ? "active"
          : diagnosticStarted
          ? "needs_nudge"
          : "invited";
      const currentFocus = sprintReport.skillDeltas[0]?.name ?? "First focus skill";
      const sessionsCompleted = sprintReport.sessionsCompleted;
      const funnel = {
        invited: true,
        diagnosticStarted,
        diagnosticCompleted,
        firstLesson: completedLessons > 0,
        threeSessions,
        reportViewed,
        feedbackReceived: Boolean(recentFeedback),
      };

      return {
        id: learner.id,
        familyName: `${learner.guardian?.name ?? "Pilot"} Family`,
        studentName: learner.name,
        grade: learner.grade,
        invitedAt: learner.createdAt.toISOString(),
        status,
        currentFocus,
        sessionsCompleted,
        confidenceDelta: Math.round((sprintReport.confidenceCurrent - sprintReport.confidenceStart) * 10) / 10,
        sprintReport,
        funnel,
        operatorAction: buildPilotOperatorAction({
          familyName: `${learner.guardian?.name ?? "Pilot"} Family`,
          studentName: learner.name,
          currentFocus,
          sessionsCompleted,
          funnel,
          feedback: recentFeedback,
        }),
        feedback: recentFeedback,
      };
    });

    const summary = buildPilotSummary(participants, feedback);
    return wantsCsv(request) ? csvResponse(buildPilotCsv(summary)) : NextResponse.json(summary);
  } catch (error) {
    console.error("Pilot summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
