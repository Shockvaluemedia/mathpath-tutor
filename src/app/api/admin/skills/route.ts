import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

// In-memory store for demo mode
const demoSkills = [
  { id: "1", name: "Counting to 20", domain: "Number Sense", gradeMin: 0, gradeMax: 1, prerequisites: [], description: "Count objects and numbers up to 20" },
  { id: "2", name: "Number Recognition", domain: "Number Sense", gradeMin: 0, gradeMax: 1, prerequisites: [], description: "Identify and name numbers 0-20" },
  { id: "3", name: "Addition (single digit)", domain: "Operations", gradeMin: 0, gradeMax: 2, prerequisites: ["1", "2"], description: "Add single-digit numbers" },
  { id: "4", name: "Subtraction (single digit)", domain: "Operations", gradeMin: 0, gradeMax: 2, prerequisites: ["1", "2"], description: "Subtract single-digit numbers" },
  { id: "5", name: "Patterns", domain: "Algebra Readiness", gradeMin: 0, gradeMax: 2, prerequisites: ["1"], description: "Identify and extend simple patterns" },
  { id: "6", name: "Multiplication", domain: "Operations", gradeMin: 3, gradeMax: 5, prerequisites: ["3"], description: "Multiply single and multi-digit numbers" },
  { id: "7", name: "Division", domain: "Operations", gradeMin: 3, gradeMax: 5, prerequisites: ["6"], description: "Divide numbers with and without remainders" },
  { id: "8", name: "Fractions", domain: "Number Sense", gradeMin: 3, gradeMax: 5, prerequisites: ["7"], description: "Understand, compare, and operate with fractions" },
  { id: "9", name: "Decimals", domain: "Number Sense", gradeMin: 4, gradeMax: 5, prerequisites: ["8"], description: "Understand and operate with decimal numbers" },
  { id: "10", name: "Word Problems", domain: "Problem Solving", gradeMin: 3, gradeMax: 5, prerequisites: ["6", "7"], description: "Solve multi-step word problems" },
  { id: "11", name: "Pre-Algebra", domain: "Algebra", gradeMin: 6, gradeMax: 8, prerequisites: ["6", "7", "8"], description: "Variables, expressions, order of operations" },
  { id: "12", name: "Ratios & Proportions", domain: "Ratios", gradeMin: 6, gradeMax: 7, prerequisites: ["8", "9"], description: "Understand and solve ratio problems" },
  { id: "13", name: "Integers", domain: "Number Sense", gradeMin: 6, gradeMax: 7, prerequisites: ["4"], description: "Operations with positive and negative numbers" },
  { id: "14", name: "Expressions & Equations", domain: "Algebra", gradeMin: 6, gradeMax: 8, prerequisites: ["11"], description: "Write, simplify, and solve equations" },
  { id: "15", name: "Linear Equations", domain: "Algebra", gradeMin: 9, gradeMax: 10, prerequisites: ["14"], description: "Solve and graph linear equations" },
  { id: "16", name: "Quadratic Equations", domain: "Algebra", gradeMin: 9, gradeMax: 10, prerequisites: ["15"], description: "Solve quadratics by factoring and formula" },
  { id: "17", name: "Functions", domain: "Algebra", gradeMin: 9, gradeMax: 11, prerequisites: ["15"], description: "Function notation, domain, range, transformations" },
  { id: "18", name: "Statistics & Probability", domain: "Data", gradeMin: 9, gradeMax: 12, prerequisites: ["12"], description: "Mean, median, mode, standard deviation, probability" },
];

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({ skills: demoSkills });
  }

  const { db: prisma } = await import("@/lib/db");
  const skills = await prisma.skill.findMany({ orderBy: [{ gradeMin: "asc" }, { name: "asc" }] });
  return NextResponse.json({ skills });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, gradeMin, gradeMax, prerequisites, description } = body;

    if (!name || !domain || gradeMin === undefined || gradeMax === undefined) {
      return NextResponse.json({ error: "Name, domain, gradeMin, and gradeMax are required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const newSkill = {
        id: `skill-${Date.now()}`,
        name,
        domain,
        gradeMin,
        gradeMax,
        prerequisites: prerequisites || [],
        description: description || "",
      };
      demoSkills.push(newSkill);
      return NextResponse.json({ skill: newSkill });
    }

    const { db: prisma } = await import("@/lib/db");
    const skill = await prisma.skill.create({
      data: { name, domain, gradeMin, gradeMax, prerequisites: prerequisites || [], description: description || "" },
    });
    return NextResponse.json({ skill });
  } catch (error) {
    console.error("Create skill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
