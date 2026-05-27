import { chatCompletion } from "../config";
import { LearnerProfile, SkillProfile } from "../../types";

/**
 * Learner Profile Engine — Builds and updates comprehensive learner profiles
 */
export const profileEngine = {
  async generateSkillProfile(
    learner: LearnerProfile,
    domainName: string,
    assessmentData: {
      responses: { skillName: string; isCorrect: boolean; timeSpent: number; hintsUsed: number; confidenceRating: number; mistakeType: string | null }[];
      totalTime: number;
      averageConfidence: number;
    }
  ): Promise<SkillProfile> {
    const prompt = `Analyze this learner's assessment in ${domainName} and generate a skill profile.

Learner: ${learner.name}, Age ${learner.age}, Grade ${learner.grade}, Stage: ${learner.developmentalStage}
Confidence: ${learner.confidenceLevel}/10
Style: ${learner.preferredStyle}
Challenges: ${learner.challenges.join(", ")}

Results:
${assessmentData.responses.map((r, i) => `Q${i + 1} (${r.skillName}): ${r.isCorrect ? "✓" : "✗"} | ${r.timeSpent}s | ${r.hintsUsed} hints | confidence ${r.confidenceRating}/10 | mistake: ${r.mistakeType || "none"}`).join("\n")}

Total time: ${assessmentData.totalTime}s | Avg confidence: ${assessmentData.averageConfidence}/10

Return JSON:
- estimatedLevel: overall level description
- levelComparison: comparison to grade expectations
- masteredSkills: [{id, name, domain, masteryScore (0-100), confidenceScore (0-100), status: "MASTERED"}]
- developingSkills: [{id, name, domain, masteryScore, confidenceScore, status: "DEVELOPING" or "PRACTICING"}]
- weakSkills: [{id, name, domain, masteryScore, confidenceScore, status: "NOT_STARTED" or "EMERGING"}]
- rootCauses: array of WHY they struggle
- recommendedStartingPoint: where to begin`;

    const content = await chatCompletion({
      messages: [
        { role: "system", content: `You are an expert educational diagnostician for ${domainName}. Identify skill gaps, root causes, and learning paths. Return valid JSON only.` },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.4,
    });

    return JSON.parse(content);
  },

  async updateProfile(
    currentProfile: LearnerProfile,
    recentActivity: { modulesCompleted: number; avgAccuracy: number; avgConfidence: number; frustrationCount: number; sessionCount: number }
  ): Promise<Partial<LearnerProfile>> {
    // Algorithmic profile updates (no AI needed)
    const updates: Partial<LearnerProfile> = {};

    // Update confidence
    if (recentActivity.avgConfidence > currentProfile.confidenceLevel + 1) {
      updates.confidenceLevel = Math.min(10, currentProfile.confidenceLevel + 1);
    } else if (recentActivity.avgConfidence < currentProfile.confidenceLevel - 1) {
      updates.confidenceLevel = Math.max(1, currentProfile.confidenceLevel - 1);
    }

    // Update pace
    if (recentActivity.modulesCompleted > 5 && recentActivity.avgAccuracy > 80) {
      updates.learningPace = "fast";
    } else if (recentActivity.modulesCompleted < 2 || recentActivity.avgAccuracy < 40) {
      updates.learningPace = "slow";
    }

    // Update engagement pattern
    if (recentActivity.sessionCount >= 5) {
      updates.engagementPattern = "consistent";
    } else if (recentActivity.sessionCount <= 1) {
      updates.engagementPattern = "sporadic";
    }

    // Update frustration threshold
    if (recentActivity.frustrationCount > 3) {
      updates.frustrationThreshold = Math.max(1, currentProfile.frustrationThreshold - 1);
    }

    return updates;
  },
};
