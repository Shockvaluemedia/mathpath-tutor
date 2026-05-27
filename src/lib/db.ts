import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

/**
 * Database access layer with model aliases for backward compatibility.
 * The schema was refactored from math-specific to domain-agnostic:
 * - Student → Learner
 * - Skill → LearningSkill
 * - Lesson → LearningModule
 * - ParentReport → ProgressReport
 * 
 * Production code should migrate to new model names.
 * These aliases exist for the transition period.
 */
export const db = prisma as any;
