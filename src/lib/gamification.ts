// Gamification system: XP, levels, streaks, badges

export interface PlayerStats {
  xp: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
  xpProgress: number; // 0-100 percentage
  streak: number;
  longestStreak: number;
  badges: Badge[];
  totalLessons: number;
  totalCorrect: number;
  totalQuestions: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
  category: "streak" | "mastery" | "effort" | "milestone";
}

// XP rewards
export const XP_REWARDS = {
  LESSON_COMPLETE: 50,
  QUESTION_CORRECT: 10,
  QUESTION_CORRECT_NO_HINTS: 15,
  PERFECT_SECTION: 25,
  DAILY_STREAK: 20,
  FIRST_LESSON: 100,
  DIAGNOSTIC_COMPLETE: 75,
  TUTOR_SESSION: 15,
  CHALLENGE_SOLVED: 30,
} as const;

// Level thresholds
const LEVELS = [
  { xp: 0, name: "Beginner", emoji: "🌱" },
  { xp: 100, name: "Explorer", emoji: "🔍" },
  { xp: 300, name: "Problem Solver", emoji: "🧩" },
  { xp: 600, name: "Adventurer", emoji: "🗺️" },
  { xp: 1000, name: "Skill Builder", emoji: "🔨" },
  { xp: 1500, name: "Warrior", emoji: "⚔️" },
  { xp: 2200, name: "Knowledge Seeker", emoji: "📚" },
  { xp: 3000, name: "Champion", emoji: "🏆" },
  { xp: 4000, name: "Master Mind", emoji: "🧠" },
  { xp: 5500, name: "Legend", emoji: "⭐" },
  { xp: 7500, name: "Wizard", emoji: "🧙" },
  { xp: 10000, name: "Grand Master", emoji: "👑" },
];

// All possible badges
export const ALL_BADGES: Badge[] = [
  // Streak badges
  { id: "streak-3", name: "Getting Started", description: "3-day streak", icon: "🔥", category: "streak" },
  { id: "streak-7", name: "Week Warrior", description: "7-day streak", icon: "🔥", category: "streak" },
  { id: "streak-14", name: "Two Week Titan", description: "14-day streak", icon: "💪", category: "streak" },
  { id: "streak-30", name: "Monthly Master", description: "30-day streak", icon: "🌟", category: "streak" },

  // Mastery badges
  { id: "first-mastery", name: "First Mastery", description: "Mastered your first skill", icon: "✅", category: "mastery" },
  { id: "mastery-5", name: "Skill Collector", description: "Mastered 5 skills", icon: "🎯", category: "mastery" },
  { id: "mastery-10", name: "Skill Master", description: "Mastered 10 skills", icon: "🏅", category: "mastery" },
  { id: "perfect-lesson", name: "Perfect Lesson", description: "100% on a lesson", icon: "💯", category: "mastery" },

  // Effort badges
  { id: "first-lesson", name: "First Steps", description: "Completed first lesson", icon: "👣", category: "effort" },
  { id: "lessons-10", name: "Dedicated Learner", description: "Completed 10 lessons", icon: "📖", category: "effort" },
  { id: "lessons-25", name: "Knowledge Hunter", description: "Completed 25 lessons", icon: "🎓", category: "effort" },
  { id: "tutor-chat", name: "Help Seeker", description: "Used the tutor for the first time", icon: "💬", category: "effort" },
  { id: "asked-hint", name: "Smart Strategy", description: "Used a hint (asking for help is smart!)", icon: "💡", category: "effort" },

  // Milestone badges
  { id: "level-5", name: "Rising Star", description: "Reached level 5", icon: "⭐", category: "milestone" },
  { id: "level-10", name: "Math Hero", description: "Reached level 10", icon: "🦸", category: "milestone" },
  { id: "xp-1000", name: "XP Milestone", description: "Earned 1000 XP", icon: "💎", category: "milestone" },
  { id: "diagnostic-done", name: "Self Aware", description: "Completed diagnostic assessment", icon: "🔬", category: "milestone" },
];

export function calculateLevel(xp: number): { level: number; name: string; emoji: string; xpToNext: number; progress: number } {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }

  const levelIndex = LEVELS.indexOf(currentLevel);
  const xpInLevel = xp - currentLevel.xp;
  const xpNeeded = nextLevel.xp - currentLevel.xp;
  const progress = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  return {
    level: levelIndex + 1,
    name: currentLevel.name,
    emoji: currentLevel.emoji,
    xpToNext: Math.max(0, nextLevel.xp - xp),
    progress,
  };
}

export function checkNewBadges(stats: {
  streak: number;
  longestStreak: number;
  totalLessons: number;
  masteredSkills: number;
  xp: number;
  level: number;
  perfectLessons: number;
  tutorSessions: number;
  hintsUsed: number;
  diagnosticDone: boolean;
}, existingBadgeIds: string[]): Badge[] {
  const newBadges: Badge[] = [];

  const check = (badge: Badge, condition: boolean) => {
    if (condition && !existingBadgeIds.includes(badge.id)) {
      newBadges.push({ ...badge, earnedAt: new Date().toISOString() });
    }
  };

  // Streak badges
  check(ALL_BADGES[0], stats.streak >= 3);
  check(ALL_BADGES[1], stats.streak >= 7);
  check(ALL_BADGES[2], stats.streak >= 14);
  check(ALL_BADGES[3], stats.streak >= 30);

  // Mastery badges
  check(ALL_BADGES[4], stats.masteredSkills >= 1);
  check(ALL_BADGES[5], stats.masteredSkills >= 5);
  check(ALL_BADGES[6], stats.masteredSkills >= 10);
  check(ALL_BADGES[7], stats.perfectLessons >= 1);

  // Effort badges
  check(ALL_BADGES[8], stats.totalLessons >= 1);
  check(ALL_BADGES[9], stats.totalLessons >= 10);
  check(ALL_BADGES[10], stats.totalLessons >= 25);
  check(ALL_BADGES[11], stats.tutorSessions >= 1);
  check(ALL_BADGES[12], stats.hintsUsed >= 1);

  // Milestone badges
  check(ALL_BADGES[13], stats.level >= 5);
  check(ALL_BADGES[14], stats.level >= 10);
  check(ALL_BADGES[15], stats.xp >= 1000);
  check(ALL_BADGES[16], stats.diagnosticDone);

  return newBadges;
}
