import openai, { AI_MODEL } from "./config";
import { ParentReportData } from "../types";

interface StudentProgressData {
  studentName: string;
  age: number;
  grade: number;
  gradeBand: string;
  weekStart: string;
  weekEnd: string;
  lessonsCompleted: number;
  totalTimeMinutes: number;
  skillsWorkedOn: { name: string; startMastery: number; endMastery: number }[];
  assessmentResults: { correct: number; total: number }[];
  confidenceRatings: number[];
  frustrationEvents: number;
  tutorInteractions: number;
}

export async function generateParentReport(
  progressData: StudentProgressData
): Promise<ParentReportData> {
  const avgConfidence = progressData.confidenceRatings.length > 0
    ? progressData.confidenceRatings.reduce((a, b) => a + b, 0) / progressData.confidenceRatings.length
    : 5;

  const prevAvgConfidence = progressData.confidenceRatings.length > 3
    ? progressData.confidenceRatings.slice(0, Math.floor(progressData.confidenceRatings.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(progressData.confidenceRatings.length / 2)
    : avgConfidence;

  const confidenceTrend = avgConfidence > prevAvgConfidence + 0.5 ? "improving" : avgConfidence < prevAvgConfidence - 0.5 ? "declining" : "stable";

  const prompt = `Generate a parent-friendly weekly progress report for a math tutoring student.

Student: ${progressData.studentName}, Age ${progressData.age}, Grade ${progressData.grade}
Week: ${progressData.weekStart} to ${progressData.weekEnd}

This week's activity:
- Lessons completed: ${progressData.lessonsCompleted}
- Total time spent: ${progressData.totalTimeMinutes} minutes
- Tutor interactions: ${progressData.tutorInteractions}
- Frustration events detected: ${progressData.frustrationEvents}

Skills worked on:
${progressData.skillsWorkedOn.map(s => `- ${s.name}: ${s.startMastery}% → ${s.endMastery}%`).join("\n")}

Assessment accuracy: ${progressData.assessmentResults.map(r => `${r.correct}/${r.total}`).join(", ")}
Average confidence: ${avgConfidence.toFixed(1)}/10
Confidence trend: ${confidenceTrend}

Write a warm, encouraging, plain-language summary for the parent. Return a JSON object with:
- strengths: array of 2-3 specific things the student did well
- weaknesses: array of 1-2 areas that need attention (framed constructively)
- progressSummary: 2-3 sentence summary of the week
- recommendedNextSteps: array of 2-3 specific suggestions for the parent
- skillsGained: array of skill names where mastery improved significantly`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `You are writing a progress report for a parent about their child's math learning. 
Be warm, specific, and encouraging. Focus on growth and effort. 
Frame weaknesses constructively as "areas for growth" or "next focus areas."
Use plain language - no jargon. Return valid JSON only.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = JSON.parse(content);

  return {
    studentName: progressData.studentName,
    weekStart: progressData.weekStart,
    weekEnd: progressData.weekEnd,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    progressSummary: parsed.progressSummary,
    recommendedNextSteps: parsed.recommendedNextSteps,
    timeSpent: progressData.totalTimeMinutes,
    lessonsCompleted: progressData.lessonsCompleted,
    confidenceTrend,
    skillsGained: parsed.skillsGained || [],
  };
}
