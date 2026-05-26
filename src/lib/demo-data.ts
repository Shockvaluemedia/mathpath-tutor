// Demo data for running the app without a database or OpenAI key
// Activated when NEXT_PUBLIC_DEMO_MODE=true

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_USER = {
  id: "demo-parent-1",
  name: "Sarah Johnson",
  email: "demo@mathpath.dev",
  role: "PARENT" as const,
};

export const DEMO_TOKEN = "demo-token-mathpath-2025";

export const DEMO_STUDENTS = [
  {
    id: "demo-student-1",
    parentUserId: "demo-parent-1",
    name: "Alex",
    age: 10,
    grade: 5,
    gradeBand: "ELEMENTARY",
    confidenceLevel: 6,
    learningPreferences: {
      style: "visual",
      hardTopics: ["Fractions", "Division"],
      schoolType: "Public",
    },
    createdAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "demo-student-2",
    parentUserId: "demo-parent-1",
    name: "Maya",
    age: 13,
    grade: 7,
    gradeBand: "MIDDLE_SCHOOL",
    confidenceLevel: 4,
    learningPreferences: {
      style: "step-by-step",
      hardTopics: ["Algebra", "Equations", "Negative Numbers"],
      schoolType: "Public",
    },
    createdAt: "2025-01-15T00:00:00Z",
  },
];

export const DEMO_PROGRESS = {
  "demo-student-1": {
    student: {
      id: "demo-student-1",
      name: "Alex",
      age: 10,
      grade: 5,
      gradeBand: "ELEMENTARY",
      confidenceLevel: 6,
    },
    stats: {
      lessonsCompletedThisWeek: 4,
      totalLessons: 12,
      timeSpentMinutes: 52,
      masteredSkillsCount: 5,
      avgConfidence: 6.8,
      confidenceTrend: "improving" as const,
      tutorSessionsThisWeek: 3,
    },
    skills: {
      mastered: [
        { name: "Addition", domain: "Operations", score: 95 },
        { name: "Subtraction", domain: "Operations", score: 92 },
        { name: "Patterns", domain: "Algebra Readiness", score: 88 },
        { name: "Place Value", domain: "Number Sense", score: 85 },
        { name: "Comparing Numbers", domain: "Number Sense", score: 90 },
      ],
      developing: [
        { name: "Multiplication", domain: "Operations", score: 72 },
        { name: "Word Problems", domain: "Problem Solving", score: 55 },
        { name: "Measurement", domain: "Measurement", score: 60 },
      ],
      weak: [
        { name: "Fractions", domain: "Number Sense", score: 28 },
        { name: "Division", domain: "Operations", score: 35 },
        { name: "Decimals", domain: "Number Sense", score: 15 },
      ],
    },
    recentLessons: [
      { id: "l1", title: "Understanding Fractions with Visual Models", skillName: "Fractions", completed: true, date: new Date().toISOString() },
      { id: "l2", title: "Multiplication Strategies", skillName: "Multiplication", completed: true, date: new Date(Date.now() - 86400000).toISOString() },
      { id: "l3", title: "Word Problem Basics", skillName: "Word Problems", completed: true, date: new Date(Date.now() - 172800000).toISOString() },
      { id: "l4", title: "Introduction to Division", skillName: "Division", completed: false, date: new Date(Date.now() - 259200000).toISOString() },
    ],
    latestReport: {
      id: "r1",
      studentId: "demo-student-1",
      weekStart: new Date(Date.now() - 7 * 86400000).toISOString(),
      weekEnd: new Date().toISOString(),
      strengths: ["Strong number sense foundation", "Improving multiplication fluency", "Good effort and persistence"],
      weaknesses: ["Fractions need visual scaffolding", "Division concepts still developing"],
      progressSummary: "Alex had a great week! He completed 4 lessons and spent nearly an hour practicing math. His confidence is growing, especially with multiplication. Fractions are still challenging but he's making progress with visual models.",
      recommendedNextSteps: [
        "Continue daily fraction practice with pizza/pie visuals (10 min)",
        "Practice division as 'sharing equally' with real objects",
        "Celebrate the multiplication progress — he's almost there!",
      ],
    },
  },
  "demo-student-2": {
    student: {
      id: "demo-student-2",
      name: "Maya",
      age: 13,
      grade: 7,
      gradeBand: "MIDDLE_SCHOOL",
      confidenceLevel: 4,
    },
    stats: {
      lessonsCompletedThisWeek: 2,
      totalLessons: 6,
      timeSpentMinutes: 35,
      masteredSkillsCount: 3,
      avgConfidence: 4.5,
      confidenceTrend: "stable" as const,
      tutorSessionsThisWeek: 5,
    },
    skills: {
      mastered: [
        { name: "Multiplication", domain: "Operations", score: 88 },
        { name: "Fractions", domain: "Number Sense", score: 82 },
        { name: "Percentages", domain: "Ratios", score: 80 },
      ],
      developing: [
        { name: "Pre-Algebra", domain: "Algebra", score: 55 },
        { name: "Ratios & Proportions", domain: "Ratios", score: 50 },
        { name: "Integers", domain: "Number Sense", score: 45 },
      ],
      weak: [
        { name: "Expressions & Equations", domain: "Algebra", score: 20 },
        { name: "Coordinate Plane", domain: "Geometry", score: 15 },
      ],
    },
    recentLessons: [
      { id: "l5", title: "Solving One-Step Equations", skillName: "Expressions & Equations", completed: true, date: new Date().toISOString() },
      { id: "l6", title: "Understanding Negative Numbers", skillName: "Integers", completed: true, date: new Date(Date.now() - 86400000).toISOString() },
      { id: "l7", title: "Introduction to Variables", skillName: "Pre-Algebra", completed: false, date: new Date(Date.now() - 172800000).toISOString() },
    ],
    latestReport: null,
  },
};

export const DEMO_DIAGNOSTIC_QUESTIONS = {
  ELEMENTARY: [
    {
      id: "dq1",
      skillId: "fractions",
      skillName: "Fractions",
      question: "A pizza is cut into 8 equal slices. You eat 3 slices. What fraction of the pizza did you eat?",
      difficulty: 2,
      gradeBand: "ELEMENTARY",
      hints: ["The bottom number is how many total slices", "The top number is how many you ate"],
      correctAnswer: "3/8",
      answerType: "free-response",
    },
    {
      id: "dq2",
      skillId: "multiplication",
      skillName: "Multiplication",
      question: "What is 7 × 8?",
      difficulty: 2,
      gradeBand: "ELEMENTARY",
      hints: ["Think of 7 groups of 8", "7 × 8 is the same as 8 × 7"],
      correctAnswer: "56",
      answerType: "free-response",
    },
    {
      id: "dq3",
      skillId: "division",
      skillName: "Division",
      question: "If you have 24 stickers and want to share them equally among 6 friends, how many does each friend get?",
      difficulty: 2,
      gradeBand: "ELEMENTARY",
      hints: ["Division means sharing equally", "24 ÷ 6 = ?"],
      correctAnswer: "4",
      answerType: "free-response",
    },
    {
      id: "dq4",
      skillId: "word-problems",
      skillName: "Word Problems",
      question: "Sam has 15 apples. He gives 4 to his sister and buys 7 more. How many apples does Sam have now?",
      difficulty: 3,
      gradeBand: "ELEMENTARY",
      hints: ["Start with 15, subtract 4, then add 7", "Do one step at a time"],
      correctAnswer: "18",
      answerType: "free-response",
    },
    {
      id: "dq5",
      skillId: "decimals",
      skillName: "Decimals",
      question: "Which is greater: 0.7 or 0.65?",
      difficulty: 3,
      gradeBand: "ELEMENTARY",
      hints: ["0.7 is the same as 0.70", "Compare the tenths place first"],
      correctAnswer: "0.7",
      answerType: "multiple-choice",
      options: ["0.7", "0.65", "They are equal", "Cannot tell"],
    },
  ],
  MIDDLE_SCHOOL: [
    {
      id: "dq6",
      skillId: "pre-algebra",
      skillName: "Pre-Algebra",
      question: "Solve for x: x + 5 = 12",
      difficulty: 2,
      gradeBand: "MIDDLE_SCHOOL",
      hints: ["What number plus 5 equals 12?", "Subtract 5 from both sides"],
      correctAnswer: "7",
      answerType: "free-response",
    },
    {
      id: "dq7",
      skillId: "integers",
      skillName: "Integers",
      question: "What is -3 + 8?",
      difficulty: 2,
      gradeBand: "MIDDLE_SCHOOL",
      hints: ["Start at -3 on the number line and move 8 to the right"],
      correctAnswer: "5",
      answerType: "free-response",
    },
    {
      id: "dq8",
      skillId: "ratios",
      skillName: "Ratios & Proportions",
      question: "If 3 notebooks cost $6, how much do 7 notebooks cost?",
      difficulty: 3,
      gradeBand: "MIDDLE_SCHOOL",
      hints: ["First find the cost of 1 notebook", "$6 ÷ 3 = $2 per notebook"],
      correctAnswer: "14",
      answerType: "free-response",
    },
    {
      id: "dq9",
      skillId: "expressions",
      skillName: "Expressions & Equations",
      question: "Simplify: 3x + 2x - 4",
      difficulty: 3,
      gradeBand: "MIDDLE_SCHOOL",
      hints: ["Combine like terms (the x terms)", "3x + 2x = 5x"],
      correctAnswer: "5x - 4",
      answerType: "free-response",
    },
    {
      id: "dq10",
      skillId: "percentages",
      skillName: "Percentages",
      question: "What is 25% of 80?",
      difficulty: 2,
      gradeBand: "MIDDLE_SCHOOL",
      hints: ["25% means 1/4", "Divide 80 by 4"],
      correctAnswer: "20",
      answerType: "free-response",
    },
  ],
  EARLY_ELEMENTARY: [
    {
      id: "dq11",
      skillId: "counting",
      skillName: "Counting",
      question: "What number comes after 17?",
      difficulty: 1,
      gradeBand: "EARLY_ELEMENTARY",
      hints: ["Count: 15, 16, 17, ..."],
      correctAnswer: "18",
      answerType: "free-response",
    },
    {
      id: "dq12",
      skillId: "addition-basic",
      skillName: "Addition",
      question: "What is 5 + 3?",
      difficulty: 1,
      gradeBand: "EARLY_ELEMENTARY",
      hints: ["Hold up 5 fingers, then count 3 more"],
      correctAnswer: "8",
      answerType: "free-response",
    },
    {
      id: "dq13",
      skillId: "subtraction-basic",
      skillName: "Subtraction",
      question: "What is 9 - 4?",
      difficulty: 1,
      gradeBand: "EARLY_ELEMENTARY",
      hints: ["Start at 9 and count back 4"],
      correctAnswer: "5",
      answerType: "free-response",
    },
    {
      id: "dq14",
      skillId: "patterns",
      skillName: "Patterns",
      question: "What comes next? 2, 4, 6, 8, __",
      difficulty: 1,
      gradeBand: "EARLY_ELEMENTARY",
      hints: ["Each number goes up by 2"],
      correctAnswer: "10",
      answerType: "free-response",
    },
    {
      id: "dq15",
      skillId: "comparing",
      skillName: "Comparing Numbers",
      question: "Which is bigger: 14 or 9?",
      difficulty: 1,
      gradeBand: "EARLY_ELEMENTARY",
      hints: ["Think about which number is further on the number line"],
      correctAnswer: "14",
      answerType: "multiple-choice",
      options: ["14", "9", "They are the same"],
    },
  ],
  HIGH_SCHOOL: [
    {
      id: "dq16",
      skillId: "linear-equations",
      skillName: "Linear Equations",
      question: "Solve for x: 2x + 3 = 11",
      difficulty: 2,
      gradeBand: "HIGH_SCHOOL",
      hints: ["Subtract 3 from both sides first", "Then divide by 2"],
      correctAnswer: "4",
      answerType: "free-response",
    },
    {
      id: "dq17",
      skillId: "quadratics",
      skillName: "Quadratic Equations",
      question: "Factor: x² + 5x + 6",
      difficulty: 3,
      gradeBand: "HIGH_SCHOOL",
      hints: ["Find two numbers that multiply to 6 and add to 5", "2 and 3 work"],
      correctAnswer: "(x+2)(x+3)",
      answerType: "free-response",
    },
    {
      id: "dq18",
      skillId: "functions",
      skillName: "Functions",
      question: "If f(x) = 3x - 1, what is f(4)?",
      difficulty: 2,
      gradeBand: "HIGH_SCHOOL",
      hints: ["Replace x with 4", "3(4) - 1 = ?"],
      correctAnswer: "11",
      answerType: "free-response",
    },
    {
      id: "dq19",
      skillId: "statistics",
      skillName: "Statistics",
      question: "Find the median of: 3, 7, 1, 9, 5",
      difficulty: 2,
      gradeBand: "HIGH_SCHOOL",
      hints: ["First put them in order", "The median is the middle number"],
      correctAnswer: "5",
      answerType: "free-response",
    },
    {
      id: "dq20",
      skillId: "systems",
      skillName: "Systems of Equations",
      question: "Solve: x + y = 10 and x - y = 4. What is x?",
      difficulty: 3,
      gradeBand: "HIGH_SCHOOL",
      hints: ["Add both equations together", "2x = 14"],
      correctAnswer: "7",
      answerType: "free-response",
    },
  ],
};

export const DEMO_TUTOR_RESPONSES: Record<string, string[]> = {
  greeting: [
    "That's a great question! Let me help you think through it. 🤔",
    "I love that you're asking about this! Let's work through it together.",
    "Good thinking! Before I explain, let me ask you something first...",
  ],
  hint: [
    "Here's a hint: try breaking the problem into smaller pieces. What's the first step you'd take?",
    "Think about it this way — what do you already know about this topic that might help?",
    "Let me give you a nudge: what would happen if you tried a simpler version of this problem first?",
  ],
  encouragement: [
    "You're getting closer! That's exactly the right kind of thinking. Keep going! ⭐",
    "Great effort! Even when it feels hard, you're building new connections in your brain.",
    "I can see you're really thinking about this. That's what matters most — not just getting the answer, but understanding WHY.",
  ],
  frustration: [
    "Hey, it's totally okay to feel stuck. Math is hard sometimes, and that's normal. Let's slow down and try a different approach. What part feels most confusing?",
    "I hear you — this IS tricky. But here's the thing: feeling confused means your brain is working on something new. Let's take it one tiny step at a time.",
    "No worries at all. Let's back up a bit. Sometimes when something feels impossible, it's because we're missing a small piece. Let me help you find it.",
  ],
  correct: [
    "Yes! That's exactly right! 🎉 You clearly understand this concept. Want to try a slightly harder one?",
    "Perfect! You nailed it. Can you explain to me WHY that's the answer? Teaching it back helps it stick.",
    "Awesome work! ✓ You're building real mastery here. Ready for the next challenge?",
  ],
  incorrect: [
    "Not quite, but you're on the right track! Let me ask you this: what was your thinking process? Sometimes the approach is right even when the answer isn't.",
    "Close! Let's look at this together. Where do you think it might have gone differently? I'll give you a hint if you want one.",
    "That's not the answer I was looking for, but I can see how you got there. Let's trace through it step by step — I think you'll spot where it went sideways.",
  ],
};

export function getDemoTutorResponse(message: string): { response: string; metadata: { frustrationDetected: boolean; encouragement: boolean; hintGiven: boolean } } {
  const lower = message.toLowerCase();

  const frustrationSignals = ["i don't get it", "i dont get it", "this is hard", "i hate", "i can't", "i cant", "help", "confused", "stuck", "idk"];
  const frustrationDetected = frustrationSignals.some((s) => lower.includes(s));

  if (frustrationDetected) {
    const responses = DEMO_TUTOR_RESPONSES.frustration;
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      metadata: { frustrationDetected: true, encouragement: true, hintGiven: false },
    };
  }

  if (lower.includes("hint") || lower.includes("help me")) {
    const responses = DEMO_TUTOR_RESPONSES.hint;
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      metadata: { frustrationDetected: false, encouragement: false, hintGiven: true },
    };
  }

  // Default: ask a guiding question
  const responses = DEMO_TUTOR_RESPONSES.greeting;
  return {
    response: responses[Math.floor(Math.random() * responses.length)] +
      "\n\nWhat part of the problem are you working on? Tell me what you've tried so far, and I'll help guide you from there.",
    metadata: { frustrationDetected: false, encouragement: true, hintGiven: false },
  };
}

export const DEMO_GAMIFICATION = {
  "demo-student-1": {
    xp: 685,
    streak: 4,
    longestStreak: 7,
    totalLessons: 12,
    totalCorrect: 78,
    totalQuestions: 95,
    perfectLessons: 2,
    tutorSessions: 5,
    hintsUsed: 8,
    diagnosticDone: true,
    badges: [
      { id: "first-lesson", name: "First Steps", description: "Completed first lesson", icon: "👣", category: "effort", earnedAt: "2025-01-16T00:00:00Z" },
      { id: "diagnostic-done", name: "Self Aware", description: "Completed diagnostic assessment", icon: "🔬", category: "milestone", earnedAt: "2025-01-15T00:00:00Z" },
      { id: "streak-3", name: "Getting Started", description: "3-day streak", icon: "🔥", category: "streak", earnedAt: "2025-01-18T00:00:00Z" },
      { id: "first-mastery", name: "First Mastery", description: "Mastered your first skill", icon: "✅", category: "mastery", earnedAt: "2025-01-20T00:00:00Z" },
      { id: "mastery-5", name: "Skill Collector", description: "Mastered 5 skills", icon: "🎯", category: "mastery", earnedAt: "2025-02-01T00:00:00Z" },
      { id: "lessons-10", name: "Dedicated Learner", description: "Completed 10 lessons", icon: "📖", category: "effort", earnedAt: "2025-02-05T00:00:00Z" },
      { id: "tutor-chat", name: "Help Seeker", description: "Used the tutor for the first time", icon: "💬", category: "effort", earnedAt: "2025-01-17T00:00:00Z" },
      { id: "asked-hint", name: "Smart Strategy", description: "Used a hint (asking for help is smart!)", icon: "💡", category: "effort", earnedAt: "2025-01-16T00:00:00Z" },
    ],
  },
  "demo-student-2": {
    xp: 320,
    streak: 1,
    longestStreak: 3,
    totalLessons: 6,
    totalCorrect: 35,
    totalQuestions: 52,
    perfectLessons: 0,
    tutorSessions: 8,
    hintsUsed: 15,
    diagnosticDone: true,
    badges: [
      { id: "first-lesson", name: "First Steps", description: "Completed first lesson", icon: "👣", category: "effort", earnedAt: "2025-01-16T00:00:00Z" },
      { id: "diagnostic-done", name: "Self Aware", description: "Completed diagnostic assessment", icon: "🔬", category: "milestone", earnedAt: "2025-01-15T00:00:00Z" },
      { id: "streak-3", name: "Getting Started", description: "3-day streak", icon: "🔥", category: "streak", earnedAt: "2025-01-20T00:00:00Z" },
      { id: "tutor-chat", name: "Help Seeker", description: "Used the tutor for the first time", icon: "💬", category: "effort", earnedAt: "2025-01-16T00:00:00Z" },
      { id: "asked-hint", name: "Smart Strategy", description: "Used a hint (asking for help is smart!)", icon: "💡", category: "effort", earnedAt: "2025-01-16T00:00:00Z" },
    ],
  },
};
