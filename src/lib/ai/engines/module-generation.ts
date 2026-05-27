import { chatCompletion } from "../config";
import { LearnerProfile, SkillProfile, LearningModule, SubjectDomain, ContentType } from "../../types";

/**
 * Module Generation Engine — Creates personalized learning content for any domain
 */
export const moduleEngine = {
  async generateModule(
    learner: LearnerProfile,
    domain: SubjectDomain,
    skillProfile: SkillProfile,
    contentType: ContentType = "LESSON"
  ): Promise<LearningModule> {
    const focusSkill = skillProfile.weakSkills[0] || skillProfile.developingSkills[0];

    const prompt = `Generate a personalized learning module for this learner:

Domain: ${domain.name}
Content Type: ${contentType}

Learner:
- Name: ${learner.name}, Age: ${learner.age}, Grade: ${learner.grade}
- Stage: ${learner.developmentalStage}
- Learning style: ${learner.preferredStyle}
- Confidence: ${learner.confidenceLevel}/10
- Pace: ${learner.learningPace}

Focus Skill: ${focusSkill?.name || "general review"}
Current mastery: ${focusSkill?.masteryScore || 0}%
Root causes: ${skillProfile.rootCauses.join(", ")}
Mastered: ${skillProfile.masteredSkills.map(s => s.name).join(", ")}
Developing: ${skillProfile.developingSkills.map(s => s.name).join(", ")}

Generate a structured module with sections. Return JSON:
- title: module title
- focusSkill: skill name
- domainId: "${domain.id}"
- stage: "${learner.developmentalStage}"
- contentType: "${contentType}"
- sections: array of sections, each with:
  - key: unique identifier (e.g., "warmup", "instruction", "practice", "challenge", "reflection")
  - title: section title
  - instructions: what the learner should do
  - content: the teaching/activity content
  - questions: optional array of [{question, hints: [], answer, explanation}]

For a LESSON type, include: warmup, instruction, guided practice, independent practice, challenge, reflection.
For a QUIZ type, include: questions only.
For a REFLECTION type, include: prompts and journaling questions.
For a PROJECT type, include: project brief, steps, deliverables.

Make it age-appropriate, engaging, and confidence-building. Adapt to ${learner.preferredStyle} learning style.`;

    const content = await chatCompletion({
      messages: [
        { role: "system", content: `You are an expert instructional designer for ${domain.name}. Create engaging, personalized learning modules. Return valid JSON only.` },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.7,
    });

    return JSON.parse(content);
  },
};
