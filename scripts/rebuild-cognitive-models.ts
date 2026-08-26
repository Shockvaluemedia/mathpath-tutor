import { prisma } from "../src/lib/db";
import { recomputeLearnerCognitiveModel } from "../src/lib/learning/learner-model";

async function main() {
  const learners = await prisma.learner.findMany({ select: { id: true } });
  for (const [index, learner] of learners.entries()) {
    await recomputeLearnerCognitiveModel(learner.id);
    console.log(`Rebuilt cognitive model ${index + 1}/${learners.length}: ${learner.id}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
