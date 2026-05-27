import { chatCompletion } from "../config";
import { LearnerProfile, InterventionPlan, InterventionType, SkillProfile } from "../../types";

/**
 * Intervention Engine — Recommends and generates intervention plans
 */
export const interventionEngine = {
  async recommendIntervention(
    learner: LearnerProfile,
    skillProfile: SkillProfile,
    domainName: string
  ): Promise<{ needed: boolean; type: InterventionType; plan: InterventionPlan } | { needed: false }> {
    const prompt = `Analyze this learner's profile and determine if an intervention is needed.

Domain: ${domainName}
Learner: ${learner.name}, Age ${learner.age}, Grade ${learner.grade}
Confidence: ${learner.confidenceLevel}/10
Frustration threshold: ${learner.frustrationThreshold}/10
Engagement: ${learner.engagementPattern}
Retention: ${learner.retentionStrength}

Skill Profile:
- Mastered: ${skillProfile.masteredSkills.length} skills
- Developing: ${skillProfile.developingSkills.length} skills
- Weak: ${skillProfile.weakSkills.length} skills
- Root causes: ${skillProfile.rootCauses.join("; ")}

Intervention types available:
- TUTORING: focused skill instruction
- REMEDIATION: filling foundational gaps
- CONFIDENCE_RECOVERY: rebuilding belief in ability
- RESTORATIVE_COACHING: healing relationship with learning
- MENTORING: guidance and life connection
- PARENT_ENGAGEMENT: involving guardians
- WORKFORCE_PATHWAY: connecting to career goals

Return JSON:
- needed: boolean
- type: intervention type (if needed)
- plan: { type, reason, goals: [], steps: [], duration, successCriteria: [] }`;

    const content = await chatCompletion({
      messages: [
        { role: "system", content: "You are an expert educational interventionist. Determine if a learner needs intervention and what kind. Be specific and actionable. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.4,
    });

    return JSON.parse(content);
  },
};
