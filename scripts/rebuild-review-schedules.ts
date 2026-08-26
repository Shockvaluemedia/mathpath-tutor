import { prisma } from "../src/lib/db";
import { rebuildLearnerReviewSchedules } from "../src/lib/learning/retention";

async function main() {
  const learners = await prisma.learner.findMany({ select: { id: true } });
  let scheduleCount = 0;
  for (const learner of learners) {
    const schedules = await rebuildLearnerReviewSchedules(learner.id);
    scheduleCount += schedules.filter(Boolean).length;
  }
  console.log(`Rebuilt ${scheduleCount} skill review schedules for ${learners.length} learners.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
