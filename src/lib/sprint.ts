import {
  averageMeasurementConfidence,
  SprintSkillMeasurement,
} from "@/lib/sprint-evidence";

export type SprintStatus = "complete" | "current" | "planned";
export type SprintEvidenceStatus = "not_started" | "baseline_only" | "measured" | "demo";

export interface SprintSkillDelta {
  skillId: string;
  name: string;
  domain: string;
  baseline: number | null;
  current: number | null;
  target: number | null;
  delta: number | null;
  baselineQuestionCount: number;
  endlineQuestionCount: number;
}

export interface SprintMilestone {
  label: string;
  description: string;
  complete: boolean;
}

export interface SprintActivationItem {
  label: string;
  complete: boolean;
}

export interface SprintSession {
  number: number;
  title: string;
  focus: string;
  status: SprintStatus;
  outcome: string;
}

export interface SprintReport {
  studentId: string;
  studentName: string;
  grade: number;
  sprintName: string;
  periodLabel: string;
  diagnosticSummary: string;
  parentSummary: string;
  sessionsCompleted: number;
  targetSessions: number;
  minutesCompleted: number;
  confidenceStart: number | null;
  confidenceCurrent: number | null;
  activationRate: number;
  activationChecklist: SprintActivationItem[];
  evidenceStatus: SprintEvidenceStatus;
  evidenceLabel: string;
  canStartEndline: boolean;
  skillDeltas: SprintSkillDelta[];
  milestones: SprintMilestone[];
  sessions: SprintSession[];
  proofPoints: string[];
  nextSteps: string[];
}

interface ProgressLike {
  student?: {
    id: string;
    name: string;
    grade: number;
    confidenceLevel?: number;
  };
  stats?: {
    lessonsCompletedThisWeek?: number;
    totalLessons?: number;
    timeSpentMinutes?: number;
    masteredSkillsCount?: number;
    avgConfidence?: number;
    confidenceTrend?: "improving" | "stable" | "declining";
    tutorSessionsThisWeek?: number;
  };
  skills?: {
    mastered?: Array<{ name: string; domain: string; score: number; skillId?: string }>;
    developing?: Array<{ name: string; domain: string; score: number; skillId?: string }>;
    weak?: Array<{ name: string; domain: string; score: number; skillId?: string }>;
  };
  latestReport?: {
    progressSummary?: string;
    recommendedNextSteps?: string[];
  } | null;
}

export interface SprintEvidenceInput {
  mode?: "measured" | "demo";
  baseline?: SprintSkillMeasurement[];
  endline?: SprintSkillMeasurement[];
  events?: string[];
}

const TARGET_SESSIONS = 10;
const DEMO_SKILLS = [
  { skillId: "demo-fractions", name: "Fractions", domain: "Number Sense", score: 46 },
  { skillId: "demo-division", name: "Division", domain: "Operations", score: 47 },
  { skillId: "demo-word-problems", name: "Word Problems", domain: "Problem Solving", score: 62 },
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function asPercent(value: number) {
  return Math.round(clamp(value));
}

function getTopFocusSkills(progress?: ProgressLike) {
  const weak = progress?.skills?.weak ?? [];
  const developing = progress?.skills?.developing ?? [];
  return [...weak, ...developing].slice(0, 3).map((skill, index) => ({
    ...skill,
    skillId: skill.skillId ?? `${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
  }));
}

function buildSkillDeltas(
  progress: ProgressLike | undefined,
  baseline: SprintSkillMeasurement[],
  endline: SprintSkillMeasurement[]
): SprintSkillDelta[] {
  if (baseline.length === 0) {
    return getTopFocusSkills(progress).map((skill) => ({
      skillId: skill.skillId,
      name: skill.name,
      domain: skill.domain,
      baseline: null,
      current: null,
      target: null,
      delta: null,
      baselineQuestionCount: 0,
      endlineQuestionCount: 0,
    }));
  }

  const endlineBySkill = new Map(endline.map((measurement) => [measurement.skillId, measurement]));

  return baseline.map((measurement) => {
    const finalMeasurement = endlineBySkill.get(measurement.skillId);
    const current = finalMeasurement?.score ?? null;
    return {
      skillId: measurement.skillId,
      name: measurement.name,
      domain: measurement.domain,
      baseline: measurement.score,
      current,
      target: null,
      delta: current === null ? null : Math.round((current - measurement.score) * 10) / 10,
      baselineQuestionCount: measurement.questionCount,
      endlineQuestionCount: finalMeasurement?.questionCount ?? 0,
    };
  });
}

function buildSessions(focusSkills: SprintSkillDelta[], completed: number): SprintSession[] {
  const focusNames = focusSkills.length > 0
    ? focusSkills.map((skill) => skill.name)
    : ["First measured focus skill"];

  return Array.from({ length: TARGET_SESSIONS }, (_, index) => {
    const number = index + 1;
    const focus = focusNames[index % focusNames.length];
    const status: SprintStatus = number <= completed ? "complete" : number === completed + 1 ? "current" : "planned";

    return {
      number,
      title: number === 1
        ? "Baseline diagnostic and confidence check"
        : number === TARGET_SESSIONS
          ? "Endline check and parent report"
          : `Targeted practice session ${number}`,
      focus,
      status,
      outcome: status === "complete"
        ? `Completed focused practice on ${focus}.`
        : status === "current"
          ? `Next session focuses on ${focus}.`
          : `Planned support for ${focus}.`,
    };
  });
}

function evidenceStatusFor(
  mode: SprintEvidenceInput["mode"],
  baseline: SprintSkillMeasurement[],
  endline: SprintSkillMeasurement[]
): SprintEvidenceStatus {
  if (mode === "demo") return "demo";
  if (baseline.length === 0) return "not_started";
  const endlineSkillIds = new Set(endline.map((measurement) => measurement.skillId));
  return baseline.some((measurement) => endlineSkillIds.has(measurement.skillId))
    ? "measured"
    : "baseline_only";
}

function buildActivationChecklist({
  events,
  hasBaseline,
  hasEndline,
  sessionsCompleted,
  totalLessons,
  mode,
}: {
  events: Set<string>;
  hasBaseline: boolean;
  hasEndline: boolean;
  sessionsCompleted: number;
  totalLessons: number;
  mode?: SprintEvidenceInput["mode"];
}): SprintActivationItem[] {
  const demoComplete = mode === "demo";
  return [
    {
      label: "Diagnostic baseline captured",
      complete: hasBaseline || demoComplete,
    },
    {
      label: "First lesson started",
      complete: events.has("first_lesson_started") || totalLessons > 0 || demoComplete,
    },
    {
      label: "Three sessions completed",
      complete: sessionsCompleted >= 3 || demoComplete,
    },
    {
      label: "Endline check captured",
      complete: hasEndline || demoComplete,
    },
    {
      label: "Parent report viewed",
      complete: events.has("sprint_report_viewed") || demoComplete,
    },
    {
      label: "Parent feedback submitted",
      complete: events.has("parent_feedback_submitted") || demoComplete,
    },
  ];
}

export function buildSprintReport(
  progress?: ProgressLike,
  evidence: SprintEvidenceInput = {}
): SprintReport {
  const student = progress?.student;
  const stats = progress?.stats;
  const baseline = evidence.baseline ?? [];
  const endline = evidence.endline ?? [];
  const eventNames = new Set(evidence.events ?? []);
  const sessionsCompleted = Math.min(
    TARGET_SESSIONS,
    Math.max(stats?.lessonsCompletedThisWeek ?? 0, 0) + Math.max(stats?.tutorSessionsThisWeek ?? 0, 0)
  );
  const skillDeltas = buildSkillDeltas(progress, baseline, endline);
  const evidenceStatus = evidenceStatusFor(evidence.mode, baseline, endline);
  const confidenceStart = averageMeasurementConfidence(baseline);
  const confidenceCurrent = averageMeasurementConfidence(endline);
  const activationChecklist = buildActivationChecklist({
    events: eventNames,
    hasBaseline: baseline.length > 0,
    hasEndline: endline.length > 0,
    sessionsCompleted,
    totalLessons: stats?.totalLessons ?? 0,
    mode: evidence.mode,
  });
  const completedActivation = activationChecklist.filter((item) => item.complete).length;
  const studentName = student?.name ?? "Learner";
  const focusNames = skillDeltas.slice(0, 2).map((skill) => skill.name);
  const measuredDeltas = skillDeltas.filter((skill) => skill.delta !== null);
  const strongestDelta = measuredDeltas.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];

  let diagnosticSummary: string;
  let parentSummary: string;
  let evidenceLabel: string;

  if (evidenceStatus === "demo") {
    diagnosticSummary = `${studentName} needs the most support in ${focusNames.join(" and ")}. This sample illustrates how a real measured report will read.`;
    parentSummary = "Demo data only. No family outcome or customer result is represented in this report.";
    evidenceLabel = "Demo data";
  } else if (evidenceStatus === "measured") {
    diagnosticSummary = `${studentName}'s baseline and endline checks cover ${measuredDeltas.length} matching skill${measuredDeltas.length === 1 ? "" : "s"}.`;
    parentSummary = strongestDelta
      ? `${strongestDelta.name} changed by ${strongestDelta.delta! >= 0 ? "+" : ""}${strongestDelta.delta} percentage points across comparable checks.`
      : "Baseline and endline evidence are recorded. Review each skill before deciding the next focus.";
    evidenceLabel = "Measured baseline and endline";
  } else if (evidenceStatus === "baseline_only") {
    diagnosticSummary = `${studentName}'s persisted baseline identifies ${focusNames.join(" and ")} as the first measured focus.`;
    parentSummary = "The baseline is recorded. Progress will remain pending until the endline check is completed.";
    evidenceLabel = "Baseline captured, endline pending";
  } else {
    diagnosticSummary = "A persisted diagnostic baseline has not been captured for this sprint.";
    parentSummary = "Complete the diagnostic before using this report to make progress claims.";
    evidenceLabel = "No measured evidence yet";
  }

  const proofPoints = [
    `${sessionsCompleted}/${TARGET_SESSIONS} sprint sessions recorded`,
    `${stats?.timeSpentMinutes ?? 0} minutes recorded in assessment responses`,
  ];

  if (evidenceStatus === "measured") {
    proofPoints.push(`${measuredDeltas.length} skills have matching baseline and endline checks`);
    if (strongestDelta) {
      proofPoints.push(
        `${strongestDelta.name}: ${strongestDelta.baseline}% to ${strongestDelta.current}%`
      );
    }
  } else if (evidenceStatus === "baseline_only") {
    proofPoints.push(`${baseline.length} baseline skill measurements captured`);
    proofPoints.push("No before/after claim will appear until the endline check is complete");
  } else if (evidenceStatus === "demo") {
    proofPoints.push("All values on this report are sample data");
  } else {
    proofPoints.push("No before/after claim is available");
  }

  return {
    studentId: student?.id ?? "demo-student-1",
    studentName,
    grade: student?.grade ?? 5,
    sprintName: "2-Week Math Recovery Sprint",
    periodLabel: "10 focused sessions over 2 weeks",
    diagnosticSummary,
    parentSummary,
    sessionsCompleted,
    targetSessions: TARGET_SESSIONS,
    minutesCompleted: stats?.timeSpentMinutes ?? 0,
    confidenceStart,
    confidenceCurrent,
    activationRate: Math.round((completedActivation / activationChecklist.length) * 100),
    activationChecklist,
    evidenceStatus,
    evidenceLabel,
    canStartEndline: evidenceStatus === "baseline_only" && sessionsCompleted >= TARGET_SESSIONS,
    skillDeltas,
    milestones: [
      {
        label: "Diagnostic baseline complete",
        description: "The starting skill check is stored and immutable.",
        complete: baseline.length > 0 || evidenceStatus === "demo",
      },
      {
        label: "First lesson complete",
        description: "The learner moved from diagnosis into practice.",
        complete: (stats?.totalLessons ?? 0) > 0 || evidenceStatus === "demo",
      },
      {
        label: "Three-session habit",
        description: "Early repetition is strong enough to judge engagement.",
        complete: sessionsCompleted >= 3 || evidenceStatus === "demo",
      },
      {
        label: "Measured proof ready",
        description: "Matching baseline and endline checks support the report.",
        complete: evidenceStatus === "measured" || evidenceStatus === "demo",
      },
    ],
    sessions: buildSessions(skillDeltas, sessionsCompleted),
    proofPoints,
    nextSteps: evidenceStatus === "demo"
      ? [
          "Use this sample to review the parent-facing evidence format.",
          "Start a real diagnostic in live mode to create a persisted baseline.",
          "Collect feedback and quote consent only after a measured endline.",
        ]
      : evidenceStatus === "measured"
      ? [
          "Review the measured skill changes with the parent.",
          "Keep the next three sessions on the weakest endline skill.",
          "Choose ongoing support only if the family sees enough value to continue.",
        ]
      : evidenceStatus === "baseline_only"
        ? [
            "Complete the focused sprint sessions before the endline check.",
            "Keep practice on the first measured focus skill.",
            "Run the endline check after session 10 to unlock before/after evidence.",
          ]
        : [
            "Complete the diagnostic to capture a persisted baseline.",
            "Start the first focused lesson.",
            "Return to this report after measured evidence exists.",
          ],
  };
}

export function buildDemoSprintReport(
  progress?: ProgressLike,
  options: { completeSprint?: boolean } = {}
): SprintReport {
  const reportProgress: ProgressLike | undefined = options.completeSprint
    ? {
        ...(progress ?? {}),
        stats: {
          ...(progress?.stats ?? {}),
          lessonsCompletedThisWeek: TARGET_SESSIONS,
          totalLessons: Math.max(progress?.stats?.totalLessons ?? 0, TARGET_SESSIONS),
          tutorSessionsThisWeek: 0,
        },
      }
    : progress;
  const demoFocus = getTopFocusSkills(reportProgress);
  const source = demoFocus.length > 0 ? demoFocus : DEMO_SKILLS;
  const baseline: SprintSkillMeasurement[] = source.map((skill, index) => ({
    skillId: skill.skillId,
    name: skill.name,
    domain: skill.domain,
    correctCount: 1,
    questionCount: 4,
    score: asPercent(Math.max(10, skill.score - (index === 0 ? 18 : 12))),
    confidence: 4 + index * 0.4,
  }));
  const endline: SprintSkillMeasurement[] = source.map((skill, index) => ({
    skillId: skill.skillId,
    name: skill.name,
    domain: skill.domain,
    correctCount: 2 + Math.min(index, 1),
    questionCount: 4,
    score: asPercent(skill.score),
    confidence: 5.5 + index * 0.4,
  }));

  return buildSprintReport(reportProgress, {
    mode: "demo",
    baseline,
    endline,
    events: [
      "first_lesson_started",
      "lesson_completed",
      "sprint_report_viewed",
      "parent_feedback_submitted",
    ],
  });
}

export function buildEmptySprintReport(studentId: string, studentName = "Learner"): SprintReport {
  return buildSprintReport({
    student: {
      id: studentId,
      name: studentName,
      grade: 5,
      confidenceLevel: 5,
    },
    stats: {
      lessonsCompletedThisWeek: 0,
      totalLessons: 0,
      timeSpentMinutes: 0,
      avgConfidence: 5,
      confidenceTrend: "stable",
      tutorSessionsThisWeek: 0,
    },
    skills: {
      mastered: [],
      developing: [],
      weak: [],
    },
    latestReport: null,
  });
}
