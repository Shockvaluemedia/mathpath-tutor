import { prisma } from "./db";
import type { TokenPayload } from "./auth";

export interface LearnerOwnership {
  id: string;
  guardianUserId: string;
  organizationUserIds?: string[];
}

export type LearnerOwnershipLookup = (
  learnerId: string
) => Promise<LearnerOwnership | null>;

export type LearnerAccessResult =
  | { ok: true; learner: LearnerOwnership }
  | { ok: false; status: 403 | 404; error: string };

const ASSIGNED_STAFF_ROLES = new Set<TokenPayload["role"]>([
  "MENTOR",
  "TEACHER",
  "TUTOR",
  "SCHOOL_ADMIN",
  "ORG_ADMIN",
  "FACILITATOR",
]);

export function canAccessLearner(
  user: TokenPayload,
  learner: LearnerOwnership
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "LEARNER") return user.userId === learner.id;
  if (user.userId === learner.guardianUserId) return true;

  return (
    ASSIGNED_STAFF_ROLES.has(user.role) &&
    learner.organizationUserIds?.includes(user.userId) === true
  );
}

async function lookupLearnerOwnership(
  learnerId: string
): Promise<LearnerOwnership | null> {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: {
      id: true,
      guardianUserId: true,
      guardian: {
        select: {
          memberships: {
            select: {
              organization: {
                select: {
                  memberships: { select: { userId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!learner) return null;

  return {
    id: learner.id,
    guardianUserId: learner.guardianUserId,
    organizationUserIds: Array.from(
      new Set(
        learner.guardian.memberships.flatMap((membership) =>
          membership.organization.memberships.map((member) => member.userId)
        )
      )
    ),
  };
}

export async function authorizeLearnerAccess(
  user: TokenPayload,
  learnerId: string,
  lookup: LearnerOwnershipLookup = lookupLearnerOwnership
): Promise<LearnerAccessResult> {
  const learner = await lookup(learnerId);

  if (!learner) {
    return { ok: false, status: 404, error: "Learner not found" };
  }

  if (!canAccessLearner(user, learner)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, learner };
}
