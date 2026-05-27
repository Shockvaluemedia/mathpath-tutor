// ============================================================
// ADAPTIVE LEARNING OS — Core Type Definitions
// ============================================================

// --- Enums ---

export type DevelopmentalStage = "EARLY_CHILDHOOD" | "ELEMENTARY" | "MIDDLE" | "HIGH_SCHOOL" | "ADULT";

export type MasteryStatus = "NOT_STARTED" | "EMERGING" | "DEVELOPING" | "PRACTICING" | "MASTERED";

export type UserRole = "LEARNER" | "PARENT" | "MENTOR" | "TEACHER" | "TUTOR" | "SCHOOL_ADMIN" | "ORG_ADMIN" | "FACILITATOR" | "ADMIN";

export type InterventionType = "TUTORING" | "REMEDIATION" | "CONFIDENCE_RECOVERY" | "RESTORATIVE_COACHING" | "MENTORING" | "PARENT_ENGAGEMENT" | "WORKFORCE_PATHWAY";

export type ContentType = "LESSON" | "VIDEO" | "QUIZ" | "PROJECT" | "REFLECTION" | "DISCUSSION" | "MENTORSHIP_PROMPT" | "RESTORATIVE_EXERCISE" | "PDF";

export type EmotionalState = "CONFIDENT" | "ENGAGED" | "NEUTRAL" | "UNCERTAIN" | "FRUSTRATED" | "DISENGAGED" | "OVERWHELMED";

// Legacy alias for backward compatibility — accepts both old and new values
export type GradeBand = DevelopmentalStage | "EARLY_ELEMENTARY" | "MIDDLE_SCHOOL";

// --- Subject Domain ---

export interface SubjectDomain {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  config: DomainConfig;
}

export interface DomainConfig {
  tutoringModes: string[];
  assessmentTypes: string[];
  contentTypes: ContentType[];
  interventionTypes: InterventionType[];
  gradeBands?: { min: number; max: number; label: string }[];
}

// --- Learner Profile ---

export interface LearnerProfile {
  id: string;
  name: string;
  age: number;
  grade: number;
  developmentalStage: DevelopmentalStage;
  confidenceLevel: number;
  learningPace: "slow" | "moderate" | "fast";
  preferredStyle: "visual" | "step-by-step" | "practice-heavy" | "real-world" | "discussion" | "project-based";
  engagementPattern: "consistent" | "sporadic" | "declining" | "improving";
  frustrationThreshold: number;
  retentionStrength: "weak" | "moderate" | "strong";
  strengths: string[];
  challenges: string[];
  preferences: LearningPreferences;
}

export interface LearningPreferences {
  style: string;
  hardTopics: string[];
  schoolType?: string;
  curriculum?: string;
  interests?: string[];
}

// Legacy alias — accepts partial data for backward compatibility
export type StudentProfile = Partial<LearnerProfile> & {
  id: string;
  name: string;
  age: number;
  grade: number;
  gradeBand?: string;
  developmentalStage?: DevelopmentalStage;
  confidenceLevel?: number;
  learningPreferences?: any;
};

// --- Skill Graph ---

export interface SkillNode {
  id: string;
  domainId: string;
  name: string;
  slug: string;
  description: string;
  difficulty: number;
  stageMin: DevelopmentalStage;
  stageMax: DevelopmentalStage;
  gradeMin: number;
  gradeMax: number;
  masteryThreshold: number;
  prerequisites: string[];
  interventionRecs: string[];
}

export interface SkillProfile {
  estimatedLevel: string;
  levelComparison: string;
  gradeLevelComparison?: string; // legacy alias
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

// --- Assessment Engine ---

export interface DiagnosticQuestion {
  id: string;
  skillId: string;
  skillName: string;
  domainId?: string;
  question: string;
  difficulty: number;
  stage: DevelopmentalStage;
  hints: string[];
  correctAnswer: string;
  answerType: "multiple-choice" | "free-response" | "numeric" | "open-ended";
  options?: string[];
}

export interface AssessmentResponseData {
  questionId: string;
  skillId: string;
  question: string;
  learnerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  confidenceRating: number;
  emotionalState?: EmotionalState;
}

export interface EvaluationResult {
  isCorrect: boolean;
  mistakeType: string | null;
  skillAffected: string;
  explanation: string;
  nextAction: "advance" | "reinforce" | "reteach_prerequisite" | "provide_scaffolding" | "intervene";
  emotionalRecommendation?: string;
}

// --- Learning Module / Content ---

export interface LearningModule {
  title: string;
  focusSkill: string;
  domainId: string;
  stage: DevelopmentalStage;
  contentType: ContentType;
  sections: ModuleSection[];
}

export interface ModuleSection {
  key: string;
  title: string;
  instructions: string;
  content: string;
  questions?: ModuleQuestion[];
}

export interface ModuleQuestion {
  question: string;
  hints: string[];
  answer: string;
  explanation: string;
}

// Legacy aliases for backward compatibility
export type DailyLesson = LearningModule & {
  warmup: ModuleSection;
  miniLesson: ModuleSection;
  guidedPractice: ModuleSection;
  independentPractice: ModuleSection;
  challenge: ModuleSection;
  reflection: ModuleSection;
};

export type LessonSection = ModuleSection;
export type LessonQuestion = ModuleQuestion;

// --- Tutoring / Coaching ---

export interface TutorMessage {
  role: "learner" | "student" | "tutor" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    frustrationDetected?: boolean;
    encouragement?: boolean;
    hintGiven?: boolean;
    emotionalState?: EmotionalState;
  };
}

// --- Intervention ---

export interface InterventionPlan {
  type: InterventionType;
  reason: string;
  goals: string[];
  steps: string[];
  duration: string;
  successCriteria: string[];
}

// --- Learning Path ---

export interface LearningPath {
  learnerId: string;
  domainId: string;
  currentSkillId: string;
  nextSkills: string[];
  completedSkills: string[];
  estimatedCompletion: string;
  pace: "slow" | "moderate" | "fast";
}

// --- Progress & Reporting ---

export interface ProgressReportData {
  learnerName?: string;
  studentName?: string;
  periodStart?: string;
  weekStart?: string;
  periodEnd?: string;
  weekEnd?: string;
  domainId?: string;
  strengths: string[];
  growthAreas?: string[];
  weaknesses?: string[];
  progressSummary: string;
  recommendedNextSteps: string[];
  timeSpent: number;
  modulesCompleted?: number;
  lessonsCompleted?: number;
  confidenceTrend: "improving" | "stable" | "declining";
  skillsGained: string[];
  emotionalWellbeing?: string;
}

// --- Organization ---

export interface OrganizationInfo {
  id: string;
  name: string;
  type: "family" | "school" | "nonprofit" | "church" | "community" | "afterschool";
  slug: string;
}

// Legacy alias
export type ParentReportData = ProgressReportData;
