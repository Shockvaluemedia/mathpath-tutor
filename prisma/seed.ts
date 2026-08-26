import { Prisma, PrismaClient, type DevelopmentalStage } from "@prisma/client";
import { SkillGraph } from "../src/lib/learning/graph/skill-graph";
import type { SkillDependencyKind } from "../src/lib/learning/graph/types";
import { MATH_MISCONCEPTION_CATALOG } from "../src/lib/math/misconceptions/catalog";

const prisma = new PrismaClient();

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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

interface MathSkillSeed {
  slug: string;
  name: string;
  description: string;
  difficulty: number;
  stageMin: DevelopmentalStage;
  stageMax: DevelopmentalStage;
  gradeMin: number;
  gradeMax: number;
  prerequisites: string[];
}

const mathSkills: MathSkillSeed[] = [
  { slug: "counting", name: "Counting to 20", description: "Count objects and numbers up to 20", difficulty: 1, stageMin: "EARLY_CHILDHOOD", stageMax: "EARLY_CHILDHOOD", gradeMin: 0, gradeMax: 1, prerequisites: [] },
  { slug: "number-recognition", name: "Number Recognition", description: "Identify and name numbers 0-20", difficulty: 1, stageMin: "EARLY_CHILDHOOD", stageMax: "EARLY_CHILDHOOD", gradeMin: 0, gradeMax: 1, prerequisites: [] },
  { slug: "number-sense-whole-numbers", name: "Whole Number Sense", description: "Compare, compose, decompose, and reason about whole-number magnitude", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 1, gradeMax: 4, prerequisites: ["number-recognition"] },
  { slug: "addition-basic", name: "Addition (single digit)", description: "Add single-digit numbers", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 0, gradeMax: 2, prerequisites: ["counting"] },
  { slug: "subtraction-basic", name: "Subtraction (single digit)", description: "Subtract single-digit numbers", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 0, gradeMax: 2, prerequisites: ["counting"] },
  { slug: "patterns", name: "Patterns", description: "Identify and extend simple patterns", difficulty: 2, stageMin: "EARLY_CHILDHOOD", stageMax: "ELEMENTARY", gradeMin: 0, gradeMax: 2, prerequisites: ["counting"] },
  { slug: "multiplication", name: "Multiplication", description: "Multiply single and multi-digit numbers", difficulty: 3, stageMin: "ELEMENTARY", stageMax: "ELEMENTARY", gradeMin: 3, gradeMax: 5, prerequisites: ["addition-basic"] },
  { slug: "division", name: "Division", description: "Divide numbers with and without remainders", difficulty: 3, stageMin: "ELEMENTARY", stageMax: "ELEMENTARY", gradeMin: 3, gradeMax: 5, prerequisites: ["multiplication"] },
  { slug: "fractions", name: "Fractions", description: "Understand, compare, and operate with fractions", difficulty: 4, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 3, gradeMax: 6, prerequisites: ["division"] },
  { slug: "fraction-equivalence", name: "Fraction Equivalence", description: "Recognize and generate equivalent fractions using multiplicative relationships", difficulty: 4, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 3, gradeMax: 6, prerequisites: ["fractions", "multiplication"] },
  { slug: "fraction-addition-unlike-denominators", name: "Add Fractions with Unlike Denominators", description: "Use equivalent fractions and common denominators to add fractions", difficulty: 5, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 4, gradeMax: 7, prerequisites: ["fraction-equivalence"] },
  { slug: "decimals", name: "Decimals", description: "Understand and operate with decimal numbers", difficulty: 4, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 4, gradeMax: 6, prerequisites: ["fractions"] },
  { slug: "percentages", name: "Percentages", description: "Interpret percentages and connect fractions, decimals, and rates per hundred", difficulty: 5, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 5, gradeMax: 8, prerequisites: ["fractions", "decimals"] },
  { slug: "pre-algebra", name: "Pre-Algebra", description: "Variables, expressions, order of operations", difficulty: 5, stageMin: "MIDDLE", stageMax: "MIDDLE", gradeMin: 6, gradeMax: 8, prerequisites: ["multiplication", "division", "fractions"] },
  { slug: "ratios", name: "Ratios & Proportions", description: "Understand and solve ratio problems", difficulty: 5, stageMin: "MIDDLE", stageMax: "MIDDLE", gradeMin: 6, gradeMax: 7, prerequisites: ["fractions", "decimals"] },
  { slug: "integers", name: "Integers", description: "Operations with positive and negative numbers", difficulty: 5, stageMin: "MIDDLE", stageMax: "MIDDLE", gradeMin: 6, gradeMax: 7, prerequisites: ["subtraction-basic"] },
  { slug: "integer-operations", name: "Integer Operations", description: "Add, subtract, multiply, and divide signed integers", difficulty: 5, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 6, gradeMax: 9, prerequisites: ["integers", "subtraction-basic"] },
  { slug: "expressions", name: "Algebraic Expressions", description: "Interpret, evaluate, and simplify expressions with variables", difficulty: 5, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 6, gradeMax: 9, prerequisites: ["integer-operations", "multiplication"] },
  { slug: "distributive-property", name: "Distributive Property", description: "Use multiplication over addition or subtraction to rewrite expressions", difficulty: 5, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 6, gradeMax: 9, prerequisites: ["multiplication", "expressions"] },
  { slug: "equality", name: "Equality", description: "Interpret the equal sign as a relationship between equivalent quantities", difficulty: 3, stageMin: "ELEMENTARY", stageMax: "HIGH_SCHOOL", gradeMin: 1, gradeMax: 9, prerequisites: ["addition-basic", "subtraction-basic"] },
  { slug: "one-step-equations", name: "One-Step Equations", description: "Solve equations using one inverse operation while preserving equality", difficulty: 5, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 6, gradeMax: 9, prerequisites: ["equality", "integer-operations", "expressions"] },
  { slug: "two-step-equations", name: "Two-Step Equations", description: "Solve equations using two inverse operations in a valid sequence", difficulty: 6, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 7, gradeMax: 10, prerequisites: ["one-step-equations", "distributive-property"] },
  { slug: "equations", name: "Expressions & Equations", description: "Write, simplify, and solve equations", difficulty: 6, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 6, gradeMax: 9, prerequisites: ["pre-algebra"] },
  { slug: "linear-equations", name: "Linear Equations", description: "Solve and graph linear equations", difficulty: 7, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 10, prerequisites: ["equations"] },
  { slug: "quadratics", name: "Quadratic Equations", description: "Solve quadratics by factoring and formula", difficulty: 8, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 10, prerequisites: ["linear-equations"] },
  { slug: "functions", name: "Functions", description: "Function notation, domain, range, transformations", difficulty: 8, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 11, prerequisites: ["linear-equations"] },
  { slug: "statistics", name: "Statistics & Probability", description: "Mean, median, mode, standard deviation, probability", difficulty: 6, stageMin: "HIGH_SCHOOL", stageMax: "HIGH_SCHOOL", gradeMin: 9, gradeMax: 12, prerequisites: ["ratios"] },
  { slug: "geometry-basics", name: "Basic Geometry", description: "Reason about shapes, angle measures, perimeter, area, and spatial relationships", difficulty: 4, stageMin: "ELEMENTARY", stageMax: "MIDDLE", gradeMin: 3, gradeMax: 8, prerequisites: ["number-sense-whole-numbers", "multiplication"] },
  { slug: "coordinate-plane", name: "Coordinate Plane", description: "Locate and reason about ordered pairs across four quadrants", difficulty: 5, stageMin: "MIDDLE", stageMax: "HIGH_SCHOOL", gradeMin: 5, gradeMax: 9, prerequisites: ["integer-operations", "geometry-basics"] },
];

interface SkillDependencySeed {
  prerequisiteSlug: string;
  dependentSlug: string;
  dependencyType: SkillDependencyKind;
  weight: number;
  minimumMasteryRequired: number;
}

const mathSkillDependencies: SkillDependencySeed[] = [
  { prerequisiteSlug: "number-recognition", dependentSlug: "number-sense-whole-numbers", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "number-sense-whole-numbers", dependentSlug: "addition-basic", dependencyType: "SUPPORTING", weight: 0.6, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "number-sense-whole-numbers", dependentSlug: "subtraction-basic", dependencyType: "SUPPORTING", weight: 0.6, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "addition-basic", dependentSlug: "multiplication", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
  { prerequisiteSlug: "multiplication", dependentSlug: "division", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
  { prerequisiteSlug: "division", dependentSlug: "fractions", dependencyType: "REQUIRED", weight: 0.9, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "fractions", dependentSlug: "fraction-equivalence", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
  { prerequisiteSlug: "multiplication", dependentSlug: "fraction-equivalence", dependencyType: "SUPPORTING", weight: 0.6, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "fraction-equivalence", dependentSlug: "fraction-addition-unlike-denominators", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
  { prerequisiteSlug: "fraction-equivalence", dependentSlug: "decimals", dependencyType: "SUPPORTING", weight: 0.5, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "fractions", dependentSlug: "ratios", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "decimals", dependentSlug: "ratios", dependencyType: "SUPPORTING", weight: 0.6, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "fractions", dependentSlug: "percentages", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "decimals", dependentSlug: "percentages", dependencyType: "REQUIRED", weight: 0.9, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "subtraction-basic", dependentSlug: "integers", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "integers", dependentSlug: "integer-operations", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.75 },
  { prerequisiteSlug: "integer-operations", dependentSlug: "expressions", dependencyType: "REQUIRED", weight: 0.9, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "multiplication", dependentSlug: "distributive-property", dependencyType: "REQUIRED", weight: 0.9, minimumMasteryRequired: 0.75 },
  { prerequisiteSlug: "expressions", dependentSlug: "distributive-property", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "addition-basic", dependentSlug: "equality", dependencyType: "SUPPORTING", weight: 0.5, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "subtraction-basic", dependentSlug: "equality", dependencyType: "SUPPORTING", weight: 0.5, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "equality", dependentSlug: "one-step-equations", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
  { prerequisiteSlug: "integer-operations", dependentSlug: "one-step-equations", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "expressions", dependentSlug: "one-step-equations", dependencyType: "REQUIRED", weight: 0.8, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "one-step-equations", dependentSlug: "two-step-equations", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
  { prerequisiteSlug: "distributive-property", dependentSlug: "two-step-equations", dependencyType: "SUPPORTING", weight: 0.7, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "two-step-equations", dependentSlug: "linear-equations", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
  { prerequisiteSlug: "linear-equations", dependentSlug: "functions", dependencyType: "REQUIRED", weight: 1, minimumMasteryRequired: 0.8 },
  { prerequisiteSlug: "number-sense-whole-numbers", dependentSlug: "geometry-basics", dependencyType: "SUPPORTING", weight: 0.4, minimumMasteryRequired: 0.6 },
  { prerequisiteSlug: "multiplication", dependentSlug: "geometry-basics", dependencyType: "SUPPORTING", weight: 0.5, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "integer-operations", dependentSlug: "coordinate-plane", dependencyType: "REQUIRED", weight: 0.9, minimumMasteryRequired: 0.7 },
  { prerequisiteSlug: "geometry-basics", dependentSlug: "coordinate-plane", dependencyType: "SUPPORTING", weight: 0.5, minimumMasteryRequired: 0.65 },
  { prerequisiteSlug: "coordinate-plane", dependentSlug: "linear-equations", dependencyType: "SUPPORTING", weight: 0.6, minimumMasteryRequired: 0.65 },
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
      update: { ...skill, domainId: mathDomain.id },
      create: { ...skill, domainId: mathDomain.id, masteryThreshold: 80, interventionRecs: [], metadata: {} },
    });
  }
  console.log(`  ✓ ${mathSkills.length} math skills created\n`);

  const seededMathSkills = await prisma.learningSkill.findMany({
    where: { domainId: mathDomain.id },
    select: { id: true, slug: true, name: true, domainId: true },
  });
  const skillBySlug = new Map(seededMathSkills.map((skill) => [skill.slug, skill]));
  const legacyDependencySeeds: SkillDependencySeed[] = mathSkills.flatMap((skill) =>
    skill.prerequisites.map((prerequisiteSlug) => ({
      prerequisiteSlug,
      dependentSlug: skill.slug,
      dependencyType: "REQUIRED",
      weight: 0.8,
      minimumMasteryRequired: 0.7,
    }))
  );
  const dependencySeeds = new Map<string, SkillDependencySeed>();
  for (const dependency of [...legacyDependencySeeds, ...mathSkillDependencies]) {
    dependencySeeds.set(
      `${dependency.prerequisiteSlug}->${dependency.dependentSlug}`,
      dependency
    );
  }
  const dependencyRecords = [...dependencySeeds.values()].map((dependency) => {
    const prerequisite = skillBySlug.get(dependency.prerequisiteSlug);
    const dependent = skillBySlug.get(dependency.dependentSlug);
    if (!prerequisite || !dependent) {
      throw new Error(
        `Cannot seed dependency ${dependency.prerequisiteSlug} -> ${dependency.dependentSlug}: skill not found`
      );
    }
    return {
      prerequisiteSkillId: prerequisite.id,
      dependentSkillId: dependent.id,
      dependencyType: dependency.dependencyType,
      weight: dependency.weight,
      minimumMasteryRequired: dependency.minimumMasteryRequired,
    };
  });
  const graph = new SkillGraph(seededMathSkills, dependencyRecords);
  const graphIssues = graph.validateIntegrity();
  if (graphIssues.length > 0) {
    throw new Error(`Invalid mathematics skill graph: ${JSON.stringify(graphIssues)}`);
  }

  console.log("Creating mathematics skill dependencies...");
  for (const dependency of dependencyRecords) {
    await prisma.skillDependency.upsert({
      where: {
        prerequisiteSkillId_dependentSkillId: {
          prerequisiteSkillId: dependency.prerequisiteSkillId,
          dependentSkillId: dependency.dependentSkillId,
        },
      },
      update: dependency,
      create: dependency,
    });
  }
  console.log(`  ✓ ${dependencyRecords.length} dependency edges created\n`);

  console.log("Creating misconception catalog...");
  for (const definition of MATH_MISCONCEPTION_CATALOG) {
    const skill = skillBySlug.get(definition.skillSlug);
    if (!skill) {
      throw new Error(`Cannot seed misconception ${definition.code}: skill ${definition.skillSlug} not found`);
    }
    await prisma.misconception.upsert({
      where: { code: definition.code },
      update: {
        skillId: skill.id,
        name: definition.name,
        description: definition.description,
        signature: toInputJson(definition.signature),
        severity: definition.severity,
        remediationStrategy: toInputJson(definition.remediationStrategy),
        diagnosticStrategy: toInputJson(definition.diagnosticStrategy),
        metadata: toInputJson(definition.metadata ?? {}),
        isActive: true,
      },
      create: {
        skillId: skill.id,
        code: definition.code,
        name: definition.name,
        description: definition.description,
        signature: toInputJson(definition.signature),
        severity: definition.severity,
        remediationStrategy: toInputJson(definition.remediationStrategy),
        diagnosticStrategy: toInputJson(definition.diagnosticStrategy),
        metadata: toInputJson(definition.metadata ?? {}),
      },
    });
  }
  console.log(`  ✓ ${MATH_MISCONCEPTION_CATALOG.length} misconceptions created\n`);

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
