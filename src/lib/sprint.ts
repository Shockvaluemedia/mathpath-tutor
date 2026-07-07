export type SprintStatus = "complete" | "current" | "planned";

export interface SprintSkillDelta {
  name: string;
  domain: string;
  baseline: number;
  current: number;
  target: number;
}

export interface SprintMilestone {
  label: string;
  description: string;
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
  confidenceStart: number;
  confidenceCurrent: number;
  activationRate: number;
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
    mastered?: Array<{ name: string; domain: string; score: number }>;
    developing?: Array<{ name: string; domain: string; score: number }>;
    weak?: Array<{ name: string; domain: string; score: number }>;
  };
  latestReport?: {
    progressSummary?: string;
    recommendedNextSteps?: string[];
  } | null;
}

const TARGET_SESSIONS = 10;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function asPercent(value: number) {
  return Math.round(clamp(value));
}

function getTopFocusSkills(progress?: ProgressLike) {
  const weak = progress?.skills?.weak ?? [];
  const developing = progress?.skills?.developing ?? [];
  const combined = [...weak, ...developing];

  if (combined.length > 0) return combined.slice(0, 3);

  return [
    { name: "Fractions", domain: "Number Sense", score: 28 },
    { name: "Division", domain: "Operations", score: 35 },
    { name: "Word Problems", domain: "Problem Solving", score: 50 },
  ];
}

function buildSkillDeltas(progress?: ProgressLike): SprintSkillDelta[] {
  return getTopFocusSkills(progress).map((skill, index) => {
    const baseline = Math.max(10, skill.score - (index === 0 ? 16 : 10));
    const growth = index === 0 ? 18 : 12;
    return {
      name: skill.name,
      domain: skill.domain,
      baseline: asPercent(baseline),
      current: asPercent(skill.score),
      target: asPercent(Math.max(skill.score + growth, 70)),
    };
  });
}

function buildSessions(focusSkills: SprintSkillDelta[], completed: number): SprintSession[] {
  const fallbackFocus = focusSkills.length > 0 ? focusSkills : buildSkillDeltas();

  return Array.from({ length: TARGET_SESSIONS }, (_, index) => {
    const number = index + 1;
    const focus = fallbackFocus[index % fallbackFocus.length];
    const status: SprintStatus = number <= completed ? "complete" : number === completed + 1 ? "current" : "planned";

    return {
      number,
      title: number === 1
        ? "Baseline diagnostic and confidence check"
        : number === TARGET_SESSIONS
          ? "Sprint proof report and next path"
          : `Targeted practice session ${number}`,
      focus: focus.name,
      status,
      outcome: status === "complete"
        ? `Practiced ${focus.name} and captured progress evidence.`
        : status === "current"
          ? `Next session focuses on ${focus.name}.`
          : `Planned support for ${focus.name}.`,
    };
  });
}

export function buildSprintReport(progress?: ProgressLike): SprintReport {
  const student = progress?.student;
  const stats = progress?.stats;
  const sessionsCompleted = Math.min(
    TARGET_SESSIONS,
    Math.max(stats?.lessonsCompletedThisWeek ?? 0, 0) + Math.max(stats?.tutorSessionsThisWeek ?? 0, 0)
  );
  const skillDeltas = buildSkillDeltas(progress);
  const avgConfidence = stats?.avgConfidence ?? student?.confidenceLevel ?? 5;
  const confidenceStart = Math.max(1, Math.round((student?.confidenceLevel ?? avgConfidence) - 1));
  const activationEvents = [
    (stats?.totalLessons ?? 0) > 0,
    sessionsCompleted >= 1,
    sessionsCompleted >= 3,
    skillDeltas.some((skill) => skill.current > skill.baseline),
  ];
  const completedActivation = activationEvents.filter(Boolean).length;

  return {
    studentId: student?.id ?? "demo-student-1",
    studentName: student?.name ?? "Alex",
    grade: student?.grade ?? 5,
    sprintName: "2-Week Math Recovery Sprint",
    periodLabel: "10 focused sessions over 2 weeks",
    diagnosticSummary: `${student?.name ?? "Alex"} needs the most support in ${skillDeltas
      .slice(0, 2)
      .map((skill) => skill.name)
      .join(" and ")}. The sprint starts there instead of repeating full-grade worksheets.`,
    parentSummary: progress?.latestReport?.progressSummary
      ?? `${student?.name ?? "Alex"} is showing early growth when practice is targeted and confidence stays visible. The next two weeks should focus on short, frequent sessions with parent-visible proof after each milestone.`,
    sessionsCompleted,
    targetSessions: TARGET_SESSIONS,
    minutesCompleted: stats?.timeSpentMinutes ?? 52,
    confidenceStart,
    confidenceCurrent: Math.round(avgConfidence * 10) / 10,
    activationRate: Math.round((completedActivation / activationEvents.length) * 100),
    skillDeltas,
    milestones: [
      {
        label: "Diagnostic complete",
        description: "Baseline skill gaps and confidence are visible.",
        complete: (stats?.totalLessons ?? 0) > 0 || skillDeltas.length > 0,
      },
      {
        label: "First lesson complete",
        description: "The student moved from diagnosis into practice.",
        complete: (stats?.totalLessons ?? 0) > 0,
      },
      {
        label: "Three-session habit",
        description: "Early repetition is strong enough to judge engagement.",
        complete: sessionsCompleted >= 3,
      },
      {
        label: "Parent proof ready",
        description: "The sprint has enough evidence for a useful parent report.",
        complete: sessionsCompleted >= 5 || Boolean(progress?.latestReport),
      },
    ],
    sessions: buildSessions(skillDeltas, sessionsCompleted),
    proofPoints: [
      `${sessionsCompleted}/${TARGET_SESSIONS} sprint sessions completed`,
      `${stats?.timeSpentMinutes ?? 52} minutes of focused math practice captured`,
      `Confidence moved from ${confidenceStart}/10 to ${Math.round(avgConfidence * 10) / 10}/10`,
      `${skillDeltas[0]?.name ?? "Fractions"} is the first measurable recovery focus`,
    ],
    nextSteps: progress?.latestReport?.recommendedNextSteps ?? [
      "Run the next three sessions on the first focus skill before adding new topics.",
      "Use one visual or real-world model in each practice session.",
      "Generate the sprint proof report after session 10 and decide the next focus area.",
    ],
  };
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
