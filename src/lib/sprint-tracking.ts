export type SprintEventName =
  | "sprint_landing_viewed"
  | "diagnostic_started"
  | "diagnostic_completed"
  | "first_lesson_started"
  | "lesson_completed"
  | "sprint_report_viewed"
  | "parent_feedback_submitted";

export interface SprintEvent {
  name: SprintEventName;
  studentId?: string;
  createdAt: string;
}

const STORAGE_KEY = "mathpath_sprint_events_v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getSprintEvents(): SprintEvent[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function trackSprintEvent(name: SprintEventName, studentId?: string) {
  if (!canUseStorage()) return;

  const events = getSprintEvents();
  const alreadyTracked = events.some((event) => event.name === name && event.studentId === studentId);
  if (alreadyTracked) return;

  const nextEvents = [
    ...events,
    {
      name,
      studentId,
      createdAt: new Date().toISOString(),
    },
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents.slice(-50)));
}

export function hasSprintEvent(name: SprintEventName, studentId?: string) {
  return getSprintEvents().some((event) => event.name === name && event.studentId === studentId);
}

export function getSprintActivationSummary(studentId?: string) {
  const events = getSprintEvents().filter((event) => !studentId || event.studentId === studentId);
  const completed = new Set(events.map((event) => event.name));

  return [
    {
      label: "Diagnostic started",
      complete: completed.has("diagnostic_started"),
    },
    {
      label: "Diagnostic completed",
      complete: completed.has("diagnostic_completed"),
    },
    {
      label: "First lesson started",
      complete: completed.has("first_lesson_started"),
    },
    {
      label: "Lesson completed",
      complete: completed.has("lesson_completed"),
    },
    {
      label: "Sprint report viewed",
      complete: completed.has("sprint_report_viewed"),
    },
    {
      label: "Parent feedback submitted",
      complete: completed.has("parent_feedback_submitted"),
    },
  ];
}
