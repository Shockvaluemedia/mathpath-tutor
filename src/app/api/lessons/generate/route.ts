import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";

function getDemoLesson(gradeBand: string) {
  const isMiddle = gradeBand === "MIDDLE_SCHOOL" || gradeBand === "MIDDLE";
  return {
    title: isMiddle ? "Solving One-Step Equations" : "Understanding Fractions with Visual Models",
    focusSkill: isMiddle ? "Equations" : "Fractions",
    gradeBand,
    warmup: {
      title: "Quick Review",
      instructions: "Let's warm up!",
      content: isMiddle ? "Before equations, let's review integers." : "Before fractions, let's review division.",
      questions: [
        { question: isMiddle ? "What is -5 + 8?" : "What is 12 ÷ 4?", hints: ["Think step by step"], answer: isMiddle ? "3" : "3", explanation: isMiddle ? "-5 + 8 = 3" : "12 ÷ 4 = 3" },
      ],
    },
    miniLesson: {
      title: isMiddle ? "What Is an Equation?" : "What Are Fractions?",
      instructions: "Read carefully!",
      content: isMiddle ? "An equation is like a balance scale. Both sides must be equal.\n\nTo solve x + 5 = 12, do the OPPOSITE operation to both sides." : "A fraction represents a PART of a whole.\n\n🍕 Cut a pizza into 4 slices, eat 1 = 1/4.\n\nBottom number = total parts. Top number = parts you're talking about.",
      questions: [],
    },
    guidedPractice: {
      title: "Let's Practice Together",
      instructions: "Try these with hints!",
      content: "Solve each problem.",
      questions: [
        { question: isMiddle ? "Solve: x + 3 = 10" : "A pie has 8 slices. You eat 3. What fraction did you eat?", hints: [isMiddle ? "Subtract 3 from both sides" : "Slices eaten / total slices"], answer: isMiddle ? "7" : "3/8", explanation: isMiddle ? "x = 10 - 3 = 7" : "3 out of 8 = 3/8" },
        { question: isMiddle ? "Solve: x - 4 = 9" : "Which is bigger: 1/2 or 1/4?", hints: [isMiddle ? "Add 4 to both sides" : "Fewer pieces = bigger pieces"], answer: isMiddle ? "13" : "1/2", explanation: isMiddle ? "x = 9 + 4 = 13" : "1/2 is bigger" },
      ],
    },
    independentPractice: {
      title: "Your Turn!",
      instructions: "Try these on your own!",
      content: "You've got this.",
      questions: [
        { question: isMiddle ? "Solve: 2x = 14" : "Write a fraction: 5 out of 10 parts", hints: [isMiddle ? "Divide both sides by 2" : "Numerator/Denominator"], answer: isMiddle ? "7" : "5/10", explanation: isMiddle ? "x = 14 ÷ 2 = 7" : "5/10 (equals 1/2!)" },
        { question: isMiddle ? "Solve: x/4 = 5" : "What fraction of a week is 3 days?", hints: [isMiddle ? "Multiply both sides by 4" : "Days in a week = 7"], answer: isMiddle ? "20" : "3/7", explanation: isMiddle ? "x = 5 × 4 = 20" : "3 out of 7 = 3/7" },
      ],
    },
    challenge: {
      title: "Challenge",
      instructions: "Stretch yourself!",
      content: "Try this harder one.",
      questions: [
        { question: isMiddle ? "Solve: 2x + 3 = 11" : "Sam ate 2/8 and Kim ate 3/8. Total?", hints: [isMiddle ? "First subtract 3, then divide by 2" : "Add numerators when denominators match"], answer: isMiddle ? "4" : "5/8", explanation: isMiddle ? "2x = 8, x = 4" : "2/8 + 3/8 = 5/8" },
      ],
    },
    reflection: {
      title: "Reflection",
      instructions: "Think about what you learned.",
      content: isMiddle ? "Nice work! What's the key idea? (Do the opposite operation!)" : "Great work! Fractions are just parts of things. You use them every day!",
      questions: [],
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      const { DEMO_STUDENTS } = await import("@/lib/demo-data");
      const student = DEMO_STUDENTS.find((s) => s.id === studentId);
      const gradeBand = student?.gradeBand || "ELEMENTARY";
      const lesson = getDemoLesson(gradeBand);
      return NextResponse.json({ lesson, lessonId: `demo-lesson-${Date.now()}` });
    }

    // Production
    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const learner = await prisma.learner.findUnique({
      where: { id: studentId },
      include: { profile: true, skillMastery: { include: { skill: true } } },
    });
    if (!learner) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const gradeBand = learner.developmentalStage === "EARLY_CHILDHOOD" ? "EARLY_ELEMENTARY"
      : learner.developmentalStage === "MIDDLE" ? "MIDDLE_SCHOOL"
      : learner.developmentalStage;

    // Try AI generation
    let lesson;
    try {
      const { generateDailyLesson } = await import("@/lib/ai");
      const studentProfile = {
        id: learner.id,
        name: learner.name,
        age: learner.age,
        grade: learner.grade,
        gradeBand,
        confidenceLevel: learner.profile?.confidenceLevel || 5,
        learningPreferences: learner.profile?.preferences as any || {},
      };

      const skillProfile = {
        estimatedLevel: `Grade ${learner.grade}`,
        levelComparison: "On track",
        masteredSkills: learner.skillMastery.filter((sm) => sm.status === "MASTERED").map((sm) => ({
          id: sm.skillId, name: sm.skill.name, domain: sm.skill.domainId, masteryScore: sm.masteryScore, confidenceScore: sm.confidenceScore, status: sm.status,
        })),
        developingSkills: learner.skillMastery.filter((sm) => sm.status === "DEVELOPING" || sm.status === "PRACTICING").map((sm) => ({
          id: sm.skillId, name: sm.skill.name, domain: sm.skill.domainId, masteryScore: sm.masteryScore, confidenceScore: sm.confidenceScore, status: sm.status,
        })),
        weakSkills: learner.skillMastery.filter((sm) => sm.status === "NOT_STARTED" || sm.status === "EMERGING" || sm.masteryScore < 40).map((sm) => ({
          id: sm.skillId, name: sm.skill.name, domain: sm.skill.domainId, masteryScore: sm.masteryScore, confidenceScore: sm.confidenceScore, status: sm.status,
        })),
        rootCauses: [],
        recommendedStartingPoint: "",
      };

      lesson = await generateDailyLesson(studentProfile, skillProfile);
    } catch {
      // Fallback to demo lesson
      lesson = getDemoLesson(gradeBand);
    }

    // Save the module
    const mathDomain = await prisma.subjectDomain.findUnique({ where: { slug: "mathematics" } });
    const firstSkill = learner.skillMastery[0]?.skillId || (await prisma.learningSkill.findFirst({ where: { domainId: mathDomain?.id } }))?.id;

    if (mathDomain && firstSkill) {
      const savedModule = await prisma.learningModule.create({
        data: {
          learnerId: studentId,
          domainId: mathDomain.id,
          skillId: firstSkill,
          title: lesson.title || "Daily Lesson",
          contentType: "LESSON",
          stage: learner.developmentalStage,
          content: JSON.parse(JSON.stringify(lesson)),
        },
      });
      return NextResponse.json({ lesson, lessonId: savedModule.id });
    }

    return NextResponse.json({ lesson, lessonId: `lesson-${Date.now()}` });
  } catch (error) {
    console.error("Generate lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
