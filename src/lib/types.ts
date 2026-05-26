export type GradeBand = "EARLY_ELEMENTARY" | "ELEMENTARY" | "MIDDLE_SCHOOL" | "HIGH_SCHOOL";

export type MasteryStatus = "NOT_STARTED" | "DEVELOPING" | "PRACTICING" | "MASTERED";

export type UserRole = "PARENT" | "STUDENT" | "ADMIN";

export interface StudentProfile {
  id: string;
  name: string;
  age: number;
  grade: number;
  gradeBand: GradeBand;
  confidenceLevel: number;
  learningPreferences: LearningPreferences;
}

export interface LearningPreferences {
  style: "visual" | "step-by-step" | "practice-heavy" | "real-world";
  hardTopics: string[];
  schoolType?: string;
  curriculum?: string;
}

export interface SkillProfile {
  estimatedLevel: string;
  gradeLevelComparison: string;
  masteredSkills: SkillInfo[];
  developingSkills: SkillInfo[];
  weakSkills: SkillInfo[];
  rootCauses: string[];
  recommendedStartingPoint: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  domain: string;
  masteryScore: number;
  confidenceScore: number;
  status: MasteryStatus;
}

export interface DiagnosticQuestion {
  id: string;
  skillId: string;
  skillName: string;
  question: string;
  difficulty: number;
  gradeBand: GradeBand;
  hints: string[];
  correctAnswer: string;
  answerType: "multiple-choice" | "free-response" | "numeric";
  options?: string[];
}

export interface AssessmentResponseData {
  questionId: string;
  skillId: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  confidenceRating: number;
}

export interface DailyLesson {
  title: string;
  focusSkill: string;
  gradeBand: GradeBand;
  warmup: LessonSection;
  miniLesson: LessonSection;
  guidedPractice: LessonSection;
  independentPractice: LessonSection;
  challenge: LessonSection;
  reflection: LessonSection;
}

export interface LessonSection {
  title: string;
  instructions: string;
  content: string;
  questions?: LessonQuestion[];
}

export interface LessonQuestion {
  question: string;
  hints: string[];
  answer: string;
  explanation: string;
}

export interface TutorMessage {
  role: "student" | "tutor" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    frustrationDetected?: boolean;
    encouragement?: boolean;
    hintGiven?: boolean;
  };
}

export interface ParentReportData {
  studentName: string;
  weekStart: string;
  weekEnd: string;
  strengths: string[];
  weaknesses: string[];
  progressSummary: string;
  recommendedNextSteps: string[];
  timeSpent: number;
  lessonsCompleted: number;
  confidenceTrend: "improving" | "stable" | "declining";
  skillsGained: string[];
}

export interface EvaluationResult {
  isCorrect: boolean;
  mistakeType: string | null;
  skillAffected: string;
  explanation: string;
  nextAction: string;
}
