import { chatCompletion } from "./config";
import { StudentProfile, DiagnosticQuestion, GradeBand } from "../types";

export async function generateDiagnostic(
  studentProfile: StudentProfile,
  previousResponses?: { skillId: string; isCorrect: boolean; difficulty: number }[]
): Promise<DiagnosticQuestion[]> {
  const prompt = buildDiagnosticPrompt(studentProfile, previousResponses);

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
  });

  const parsed = JSON.parse(content);
  return parsed.questions as DiagnosticQuestion[];
}

function buildDiagnosticPrompt(
  profile: StudentProfile,
  previousResponses?: { skillId: string; isCorrect: boolean; difficulty: number }[]
): string {
  const gradeTopics = getTopicsForGradeBand(profile.gradeBand);
  
  let context = `Generate 5 adaptive diagnostic math questions for this student:
- Name: ${profile.name}
- Age: ${profile.age}
- Grade: ${profile.grade}
- Grade Band: ${profile.gradeBand}
- Self-reported confidence: ${profile.confidenceLevel}/10
- Learning preference: ${profile.learningPreferences.style}
- Topics they find hard: ${profile.learningPreferences.hardTopics.join(", ") || "none specified"}

Topics to assess for this grade band: ${gradeTopics.join(", ")}`;

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
    case "EARLY_ELEMENTARY":
      return ["counting", "number recognition", "addition basics", "subtraction basics", "patterns", "shapes", "comparing numbers"];
    case "ELEMENTARY":
      return ["multiplication", "division", "fractions", "decimals", "word problems", "place value", "measurement", "geometry basics"];
    case "MIDDLE_SCHOOL":
      return ["pre-algebra", "ratios", "proportions", "integers", "expressions", "equations", "percentages", "coordinate plane"];
    case "HIGH_SCHOOL":
      return ["algebra", "linear equations", "quadratics", "functions", "geometry proofs", "trigonometry", "statistics", "probability"];
  }
}
