// Spaced Repetition System using a simplified SM-2 algorithm
// Determines when skills should be reviewed based on mastery and time since last practice

export interface ReviewItem {
  skillId: string;
  skillName: string;
  domain: string;
  masteryScore: number;
  lastPracticed: string | null;
  daysSinceReview: number;
  urgency: "overdue" | "due-today" | "due-soon" | "stable";
  nextReviewDate: string;
  interval: number; // days until next review
}

export interface ReviewSession {
  items: ReviewItem[];
  totalDue: number;
  overdueCount: number;
}

// Interval multipliers based on mastery
// Higher mastery = longer intervals between reviews
function getInterval(masteryScore: number, previousInterval: number): number {
  if (masteryScore >= 90) return Math.max(previousInterval * 2.5, 14); // 2+ weeks
  if (masteryScore >= 75) return Math.max(previousInterval * 2, 7);    // 1+ week
  if (masteryScore >= 60) return Math.max(previousInterval * 1.5, 3);  // 3+ days
  if (masteryScore >= 40) return Math.max(previousInterval * 1.2, 2);  // 2+ days
  return 1; // Review daily for weak skills
}

// Calculate urgency based on how overdue a review is
function getUrgency(daysSinceReview: number, interval: number): ReviewItem["urgency"] {
  if (daysSinceReview > interval * 1.5) return "overdue";
  if (daysSinceReview >= interval) return "due-today";
  if (daysSinceReview >= interval * 0.8) return "due-soon";
  return "stable";
}

export function calculateReviewSchedule(
  skills: {
    id: string;
    name: string;
    domain: string;
    masteryScore: number;
    lastPracticed: string | null;
  }[]
): ReviewSession {
  const now = new Date();
  const items: ReviewItem[] = [];

  for (const skill of skills) {
    // Skip skills that haven't been practiced yet (mastery 0)
    if (skill.masteryScore === 0 && !skill.lastPracticed) continue;

    const lastPracticed = skill.lastPracticed ? new Date(skill.lastPracticed) : new Date(now.getTime() - 7 * 86400000);
    const daysSinceReview = Math.floor((now.getTime() - lastPracticed.getTime()) / 86400000);

    // Calculate the ideal interval based on mastery
    const baseInterval = skill.masteryScore >= 80 ? 7 : skill.masteryScore >= 50 ? 3 : 1;
    const interval = getInterval(skill.masteryScore, baseInterval);
    const urgency = getUrgency(daysSinceReview, interval);

    const nextReviewDate = new Date(lastPracticed.getTime() + interval * 86400000);

    items.push({
      skillId: skill.id,
      skillName: skill.name,
      domain: skill.domain,
      masteryScore: skill.masteryScore,
      lastPracticed: skill.lastPracticed,
      daysSinceReview,
      urgency,
      nextReviewDate: nextReviewDate.toISOString(),
      interval: Math.round(interval),
    });
  }

  // Sort: overdue first, then due-today, then due-soon
  const urgencyOrder = { overdue: 0, "due-today": 1, "due-soon": 2, stable: 3 };
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return {
    items,
    totalDue: items.filter((i) => i.urgency !== "stable").length,
    overdueCount: items.filter((i) => i.urgency === "overdue").length,
  };
}

// Generate review questions for due skills
export interface ReviewQuestion {
  skillId: string;
  skillName: string;
  question: string;
  hints: string[];
  answer: string;
  explanation: string;
  difficulty: number;
}

// Demo review questions by skill
export const REVIEW_QUESTIONS: Record<string, ReviewQuestion[]> = {
  "Addition": [
    { skillId: "addition", skillName: "Addition", question: "What is 47 + 38?", hints: ["Add the ones: 7+8=15, carry the 1", "Then add the tens: 4+3+1=8"], answer: "85", explanation: "47 + 38 = 85. Add ones (7+8=15, write 5 carry 1), then tens (4+3+1=8).", difficulty: 2 },
    { skillId: "addition", skillName: "Addition", question: "What is 156 + 89?", hints: ["Start with the ones column"], answer: "245", explanation: "156 + 89 = 245", difficulty: 3 },
  ],
  "Subtraction": [
    { skillId: "subtraction", skillName: "Subtraction", question: "What is 83 - 47?", hints: ["You'll need to borrow from the tens"], answer: "36", explanation: "83 - 47 = 36. Borrow: 13-7=6, then 7-4=3.", difficulty: 2 },
  ],
  "Multiplication": [
    { skillId: "multiplication", skillName: "Multiplication", question: "What is 6 × 9?", hints: ["Think: 6 × 10 = 60, minus one 6"], answer: "54", explanation: "6 × 9 = 54", difficulty: 2 },
    { skillId: "multiplication", skillName: "Multiplication", question: "What is 12 × 5?", hints: ["12 × 5 is half of 12 × 10"], answer: "60", explanation: "12 × 5 = 60 (half of 120)", difficulty: 2 },
  ],
  "Division": [
    { skillId: "division", skillName: "Division", question: "What is 72 ÷ 8?", hints: ["What times 8 equals 72?"], answer: "9", explanation: "72 ÷ 8 = 9 because 8 × 9 = 72", difficulty: 2 },
  ],
  "Fractions": [
    { skillId: "fractions", skillName: "Fractions", question: "What is 1/4 + 1/4?", hints: ["Same denominator — just add the numerators"], answer: "2/4", explanation: "1/4 + 1/4 = 2/4 (which equals 1/2)", difficulty: 2 },
    { skillId: "fractions", skillName: "Fractions", question: "Which is larger: 3/5 or 2/3?", hints: ["Find a common denominator (15)", "3/5 = 9/15, 2/3 = 10/15"], answer: "2/3", explanation: "2/3 = 10/15 > 3/5 = 9/15, so 2/3 is larger", difficulty: 3 },
  ],
  "Decimals": [
    { skillId: "decimals", skillName: "Decimals", question: "What is 0.3 + 0.45?", hints: ["Line up the decimal points", "0.30 + 0.45"], answer: "0.75", explanation: "0.30 + 0.45 = 0.75", difficulty: 2 },
  ],
  "Pre-Algebra": [
    { skillId: "pre-algebra", skillName: "Pre-Algebra", question: "Solve: x + 7 = 15", hints: ["Subtract 7 from both sides"], answer: "8", explanation: "x = 15 - 7 = 8", difficulty: 2 },
  ],
  "Integers": [
    { skillId: "integers", skillName: "Integers", question: "What is -4 + 10?", hints: ["Start at -4 and move 10 to the right"], answer: "6", explanation: "-4 + 10 = 6", difficulty: 2 },
  ],
  "Ratios & Proportions": [
    { skillId: "ratios", skillName: "Ratios & Proportions", question: "If 4 apples cost $2, how much do 10 apples cost?", hints: ["Find cost per apple first", "$2 ÷ 4 = $0.50 each"], answer: "5", explanation: "$0.50 × 10 = $5.00", difficulty: 2 },
  ],
  "Percentages": [
    { skillId: "percentages", skillName: "Percentages", question: "What is 20% of 150?", hints: ["20% = 1/5", "Divide 150 by 5"], answer: "30", explanation: "20% of 150 = 150 × 0.20 = 30", difficulty: 2 },
  ],
};

export function getReviewQuestions(dueSkills: ReviewItem[], count: number = 5): ReviewQuestion[] {
  const questions: ReviewQuestion[] = [];

  for (const skill of dueSkills) {
    const skillQuestions = REVIEW_QUESTIONS[skill.skillName];
    if (skillQuestions && skillQuestions.length > 0) {
      const q = skillQuestions[Math.floor(Math.random() * skillQuestions.length)];
      questions.push(q);
    }
    if (questions.length >= count) break;
  }

  return questions;
}
