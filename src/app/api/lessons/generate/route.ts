import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";

function getDemoLesson(gradeBand: string) {
  if (gradeBand === "MIDDLE_SCHOOL") {
    return {
      title: "Solving One-Step Equations",
      focusSkill: "Equations",
      gradeBand,
      warmup: {
        title: "Quick Review",
        instructions: "Let's warm up with some integer operations!",
        content: "Before we solve equations, let's make sure we're solid with positive and negative numbers.",
        questions: [
          { question: "What is -5 + 8?", hints: ["Start at -5 and move 8 to the right"], answer: "3", explanation: "-5 + 8 = 3 because you move 8 steps right from -5" },
          { question: "What is 12 - 15?", hints: ["You're subtracting more than you have"], answer: "-3", explanation: "12 - 15 = -3 because you go 3 below zero" },
        ],
      },
      miniLesson: {
        title: "What Is an Equation?",
        instructions: "Read carefully — this is the key concept for today!",
        content: "An equation is like a balance scale. Both sides must be equal.\n\nWhen we see x + 5 = 12, we're asking: \"What number plus 5 gives us 12?\"\n\nTo solve, we do the OPPOSITE operation to both sides:\n• If something is added, we subtract it\n• If something is subtracted, we add it\n• If something is multiplied, we divide\n• If something is divided, we multiply\n\nThe goal: get x alone on one side.",
        questions: [],
      },
      guidedPractice: {
        title: "Let's Solve Together",
        instructions: "Try these step by step. Remember: do the opposite operation!",
        content: "Solve each equation for x.",
        questions: [
          { question: "x + 3 = 10", hints: ["Subtract 3 from both sides"], answer: "7", explanation: "x + 3 = 10 → x = 10 - 3 → x = 7" },
          { question: "x - 4 = 9", hints: ["Add 4 to both sides"], answer: "13", explanation: "x - 4 = 9 → x = 9 + 4 → x = 13" },
          { question: "2x = 14", hints: ["Divide both sides by 2"], answer: "7", explanation: "2x = 14 → x = 14 ÷ 2 → x = 7" },
        ],
      },
      independentPractice: {
        title: "Your Turn!",
        instructions: "Solve these on your own. You've got this!",
        content: "Find the value of x in each equation.",
        questions: [
          { question: "x + 7 = 15", hints: ["Subtract 7 from both sides"], answer: "8", explanation: "x = 15 - 7 = 8" },
          { question: "x - 6 = 11", hints: ["Add 6 to both sides"], answer: "17", explanation: "x = 11 + 6 = 17" },
          { question: "3x = 21", hints: ["Divide both sides by 3"], answer: "7", explanation: "x = 21 ÷ 3 = 7" },
          { question: "x/4 = 5", hints: ["Multiply both sides by 4"], answer: "20", explanation: "x = 5 × 4 = 20" },
        ],
      },
      challenge: {
        title: "Challenge",
        instructions: "This one combines what you've learned!",
        content: "Try this two-step equation.",
        questions: [
          { question: "2x + 3 = 11. What is x?", hints: ["First subtract 3 from both sides", "Then divide by 2"], answer: "4", explanation: "2x + 3 = 11 → 2x = 8 → x = 4" },
        ],
      },
      reflection: {
        title: "Reflection",
        instructions: "Think about what you learned today.",
        content: "Nice work! You just solved equations — that's real algebra.\n\n• What's the key idea? (Do the opposite operation!)\n• Which type felt easiest?\n• Which type do you want more practice with?\n\nRemember: an equation is just a puzzle. You already know how to solve puzzles.",
        questions: [],
      },
    };
  }

  // Default: Elementary fractions lesson
  return {
    title: "Understanding Fractions with Visual Models",
    focusSkill: "Fractions",
    gradeBand,
    warmup: {
      title: "Quick Review",
      instructions: "Let's warm up with some problems you already know!",
      content: "Before we dive into fractions, let's make sure we're comfortable with division.",
      questions: [
        { question: "What is 12 ÷ 4?", hints: ["How many groups of 4 make 12?"], answer: "3", explanation: "12 ÷ 4 = 3 because 4 × 3 = 12" },
        { question: "What is 8 ÷ 2?", hints: ["Split 8 into 2 equal groups"], answer: "4", explanation: "8 ÷ 2 = 4 because 2 × 4 = 8" },
      ],
    },
    miniLesson: {
      title: "What Are Fractions?",
      instructions: "Read through this carefully. Take your time!",
      content: "A fraction represents a PART of a whole thing.\n\n🍕 If you cut a pizza into 4 equal slices and eat 1 slice, you ate 1/4.\n\nThe bottom number (denominator) = how many EQUAL parts total\nThe top number (numerator) = how many parts you're talking about\n\n3/4 means \"3 out of 4 equal parts\"\n\nKey: The parts MUST be equal!",
      questions: [],
    },
    guidedPractice: {
      title: "Let's Practice Together",
      instructions: "Try these problems. Use hints if you need them!",
      content: "Let's practice identifying fractions.",
      questions: [
        { question: "A pie is cut into 8 equal slices. You eat 3. What fraction did you eat?", hints: ["Total slices = denominator", "Slices eaten = numerator"], answer: "3/8", explanation: "3 out of 8 slices = 3/8" },
        { question: "What fraction is shaded if 2 out of 5 parts are colored?", hints: ["Colored parts on top, total on bottom"], answer: "2/5", explanation: "2 shaded out of 5 total = 2/5" },
        { question: "Which is bigger: 1/2 or 1/4?", hints: ["Fewer pieces = bigger pieces"], answer: "1/2", explanation: "1/2 is bigger — fewer pieces means each piece is larger" },
      ],
    },
    independentPractice: {
      title: "Your Turn!",
      instructions: "Try these on your own. You've got this!",
      content: "Apply what you learned about fractions.",
      questions: [
        { question: "Write a fraction: 5 out of 10 equal parts", hints: ["Numerator/Denominator"], answer: "5/10", explanation: "5/10 (which also equals 1/2!)" },
        { question: "A chocolate bar has 6 pieces. You give away 2. What fraction is left?", hints: ["6 - 2 = 4 pieces left"], answer: "4/6", explanation: "4 pieces left out of 6 = 4/6" },
        { question: "Is 3/4 more or less than 1/2?", hints: ["Half of 4 is 2, and 3 > 2"], answer: "more", explanation: "3/4 > 1/2 because 3 is more than half of 4" },
        { question: "What fraction of a week is 3 days?", hints: ["A week has 7 days"], answer: "3/7", explanation: "3 days out of 7 = 3/7" },
      ],
    },
    challenge: {
      title: "Challenge Problem",
      instructions: "Stretch yourself — give it your best shot!",
      content: "Apply fractions to a trickier situation.",
      questions: [
        { question: "Sam ate 2/8 of a pizza and Kim ate 3/8. What fraction did they eat together?", hints: ["Add numerators when denominators match"], answer: "5/8", explanation: "2/8 + 3/8 = 5/8" },
      ],
    },
    reflection: {
      title: "Reflection",
      instructions: "Think about what you learned today.",
      content: "Great work! Think about:\n\n• What's one new thing you learned about fractions?\n• Was anything tricky? That's normal!\n• Can you spot a fraction in real life today?\n\nFractions are everywhere — cooking, sharing, time. You use them daily!",
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
    const { db: prisma } = await import("@/lib/db");
    const { verifyToken, getTokenFromHeader } = await import("@/lib/auth");
    const { generateDailyLesson } = await import("@/lib/ai");

    const token = getTokenFromHeader(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        skillMastery: { include: { skill: true } },
        assessments: { orderBy: { completedAt: "desc" }, take: 1 },
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const studentProfile = {
      id: student.id,
      name: student.name,
      age: student.age,
      grade: student.grade,
      gradeBand: student.gradeBand,
      confidenceLevel: student.confidenceLevel,
      learningPreferences: student.learningPreferences as unknown as any,
    };

    const skillProfile = {
      estimatedLevel: student.assessments[0]?.estimatedLevel || `Grade ${student.grade}`,
      levelComparison: "On track",
      masteredSkills: student.skillMastery.filter((sm) => sm.status === "MASTERED").map((sm) => ({
        id: sm.skillId, name: sm.skill.name, domain: sm.skill.domain, masteryScore: sm.masteryScore, confidenceScore: sm.confidenceScore, status: sm.status,
      })),
      developingSkills: student.skillMastery.filter((sm) => sm.status === "DEVELOPING" || sm.status === "PRACTICING").map((sm) => ({
        id: sm.skillId, name: sm.skill.name, domain: sm.skill.domain, masteryScore: sm.masteryScore, confidenceScore: sm.confidenceScore, status: sm.status,
      })),
      weakSkills: student.skillMastery.filter((sm) => sm.status === "NOT_STARTED" || sm.masteryScore < 40).map((sm) => ({
        id: sm.skillId, name: sm.skill.name, domain: sm.skill.domain, masteryScore: sm.masteryScore, confidenceScore: sm.confidenceScore, status: sm.status,
      })),
      rootCauses: [],
      recommendedStartingPoint: "",
    };

    const lesson = await generateDailyLesson(studentProfile, skillProfile);

    const focusSkillId = student.skillMastery[0]?.skillId || "general";
    const savedLesson = await prisma.lesson.create({
      data: {
        studentId,
        title: lesson.title,
        focusSkillId: student.skillMastery[0]?.skillId || focusSkillId,
        gradeBand: student.gradeBand,
        lessonJson: JSON.parse(JSON.stringify(lesson)),
      },
    });

    return NextResponse.json({ lesson, lessonId: savedLesson.id });
  } catch (error) {
    console.error("Generate lesson error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
