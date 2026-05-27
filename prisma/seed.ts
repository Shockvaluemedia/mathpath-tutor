import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const domains = [
  { slug: "mathematics", name: "Mathematics", description: "Number sense, operations, algebra, geometry, and data analysis", icon: "🔢", color: "#6366f1" },
  { slug: "reading", name: "Reading Comprehension", description: "Decoding, fluency, vocabulary, and comprehension strategies", icon: "📖", color: "#10b981" },
  { slug: "writing", name: "Writing", description: "Grammar, composition, creative writing, and communication", icon: "✍️", color: "#f59e0b" },
  { slug: "science", name: "Science", description: "Scientific method, earth science, life science, physical science", icon: "🔬", color: "#8b5cf6" },
  { slug: "ai-literacy", name: "AI Literacy", description: "Understanding AI, prompt engineering, ethical AI use", icon: "🤖", color: "#ec4899" },
  { slug: "financial-literacy", name: "Financial Literacy", description: "Budgeting, saving, investing, and financial decision-making", icon: "💰", color: "#14b8a6" },
  { slug: "entrepreneurship", name: "Entrepreneurship", description: "Business thinking, problem-solving, and value creation", icon: "🚀", color: "#f97316" },
  { slug: "leadership", name: "Leadership", description: "Communication, teamwork, decision-making, and influence", icon: "👑", color: "#eab308" },
];

const mathSkills = [
  { slug: "counting", name: "Counting to 20", description: "Count objects and numbers up to 20", difficulty: 1, stageMin: "EARLY_CHILDHOOD", stageMax: "EARLY_CHILDHOOD", gradeMin: 0, gradeMax: 1, prerequisites: [] },
  { slug: "number-recognition", name: "Number Recognition", description: "Identify and name numbers 0-20", difficulty: 1, stageMin: "EARLY_CHILDHOOD", stageMax: "EARLY_CHILDHOOD", gradeMin: 0, gradeMax: 1, prerequisites: [] },
  { slug: "addition-basic", name: "Addition (single digit)", description: "Add single-digit numbers", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 0, gradeMax: 2, prerequisites: ["counting"] },
  { slug: "subtraction-basic", name: "Subtraction (single digit)", description: "Subtract single-digit numbers", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 0, gradeMax: 2, prerequisites: ["counting"] },
  { slug: "patterns", name: "Patterns", description: "Identify and extend simple patterns", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 0, gradeMax: 2, prerequisites: ["counting"] },
  { slug: "multiplication", name: "Multiplication", description: "Multiply single and multi-digit numbers", difficulty: 3, stageMin: "ELEMENTARY", stageMax: "ELEMENTARY", gradeMin: 3, gradeMax: 5, prerequisites: ["addition-basic"] },
  { slug: "division", name: "Division", description: "Divide numbers with and without remainders", difficulty: 3, stageMin: "ELEMENTARY", stageMax: "ELEMENTARY", gradeMin: 3, gradeMax: 5, prerequisites: ["multiplication"] },
  { slug: "fractions", name: "Fractions", description: "Understand, compare, and operate with fractions", difficulty: 4, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 3, gradeMax: 6, prerequisites: ["division"] },
  { slug: "decimals", name: "Decimals", description: "Understand and operate with decimal numbers", difficulty: 4, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 4, gradeMax: 6, prerequisites: ["fractions"] },
  { slug: "pre-algebra", name: "Pre-Algebra", description: "Variables, expressions, order of operations", difficulty: 5, stageMin: "MIDDLE", stageMax: "MIDDLE", gradeMin: 6, gradeMax: 8, prerequisites: ["multiplication", "division", "fractions"] },
  { slug: "ratios", name: "Ratios & Proportions", description: "Understand and solve ratio problems", difficulty: 5, stageMin: "MIDDLE", stageMax: "MIDDLE", gradeMin: 6, gradeMax: 7, prerequisites: ["fractions", "decimals"] },
  { slug: "integers", name: "Integers", description: "Operations with positive and negative numbers", difficulty: 5, stageMin: "MIDDLE", stageMax: "MIDDLE", gradeMin: 6, gradeMax: 7, prerequisites: ["subtraction-basic"] },
  { slug: "equations", name: "Expressions & Equations", description: "Write, simplify, and solve equations", difficulty: 6, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 6, gradeMax: 9, prerequisites: ["pre-algebra"] },
  { slug: "linear-equations", name: "Linear Equations", description: "Solve and graph linear equations", difficulty: 7, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 10, prerequisites: ["equations"] },
  { slug: "quadratics", name: "Quadratic Equations", description: "Solve quadratics by factoring and formula", difficulty: 8, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 10, prerequisites: ["linear-equations"] },
  { slug: "functions", name: "Functions", description: "Function notation, domain, range, transformations", difficulty: 8, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 11, prerequisites: ["linear-equations"] },
  { slug: "statistics", name: "Statistics & Probability", description: "Mean, median, mode, standard deviation, probability", difficulty: 6, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 12, prerequisites: ["ratios"] },
];

async function main() {
  console.log("🌱 Seeding Adaptive Learning OS database...\n");

  // Create subject domains
  console.log("Creating subject domains...");
  for (const domain of domains) {
    await prisma.subjectDomain.upsert({
      where: { slug: domain.slug },
      update: domain,
      create: { ...domain, config: {} },
    });
  }
  console.log(`  ✓ ${domains.length} domains created\n`);

  // Get math domain ID
  const mathDomain = await prisma.subjectDomain.findUnique({ where: { slug: "mathematics" } });
  if (!mathDomain) throw new Error("Math domain not found");

  // Create math skills
  console.log("Creating mathematics skills...");
  for (const skill of mathSkills) {
    await prisma.learningSkill.upsert({
      where: { domainId_slug: { domainId: mathDomain.id, slug: skill.slug } },
      update: { ...skill, domainId: mathDomain.id, stageMin: skill.stageMin as any, stageMax: skill.stageMax as any },
      create: { ...skill, domainId: mathDomain.id, stageMin: skill.stageMin as any, stageMax: skill.stageMax as any, masteryThreshold: 80, interventionRecs: [], metadata: {} },
    });
  }
  console.log(`  ✓ ${mathSkills.length} math skills created\n`);

  // Create admin user
  console.log("Creating admin user...");
  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@mathpath.dev" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@mathpath.dev",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("  ✓ Admin user: admin@mathpath.dev / admin123\n");

  console.log("🏁 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
