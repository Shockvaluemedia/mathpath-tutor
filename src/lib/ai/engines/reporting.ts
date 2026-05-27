import { chatCompletion } from "../config";
import { ProgressReportData } from "../../types";

/**
 * Reporting Engine — Generates progress reports for guardians, teachers, and organizations
 */
export const reportEngine = {
  async generateProgressReport(data: {
    learnerName: string;
    age: number;
    grade: number;
    domainName: string;
    periodStart: string;
    periodEnd: string;
    modulesCompleted: number;
    totalTimeMinutes: number;
    skillsWorkedOn: { name: string; startMastery: number; endMastery: number }[];
    confidenceRatings: number[];
    frustrationEvents: number;
    sessionCount: number;
    recipientRole: "parent" | "teacher" | "admin";
  }): Promise<ProgressReportData> {
    const avgConfidence = data.confidenceRatings.length > 0
      ? data.confidenceRatings.reduce((a, b) => a + b, 0) / data.confidenceRatings.length
      : 5;

    const confidenceTrend = avgConfidence > 6 ? "improving" : avgConfidence < 4 ? "declining" : "stable";

    const prompt = `Generate a progress report for a ${data.recipientRole}.

Learner: ${data.learnerName}, Age ${data.age}, Grade ${data.grade}
Domain: ${data.domainName}
Period: ${data.periodStart} to ${data.periodEnd}

Activity:
- Modules completed: ${data.modulesCompleted}
- Time spent: ${data.totalTimeMinutes} minutes
- Sessions: ${data.sessionCount}
- Frustration events: ${data.frustrationEvents}

Skills:
${data.skillsWorkedOn.map(s => `- ${s.name}: ${s.startMastery}% → ${s.endMastery}%`).join("\n")}

Confidence: ${avgConfidence.toFixed(1)}/10 (${confidenceTrend})

Write for a ${data.recipientRole}. Return JSON:
- strengths: array of 2-3 specific positives
- growthAreas: array of 1-2 areas framed constructively
- progressSummary: 2-3 sentence summary
- recommendedNextSteps: array of 2-3 actionable suggestions
- skillsGained: array of skill names with significant improvement
- emotionalWellbeing: brief note on emotional state and engagement`;

    const content = await chatCompletion({
      messages: [
        { role: "system", content: `You are writing a ${data.domainName} progress report for a ${data.recipientRole}. Be warm, specific, encouraging. Focus on growth. Return valid JSON only.` },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.6,
    });

    const parsed = JSON.parse(content);

    return {
      learnerName: data.learnerName,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      domainId: undefined,
      strengths: parsed.strengths,
      growthAreas: parsed.growthAreas || parsed.weaknesses || [],
      progressSummary: parsed.progressSummary,
      recommendedNextSteps: parsed.recommendedNextSteps,
      timeSpent: data.totalTimeMinutes,
      modulesCompleted: data.modulesCompleted,
      confidenceTrend,
      skillsGained: parsed.skillsGained || [],
      emotionalWellbeing: parsed.emotionalWellbeing || "stable",
    };
  },
};
