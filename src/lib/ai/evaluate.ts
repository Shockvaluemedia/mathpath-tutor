import openai, { AI_MODEL } from "./config";
import { AssessmentResponseData, EvaluationResult } from "../types";

export async function evaluateResponse(
  responseData: AssessmentResponseData,
  studentAge: number,
  gradeBand: string
): Promise<EvaluationResult> {
  const prompt = `Evaluate this student's math response:

Student info: Age ${studentAge}, Grade Band: ${gradeBand}

Question: ${responseData.question}
Student's Answer: ${responseData.studentAnswer}
Correct Answer: ${responseData.correctAnswer}
Time Spent: ${responseData.timeSpent} seconds
Hints Used: ${responseData.hintsUsed}
Student Confidence: ${responseData.confidenceRating}/10

Analyze the response and return a JSON object with:
- isCorrect: boolean
- mistakeType: null if correct, otherwise one of: "computational", "conceptual", "procedural", "careless", "misread", "incomplete"
- skillAffected: the specific skill this reveals about the student
- explanation: brief explanation of what the mistake reveals (or what mastery it shows)
- nextAction: recommended next step ("advance", "reinforce", "reteach_prerequisite", "provide_scaffolding")`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are an expert math education diagnostician. Analyze student responses to identify mistake types, skill gaps, and recommend next actions. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  return JSON.parse(content) as EvaluationResult;
}
