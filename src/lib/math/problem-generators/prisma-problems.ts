import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { GeneratedProblem } from "./types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function persistProblemInstance(input: {
  learnerId: string;
  problem: GeneratedProblem;
}) {
  const { learnerId, problem } = input;
  const code = `${problem.templateCode}:${problem.targetSkillId}`;
  const template = await prisma.problemTemplate.upsert({
    where: { code },
    create: {
      code,
      templateType: problem.templateCode,
      name: problem.templateName,
      targetSkillId: problem.targetSkillId,
      prerequisiteSkillIds: problem.prerequisiteSkillIds,
      difficultyMin: 1,
      difficultyMax: 5,
      representationTypes: ["symbolic", "real-world-context"],
      misconceptionCodes: problem.distractors.flatMap((item) => item.misconceptionCode ? [item.misconceptionCode] : []),
      competencyCodes: problem.competencyCodes,
      transferTypes: problem.transferType ? [problem.transferType] : [],
      constraints: toJson(problem.constraints),
      rules: {
        create: Object.entries(problem.constraints).map(([key, value], sortOrder) => ({
          key,
          value: toJson(value),
          sortOrder,
        })),
      },
    },
    update: {
      name: problem.templateName,
      prerequisiteSkillIds: problem.prerequisiteSkillIds,
      representationTypes: ["symbolic", "real-world-context"],
      misconceptionCodes: problem.distractors.flatMap((item) => item.misconceptionCode ? [item.misconceptionCode] : []),
      competencyCodes: problem.competencyCodes,
      transferTypes: problem.transferType ? [problem.transferType] : [],
      constraints: toJson(problem.constraints),
      generatorVersion: problem.generatorVersion,
      isActive: true,
    },
  });
  return prisma.problemInstance.upsert({
    where: {
      templateId_seed_learnerId: {
        templateId: template.id,
        seed: problem.seed,
        learnerId,
      },
    },
    create: {
      templateId: template.id,
      learnerId,
      seed: problem.seed,
      targetSkillId: problem.targetSkillId,
      prerequisiteSkillIds: problem.prerequisiteSkillIds,
      difficulty: problem.difficulty,
      prompt: problem.prompt,
      correctAnswer: problem.correctAnswer,
      explanation: problem.explanation,
      answerType: problem.answerType,
      parameters: toJson(problem.parameters),
      distractors: toJson(problem.distractors),
      representationType: problem.representationType,
      contextType: problem.contextType,
      transferType: problem.transferType,
      competencyCodes: problem.competencyCodes,
      requiredOperationCount: problem.requiredOperationCount,
      validation: toJson(problem.validation),
      generatorVersion: problem.generatorVersion,
    },
    update: {},
  });
}

export function publicProblemInstance(instance: {
  id: string;
  targetSkillId: string;
  difficulty: number;
  prompt: string;
  answerType: string;
  distractors: Prisma.JsonValue;
  representationType: string;
}) {
  return {
    id: instance.id,
    skillId: instance.targetSkillId,
    question: instance.prompt,
    difficulty: instance.difficulty,
    answerType: instance.answerType,
    distractors: instance.distractors,
    representationType: instance.representationType,
  };
}
