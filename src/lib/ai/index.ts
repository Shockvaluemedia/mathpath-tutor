// ============================================================
// AI ORCHESTRATION LAYER
// Modular AI engines for the Adaptive Learning OS
// ============================================================

// Core AI engines (domain-agnostic)
export { assessmentEngine } from "./engines/assessment";
export { tutoringEngine } from "./engines/tutoring";
export { moduleEngine } from "./engines/module-generation";
export { interventionEngine } from "./engines/intervention";
export { reportEngine } from "./engines/reporting";
export { profileEngine } from "./engines/learner-profile";
export { emotionalEngine } from "./engines/emotional-adaptation";

// Legacy exports for backward compatibility
export { generateDiagnostic } from "./diagnostic";
export { evaluateResponse } from "./evaluate";
export { generateSkillProfile } from "./skill-profile";
export { generateDailyLesson } from "./lesson";
export { tutorChat } from "./tutor-chat";
export { generateParentReport } from "./parent-report";
