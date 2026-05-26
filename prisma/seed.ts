import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skills = [
  // Early Elementary (K-2)
  { name: "Counting to 20", domain: "Number Sense", gradeMin: 0, gradeMax: 1, prerequisites: [], description: "Count objects and numbers up to 20" },
  { name: "Number Recognition", domain: "Number Sense", gradeMin: 0, gradeMax: 1, prerequisites: [], description: "Identify and name numbers 0-20" },
  { name: "Addition (single digit)", domain: "Operations", gradeMin: 0, gradeMax: 2, prerequisites: [], description: "Add single-digit numbers" },
  { name: "Subtraction (single digit)", domain: "Operations", gradeMin: 0, gradeMax: 2, prerequisites: [], description: "Subtract single-digit numbers" },
  { name: "Patterns", domain: "Algebra Readiness", gradeMin: 0, gradeMax: 2, prerequisites: [], description: "Identify and extend simple patterns" },
  { name: "Basic Shapes", domain: "Geometry", gradeMin: 0, gradeMax: 2, prerequisites: [], description: "Identify circles, squares, triangles, rectangles" },
  { name: "Comparing Numbers", domain: "Number Sense", gradeMin: 0, gradeMax: 2, prerequisites: [], description: "Compare numbers using greater than, less than, equal" },

  // Elementary (3-5)
  { name: "Multiplication", domain: "Operations", gradeMin: 3, gradeMax: 5, prerequisites: [], description: "Multiply single and multi-digit numbers" },
  { name: "Division", domain: "Operations", gradeMin: 3, gradeMax: 5, prerequisites: [], description: "Divide numbers with and without remainders" },
  { name: "Fractions", domain: "Number Sense", gradeMin: 3, gradeMax: 5, prerequisites: [], description: "Understand, compare, and operate with fractions" },
  { name: "Decimals", domain: "Number Sense", gradeMin: 4, gradeMax: 5, prerequisites: [], description: "Understand and operate with decimal numbers" },
  { name: "Word Problems", domain: "Problem Solving", gradeMin: 3, gradeMax: 5, prerequisites: [], description: "Solve multi-step word problems" },
  { name: "Place Value", domain: "Number Sense", gradeMin: 3, gradeMax: 5, prerequisites: [], description: "Understand place value to millions" },
  { name: "Measurement", domain: "Measurement", gradeMin: 3, gradeMax: 5, prerequisites: [], description: "Measure length, weight, volume, and time" },

  // Middle School (6-8)
  { name: "Pre-Algebra", domain: "Algebra", gradeMin: 6, gradeMax: 8, prerequisites: [], description: "Variables, simple expressions, order of operations" },
  { name: "Ratios & Proportions", domain: "Ratios", gradeMin: 6, gradeMax: 7, prerequisites: [], description: "Understand and solve ratio and proportion problems" },
  { name: "Integers", domain: "Number Sense", gradeMin: 6, gradeMax: 7, prerequisites: [], description: "Operations with positive and negative numbers" },
  { name: "Expressions & Equations", domain: "Algebra", gradeMin: 6, gradeMax: 8, prerequisites: [], description: "Write, simplify, and solve algebraic expressions and equations" },
  { name: "Percentages", domain: "Ratios", gradeMin: 6, gradeMax: 7, prerequisites: [], description: "Calculate percentages, discounts, tax, tips" },
  { name: "Coordinate Plane", domain: "Geometry", gradeMin: 6, gradeMax: 8, prerequisites: [], description: "Plot points and understand the coordinate system" },
  { name: "Geometry Fundamentals", domain: "Geometry", gradeMin: 6, gradeMax: 8, prerequisites: [], description: "Area, perimeter, volume of basic shapes" },

  // High School (9-12)
  { name: "Linear Equations", domain: "Algebra", gradeMin: 9, gradeMax: 10, prerequisites: [], description: "Solve and graph linear equations and inequalities" },
  { name: "Quadratic Equations", domain: "Algebra", gradeMin: 9, gradeMax: 10, prerequisites: [], description: "Solve quadratics by factoring, formula, and graphing" },
  { name: "Functions", domain: "Algebra", gradeMin: 9, gradeMax: 11, prerequisites: [], description: "Understand function notation, domain, range, transformations" },
  { name: "Geometry Proofs", domain: "Geometry", gradeMin: 9, gradeMax: 10, prerequisites: [], description: "Write and understand geometric proofs" },
  { name: "Trigonometry", domain: "Geometry", gradeMin: 10, gradeMax: 11, prerequisites: [], description: "Sine, cosine, tangent and their applications" },
  { name: "Statistics & Probability", domain: "Data", gradeMin: 9, gradeMax: 12, prerequisites: [], description: "Mean, median, mode, standard deviation, probability" },
  { name: "Systems of Equations", domain: "Algebra", gradeMin: 9, gradeMax: 11, prerequisites: [], description: "Solve systems using substitution, elimination, graphing" },
];

async function main() {
  console.log("Seeding database...");

  // Create skills
  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { id: skill.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
      update: skill,
      create: {
        id: skill.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        ...skill,
      },
    });
  }

  console.log(`Seeded ${skills.length} skills`);

  // Create demo admin user
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

  console.log("Created admin user: admin@mathpath.dev / admin123");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
