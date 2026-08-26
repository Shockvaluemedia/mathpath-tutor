import { prisma } from "@/lib/db";
import { assignLearningPathExperiment } from "@/lib/learning/evaluation";

export const SPRINT_EVENT_NAMES = [
  "invite_sent",
  "diagnostic_started",
  "diagnostic_completed",
  "first_lesson_started",
  "lesson_completed",
  "endline_started",
  "endline_completed",
  "sprint_report_viewed",
  "parent_feedback_submitted",
  "checkout_started",
  "payment_completed",
] as const;

export type SprintEventName = (typeof SPRINT_EVENT_NAMES)[number];

const sprintEventNames = new Set<string>(SPRINT_EVENT_NAMES);

export function isSprintEventName(value: unknown): value is SprintEventName {
  return typeof value === "string" && sprintEventNames.has(value);
}

export async function getLatestSprintEnrollment(learnerId: string) {
  return prisma.sprintEnrollment.findFirst({
    where: { learnerId },
    orderBy: { startedAt: "desc" },
  });
}

export async function getActiveSprintEnrollment(learnerId: string) {
  return prisma.sprintEnrollment.findFirst({
    where: { learnerId, status: "active" },
    orderBy: { startedAt: "desc" },
  });
}

export async function getOrCreateActiveSprintEnrollment(
  learnerId: string,
  details: { cohort?: string; source?: string } = {}
) {
  const existing = await getActiveSprintEnrollment(learnerId);

  if (existing) return existing;

  const learningPathVariant = await assignLearningPathExperiment(learnerId);

  return prisma.sprintEnrollment.create({
    data: {
      learnerId,
      cohort: details.cohort,
      source: details.source,
      learningPathVariant,
    },
  });
}

export async function recordSprintEvent({
  learnerId,
  enrollmentId,
  name,
  idempotencyKey,
  metadata = {},
}: {
  learnerId?: string;
  enrollmentId?: string;
  name: SprintEventName;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  const enrollment = enrollmentId
    ? await prisma.sprintEnrollment.findUnique({ where: { id: enrollmentId } })
    : learnerId
      ? await getOrCreateActiveSprintEnrollment(learnerId)
      : null;

  if (!enrollment) {
    throw new Error("Sprint enrollment required");
  }

  return prisma.sprintEvent.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      enrollmentId: enrollment.id,
      name,
      idempotencyKey,
      metadata: JSON.parse(JSON.stringify(metadata)),
    },
  });
}
