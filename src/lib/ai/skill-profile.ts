import openai, { AI_MODEL } from "./config";
import { StudentProfile, SkillProfile } from "../types";

interface AssessmentData {
  responses: {
    skillId: string;
    skillName: string;
    isCorrect: boolean;
    timeSpent: number;
    hintsUsed: number;
    confidenceRating: number;
    mistakeType: string | null;
  }[];
  totalTime: number;
  averageConfidence: number;
}

export async function generateSkillProfile(
  studentProfile: StudentProfile,
  assessmentData: AssessmentData
): Promise<SkillProfile> {
  const prompt = `Analyze this student's diagnostic assessment results and generate a comprehensive skill profile.

Student:
- Name: ${studentProfile.name}
- Age: ${studentProfile.age}
- Grade: ${studentProfile.grade}
- Grade Band: ${studentProfile.gradeBand}
- Self-reported confidence: ${studentProfile.confidenceLevel}/10
- Learning preference: ${studentProfile.learningPreferences.style}
- Topics they find hard: ${studentProfile.learningPreferences.hardTopics.join(", ")}

Assessment Results:
${assessmentData.responses.map((r, i) => `
Question ${i + 1}: ${r.skillName}
- Correct: ${r.isCorrect}
- Time: ${r.timeSpent}s
- Hints used: ${r.hintsUsed}
- Confidence: ${r.confidenceRating}/10
- Mistake type: ${r.mistakeType || "none"}
`).join("")}

Total assessment time: ${assessmentData.totalTime}s
Average confidence: ${assessmentData.averageConfidence}/10

Return a JSON object with:
- estimatedLevel: string describing their overall math level (e.g., "Grade 4 level, with some Grade 3 gaps")
- gradeLevelComparison: how they compare to grade-level expectations
- masteredSkills: array of {id, name, domain, masteryScore (0-100), confidenceScore (0-100), status: "MASTERED"}
- developingSkills: array of {id, name, domain, masteryScore, confidenceScore, status: "DEVELOPING" or "PRACTICING"}
- weakSkills: array of {id, name, domain, masteryScore, confidenceScore, status: "NOT_STARTED" or "DEVELOPING"}
- rootCauses: array of strings explaining WHY they struggle (e.g., "Weak number sense foundation", "Procedural gaps in multiplication")
- recommendedStartingPoint: string describing where to begin instruction`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert math education diagnostician specializing in identifying skill gaps and root causes. 
Your analysis should be thorough, compassionate, and actionable. Focus on identifying not just WHAT students struggle with, 
but WHY they struggle. Return valid JSON only.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  return JSON.parse(content) as SkillProfile;
}
