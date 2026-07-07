import { DEMO_PROGRESS } from "@/lib/demo-data";
import { buildSprintReport, SprintReport } from "@/lib/sprint";

export type PilotFunnelStep =
  | "invited"
  | "diagnosticStarted"
  | "diagnosticCompleted"
  | "firstLesson"
  | "threeSessions"
  | "reportViewed"
  | "feedbackReceived";

export interface PilotFeedback {
  id: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  clarityRating: number;
  continueIntent: "yes" | "maybe" | "no";
  concern: string;
  quote: string;
}

export interface PilotParticipant {
  id: string;
  familyName: string;
  studentName: string;
  grade: number;
  invitedAt: string;
  status: "invited" | "active" | "needs_nudge" | "proof_ready";
  currentFocus: string;
  sessionsCompleted: number;
  confidenceDelta: number;
  sprintReport: SprintReport;
  funnel: Record<PilotFunnelStep, boolean>;
  feedback?: PilotFeedback;
}

export interface PilotSummary {
  generatedAt: string;
  targetFamilies: number;
  overview: {
    invited: number;
    diagnosticStarted: number;
    diagnosticCompleted: number;
    firstLesson: number;
    threeSessions: number;
    reportViewed: number;
    feedbackReceived: number;
    continuationYesOrMaybe: number;
  };
  participants: PilotParticipant[];
  feedback: PilotFeedback[];
  nextActions: string[];
}

const demoFeedback: PilotFeedback[] = [
  {
    id: "feedback-demo-1",
    studentId: "demo-student-1",
    studentName: "Alex",
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    clarityRating: 5,
    continueIntent: "yes",
    concern: "Fractions and word problems are where homework turns into a fight.",
    quote: "The report made the gap feel specific instead of scary.",
  },
  {
    id: "feedback-demo-2",
    studentId: "demo-student-2",
    studentName: "Maya",
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    clarityRating: 4,
    continueIntent: "maybe",
    concern: "Algebra confidence dropped this year.",
    quote: "I liked seeing confidence and not just correct answers.",
  },
];

function getDemoReport(studentId: string) {
  const progress = (DEMO_PROGRESS as any)[studentId];
  return buildSprintReport(progress);
}

function buildParticipant({
  id,
  familyName,
  studentName,
  grade,
  invitedDaysAgo,
  status,
  report,
  feedback,
  funnel,
}: {
  id: string;
  familyName: string;
  studentName: string;
  grade: number;
  invitedDaysAgo: number;
  status: PilotParticipant["status"];
  report: SprintReport;
  feedback?: PilotFeedback;
  funnel: Partial<Record<PilotFunnelStep, boolean>>;
}): PilotParticipant {
  const currentFocus = report.skillDeltas[0]?.name ?? "First focus skill";

  return {
    id,
    familyName,
    studentName,
    grade,
    invitedAt: new Date(Date.now() - invitedDaysAgo * 86400000).toISOString(),
    status,
    currentFocus,
    sessionsCompleted: report.sessionsCompleted,
    confidenceDelta: Math.round((report.confidenceCurrent - report.confidenceStart) * 10) / 10,
    sprintReport: report,
    funnel: {
      invited: true,
      diagnosticStarted: false,
      diagnosticCompleted: false,
      firstLesson: false,
      threeSessions: false,
      reportViewed: false,
      ...funnel,
      feedbackReceived: Boolean(feedback) || Boolean(funnel.feedbackReceived),
    },
    feedback,
  };
}

export function buildDemoPilotSummary(): PilotSummary {
  const alexReport = getDemoReport("demo-student-1");
  const mayaReport = getDemoReport("demo-student-2");
  const plannedReport = buildSprintReport({
    student: { id: "pilot-student-3", name: "Jordan", grade: 6, confidenceLevel: 5 },
    stats: {
      lessonsCompletedThisWeek: 0,
      totalLessons: 0,
      timeSpentMinutes: 0,
      masteredSkillsCount: 0,
      avgConfidence: 5,
      confidenceTrend: "stable",
      tutorSessionsThisWeek: 0,
    },
    skills: {
      mastered: [],
      developing: [{ name: "Ratios", domain: "Ratios", score: 42 }],
      weak: [{ name: "Division", domain: "Operations", score: 22 }],
    },
    latestReport: null,
  });
  const nudgeReport = buildSprintReport({
    student: { id: "pilot-student-4", name: "Riley", grade: 4, confidenceLevel: 4 },
    stats: {
      lessonsCompletedThisWeek: 1,
      totalLessons: 1,
      timeSpentMinutes: 12,
      masteredSkillsCount: 1,
      avgConfidence: 4.2,
      confidenceTrend: "stable",
      tutorSessionsThisWeek: 0,
    },
    skills: {
      mastered: [],
      developing: [{ name: "Multiplication", domain: "Operations", score: 48 }],
      weak: [{ name: "Word Problems", domain: "Problem Solving", score: 25 }],
    },
    latestReport: null,
  });

  const participants = [
    buildParticipant({
      id: "pilot-family-1",
      familyName: "Johnson Family",
      studentName: "Alex",
      grade: 5,
      invitedDaysAgo: 8,
      status: "proof_ready",
      report: alexReport,
      feedback: demoFeedback[0],
      funnel: {
        diagnosticStarted: true,
        diagnosticCompleted: true,
        firstLesson: true,
        threeSessions: true,
        reportViewed: true,
      },
    }),
    buildParticipant({
      id: "pilot-family-2",
      familyName: "Rivera Family",
      studentName: "Maya",
      grade: 7,
      invitedDaysAgo: 6,
      status: "active",
      report: mayaReport,
      feedback: demoFeedback[1],
      funnel: {
        diagnosticStarted: true,
        diagnosticCompleted: true,
        firstLesson: true,
        threeSessions: true,
        reportViewed: true,
      },
    }),
    buildParticipant({
      id: "pilot-family-3",
      familyName: "Carter Family",
      studentName: "Riley",
      grade: 4,
      invitedDaysAgo: 4,
      status: "needs_nudge",
      report: nudgeReport,
      funnel: {
        diagnosticStarted: true,
        diagnosticCompleted: true,
        firstLesson: true,
      },
    }),
    buildParticipant({
      id: "pilot-family-4",
      familyName: "Brooks Family",
      studentName: "Jordan",
      grade: 6,
      invitedDaysAgo: 1,
      status: "invited",
      report: plannedReport,
      funnel: {},
    }),
  ];

  return buildPilotSummary(participants, demoFeedback);
}

export function buildPilotSummary(participants: PilotParticipant[], feedback: PilotFeedback[]): PilotSummary {
  const overview = participants.reduce<PilotSummary["overview"]>(
    (acc, participant) => {
      acc.invited += participant.funnel.invited ? 1 : 0;
      acc.diagnosticStarted += participant.funnel.diagnosticStarted ? 1 : 0;
      acc.diagnosticCompleted += participant.funnel.diagnosticCompleted ? 1 : 0;
      acc.firstLesson += participant.funnel.firstLesson ? 1 : 0;
      acc.threeSessions += participant.funnel.threeSessions ? 1 : 0;
      acc.reportViewed += participant.funnel.reportViewed ? 1 : 0;
      acc.feedbackReceived += participant.funnel.feedbackReceived ? 1 : 0;
      acc.continuationYesOrMaybe += participant.feedback?.continueIntent === "yes" || participant.feedback?.continueIntent === "maybe" ? 1 : 0;
      return acc;
    },
    {
      invited: 0,
      diagnosticStarted: 0,
      diagnosticCompleted: 0,
      firstLesson: 0,
      threeSessions: 0,
      reportViewed: 0,
      feedbackReceived: 0,
      continuationYesOrMaybe: 0,
    }
  );

  const nextActions = participants
    .filter((participant) => participant.status === "needs_nudge" || participant.status === "invited")
    .map((participant) => {
      if (participant.status === "invited") {
        return `Send first diagnostic invite to ${participant.familyName}.`;
      }
      return `Nudge ${participant.familyName} to complete three sessions before the next report review.`;
    });

  if (participants.some((participant) => participant.status === "proof_ready")) {
    nextActions.unshift("Schedule a 15-minute proof call with families marked proof-ready.");
  }

  return {
    generatedAt: new Date().toISOString(),
    targetFamilies: 5,
    overview,
    participants,
    feedback,
    nextActions,
  };
}

function csvCell(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function buildPilotCsv(summary: PilotSummary) {
  const headers = [
    "family",
    "student",
    "grade",
    "status",
    "sessions_completed",
    "current_focus",
    "confidence_delta",
    "diagnostic_started",
    "diagnostic_completed",
    "first_lesson",
    "three_sessions",
    "report_viewed",
    "feedback_received",
    "clarity_rating",
    "continue_intent",
    "parent_concern",
    "parent_quote",
  ];

  const rows = summary.participants.map((participant) => [
    participant.familyName,
    participant.studentName,
    participant.grade,
    participant.status,
    participant.sessionsCompleted,
    participant.currentFocus,
    participant.confidenceDelta,
    participant.funnel.diagnosticStarted,
    participant.funnel.diagnosticCompleted,
    participant.funnel.firstLesson,
    participant.funnel.threeSessions,
    participant.funnel.reportViewed,
    participant.funnel.feedbackReceived,
    participant.feedback?.clarityRating,
    participant.feedback?.continueIntent,
    participant.feedback?.concern,
    participant.feedback?.quote,
  ]);

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
}
