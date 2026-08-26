import { prisma } from "@/lib/db";
import { SkillGraph } from "./skill-graph";

export async function loadSkillGraph(domainId?: string): Promise<SkillGraph> {
  const skills = await prisma.learningSkill.findMany({
    where: domainId ? { domainId } : undefined,
    select: { id: true, slug: true, name: true, domainId: true },
  });
  const skillIds = skills.map((skill) => skill.id);
  const dependencies = await prisma.skillDependency.findMany({
    where: domainId
      ? {
          prerequisiteSkillId: { in: skillIds },
          dependentSkillId: { in: skillIds },
        }
      : undefined,
    select: {
      prerequisiteSkillId: true,
      dependentSkillId: true,
      dependencyType: true,
      weight: true,
      minimumMasteryRequired: true,
    },
  });

  return new SkillGraph(skills, dependencies);
}
