import { chatCompletion, getSystemPromptForGradeBand } from "./config";
import { StudentProfile, SkillProfile, DailyLesson } from "../types";

export async function generateDailyLesson(
  studentProfile: StudentProfile,
  skillProfile: SkillProfile
): Promise<DailyLesson> {
  const focusSkill = skillProfile.weakSkills[0] || skillProfile.developingSkills[0];
  const gradeBandPrompt = getSystemPromptForGradeBand(studentProfile.gradeBand || studentProfile.developmentalStage || "ELEMENTARY");

  const prompt = `Generate a complete daily math lesson for this student:

Student:
- Name: ${studentProfile.name}
- Age: ${studentProfile.age}
- Grade: ${studentProfile.grade}
- Grade Band: ${studentProfile.gradeBand}
- Learning preference: ${studentProfile.learningPreferences.style}
- Confidence: ${studentProfile.confidenceLevel}/10

Focus Skill: ${focusSkill?.name || "general review"}
Current mastery: ${focusSkill?.masteryScore || 0}%
Root causes of difficulty: ${skillProfile.rootCauses.join(", ")}

Previously mastered: ${skillProfile.masteredSkills.map(s => s.name).join(", ")}
Currently developing: ${skillProfile.developingSkills.map(s => s.name).join(", ")}

Create a lesson with these sections. Each section should have a title, instructions (for the student), content (the teaching material), and optionally questions with hints, answers, and explanations.

Return a JSON object with:
- title: lesson title
- focusSkill: the skill name being taught
- gradeBand: "${studentProfile.gradeBand}"
- warmup: quick review of prerequisite skills (2-3 easy questions to build confidence)
- miniLesson: clear explanation of the concept with examples
- guidedPractice: 3-4 problems with scaffolding and hints
- independentPractice: 4-5 problems the student tries alone
- challenge: 1 stretch problem that extends the concept
- reflection: a question asking the student what they learned or found tricky

Each section format: { title, instructions, content, questions?: [{question, hints: [], answer, explanation}] }

Make the lesson age-appropriate, engaging, and confidence-building.`;

  const content = await chatCompletion({
    messages: [
      {
        role: "system",
        content: `${gradeBandPrompt}\n\nYou are designing a structured daily math lesson. Return valid JSON only.`,
      },
      { role: "user", content: prompt },
    ],
    jsonMode: true,
    temperature: 0.7,
  });

  return JSON.parse(content) as DailyLesson;
}
