import { chatCompletion } from "./config";
import { StudentProfile, DiagnosticQuestion, GradeBand } from "../types";

export async function generateDiagnostic(
  studentProfile: StudentProfile,
  previousResponses?: { skillId: string; isCorrect: boolean; difficulty: number }[],
  options: {
    purpose?: "baseline" | "endline";
    focusSkills?: { skillId: string; skillName: string }[];
    selection?: {
      skillId: string;
      skillName: string;
      targetDifficulty: number;
      direction: string;
      reasonCodes: string[];
    };
    questionCount?: number;
  } = {}
): Promise<DiagnosticQuestion[]> {
  const prompt = buildDiagnosticPrompt(studentProfile, previousResponses, options);

  const content = await chatCompletion({
    messages: [
      {
        role: "system",
        content: `You are an expert math assessment designer. Generate adaptive diagnostic questions 
that accurately assess a student's math level. Questions should be appropriate for the student's 
grade band but also probe for gaps in prerequisite skills. Return valid JSON only.`,
      },
      { role: "user", content: prompt },
    ],
    jsonMode: true,
    temperature: 0.7,
    observability: { operationType: "DIAGNOSTIC_GENERATION", learnerId: studentProfile.id, metadata: { purpose: options.purpose ?? "baseline" } },
  });

  const parsed = JSON.parse(content);
  return parsed.questions as DiagnosticQuestion[];
}

function buildDiagnosticPrompt(
  profile: StudentProfile,
  previousResponses?: { skillId: string; isCorrect: boolean; difficulty: number }[],
  options: {
    purpose?: "baseline" | "endline";
    focusSkills?: { skillId: string; skillName: string }[];
    selection?: {
      skillId: string;
      skillName: string;
      targetDifficulty: number;
      direction: string;
      reasonCodes: string[];
    };
    questionCount?: number;
  } = {}
): string {
  const gradeTopics = getTopicsForGradeBand(profile.gradeBand as GradeBand || "ELEMENTARY");
  
  const questionCount = Math.min(5, Math.max(1, options.questionCount ?? 5));
  let context = `Generate ${questionCount} adaptive diagnostic math question${questionCount === 1 ? "" : "s"} for this student:
- Grade: ${profile.grade}
- Grade Band: ${profile.gradeBand}
- Self-reported confidence: ${profile.confidenceLevel}/10
- Learning preference: ${profile.learningPreferences.style}
- Topics they find hard: ${profile.learningPreferences.hardTopics.join(", ") || "none specified"}

Topics to assess for this grade band: ${gradeTopics.join(", ")}`;

  if (options.purpose === "endline") {
    context += `\n\nThis is an endline check. Generate parallel questions that measure the same skills at comparable difficulty without copying prior wording.`;
    if (options.focusSkills && options.focusSkills.length > 0) {
      const skillPairs = options.focusSkills
        .map(({ skillId, skillName }) => `${skillId}: ${skillName}`)
        .join(", ");
      context += `\nUse only these baseline skillId/name pairs: ${skillPairs}. Preserve each skillId exactly as written so results can be compared.`;
    }
  }

  if (options.selection) {
    context += `\n\nThe server's adaptive engine selected the next evidence target:
- Required skillId: ${options.selection.skillId}
- Required skill name: ${options.selection.skillName}
- Target difficulty: ${options.selection.targetDifficulty}/5
- Movement: ${options.selection.direction}
- Selection reasons: ${options.selection.reasonCodes.join(", ")}

Generate only this skill and preserve the required skillId and skill name exactly. Match the target difficulty. Do not substitute a neighboring topic.`;
  }

  if (previousResponses && previousResponses.length > 0) {
    const correct = previousResponses.filter((r) => r.isCorrect).length;
    const avgDifficulty = previousResponses.reduce((sum, r) => sum + r.difficulty, 0) / previousResponses.length;
    
    context += `\n\nPrevious performance: ${correct}/${previousResponses.length} correct at average difficulty ${avgDifficulty.toFixed(1)}/5.
Adjust difficulty accordingly. If they're doing well, increase difficulty. If struggling, probe for prerequisite gaps.`;
  }

  context += `\n\nReturn a JSON object with a "questions" array. Each question should have:
- id: unique string
- skillId: identifier for the skill being tested
- skillName: human-readable skill name
- question: the math question text
- difficulty: 1-5 scale
- gradeBand: "${profile.gradeBand}"
- hints: array of 1-3 progressive hints
- correctAnswer: the correct answer
- answerType: "multiple-choice" | "free-response" | "numeric"
- options: array of 4 choices (only for multiple-choice)`;

  return context;
}

function getTopicsForGradeBand(gradeBand: GradeBand): string[] {
  switch (gradeBand) {
    case "EARLY_CHILDHOOD":
    case "EARLY_ELEMENTARY":
      return ["counting", "number recognition", "addition basics", "subtraction basics", "patterns", "shapes", "comparing numbers"];
    case "ELEMENTARY":
      return ["multiplication", "division", "fractions", "decimals", "word problems", "place value", "measurement", "geometry basics"];
    case "MIDDLE":
    case "MIDDLE_SCHOOL":
      return ["pre-algebra", "ratios", "proportions", "integers", "expressions", "equations", "percentages", "coordinate plane"];
    case "HIGH_SCHOOL":
      return ["algebra", "linear equations", "quadratics", "functions", "geometry proofs", "trigonometry", "statistics", "probability"];
    default:
      return ["general skills", "problem solving", "critical thinking"];
  }
}
