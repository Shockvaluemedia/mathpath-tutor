import { chatCompletion } from "../config";
import { LearnerProfile, DiagnosticQuestion, SubjectDomain, EvaluationResult, AssessmentResponseData } from "../../types";

/**
 * Assessment Engine — Domain-agnostic adaptive assessment generation and evaluation
 */
export const assessmentEngine = {
  /**
   * Generate adaptive diagnostic questions for any subject domain
   */
  async generateQuestions(
    learner: LearnerProfile,
    domain: SubjectDomain,
    previousResponses?: { skillId: string; isCorrect: boolean; difficulty: number }[]
  ): Promise<DiagnosticQuestion[]> {
    const prompt = `Generate 5 adaptive diagnostic questions for this learner in the domain of ${domain.name}.

Learner:
- Name: ${learner.name}
- Age: ${learner.age}
- Grade: ${learner.grade}
- Developmental Stage: ${learner.developmentalStage}
- Confidence: ${learner.confidenceLevel}/10
- Learning style: ${learner.preferredStyle}
- Challenges: ${learner.challenges.join(", ") || "none specified"}

Domain: ${domain.name} — ${domain.description}

${previousResponses ? `Previous performance: ${previousResponses.filter(r => r.isCorrect).length}/${previousResponses.length} correct. Adjust difficulty accordingly.` : "This is the initial assessment."}

Return a JSON object with a "questions" array. Each question:
- id: unique string
- skillId: skill identifier
- skillName: human-readable skill name
- question: the question text
- difficulty: 1-5
- stage: "${learner.developmentalStage}"
- hints: array of 1-3 progressive hints
- correctAnswer: the correct answer
- answerType: "multiple-choice" | "free-response" | "numeric" | "open-ended"
- options: array of 4 choices (only for multiple-choice)`;

    const content = await chatCompletion({
      messages: [
        { role: "system", content: `You are an expert assessment designer for ${domain.name}. Generate adaptive questions appropriate for the learner's developmental stage. Return valid JSON only.` },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.7,
    });

    return JSON.parse(content).questions;
  },

  /**
   * Evaluate a learner's response to an assessment question
   */
  async evaluateResponse(
    response: AssessmentResponseData,
    learnerAge: number,
    stage: string,
    domainName: string
  ): Promise<EvaluationResult> {
    const prompt = `Evaluate this learner's response in ${domainName}:

Learner: Age ${learnerAge}, Stage: ${stage}
Question: ${response.question}
Learner's Answer: ${response.learnerAnswer}
Correct Answer: ${response.correctAnswer}
Time Spent: ${response.timeSpent}s
Hints Used: ${response.hintsUsed}
Confidence: ${response.confidenceRating}/10

Return JSON:
- isCorrect: boolean
- mistakeType: null if correct, otherwise: "conceptual", "procedural", "careless", "misread", "incomplete", "reasoning"
- skillAffected: specific skill revealed
- explanation: what this reveals about the learner
- nextAction: "advance" | "reinforce" | "reteach_prerequisite" | "provide_scaffolding" | "intervene"
- emotionalRecommendation: brief suggestion for emotional support if needed`;

    const content = await chatCompletion({
      messages: [
        { role: "system", content: `You are an expert educational diagnostician for ${domainName}. Analyze responses to identify gaps and recommend actions. Return valid JSON only.` },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      temperature: 0.3,
    });

    return JSON.parse(content);
  },
};
