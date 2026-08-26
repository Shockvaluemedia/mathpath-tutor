import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

export type LearningPathVariant = "ADAPTIVE" | "LINEAR";

export function selectLearningPathVariant(learnerId: string, experimentEnabled: boolean): LearningPathVariant {
  if (!experimentEnabled) return "ADAPTIVE";
  const bucket = createHash("sha256").update(`daily-path-v1:${learnerId}`).digest()[0] % 2;
  return bucket === 0 ? "ADAPTIVE" : "LINEAR";
}

export async function assignLearningPathExperiment(learnerId: string): Promise<LearningPathVariant> {
  const existing = await prisma.learningExperimentAssignment.findUnique({
    where: { learnerId_experimentKey: { learnerId, experimentKey: "daily-path-v1" } },
    select: { variant: true },
  });
  if (existing) return existing.variant as LearningPathVariant;
  const enabled = process.env.LEARNING_PATH_EXPERIMENT_ENABLED === "true";
  const variant = selectLearningPathVariant(learnerId, enabled);
  await prisma.learningExperimentAssignment.create({
    data: { learnerId, experimentKey: "daily-path-v1", variant, metadata: { assignment: "stable-sha256-bucket", optInEnabled: enabled } },
  });
  return variant;
}
