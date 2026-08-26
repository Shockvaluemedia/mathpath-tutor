import { REVIEW_QUESTIONS } from "@/lib/spaced-repetition";
import { generateProblem, type ProblemTemplateCode } from "@/lib/math/problem-generators";

export interface PublicReviewQuestion {
  id: string;
  skillId: string;
  skillName: string;
  question: string;
  hints: string[];
  difficulty: number;
}

export interface ReviewQuestionAnswer extends PublicReviewQuestion {
  answer: string;
  explanation: string;
}

export function questionsForSkill(skillId: string, skillName: string): ReviewQuestionAnswer[] {
  return (REVIEW_QUESTIONS[skillName] ?? []).map((question, index) => ({
    id: `retention:${skillId}:${index}`,
    skillId,
    skillName,
    question: question.question,
    hints: question.hints,
    difficulty: question.difficulty,
    answer: question.answer,
    explanation: question.explanation,
  }));
}

export function selectReviewQuestion(
  skillId: string,
  skillName: string,
  retrievalCount: number
): PublicReviewQuestion | null {
  const difficulty = Math.min(5, 2 + Math.floor(retrievalCount / 2));
  const seed = `review:${skillId}:${retrievalCount}`;
  const generated = generateProblem({ targetSkillId: skillId, skillName, difficulty, seed });
  if (generated) {
    return {
      id: `generated:${generated.templateCode}:${difficulty}:${encodeURIComponent(seed)}`,
      skillId,
      skillName,
      question: generated.prompt,
      hints: [],
      difficulty,
    };
  }
  const questions = questionsForSkill(skillId, skillName);
  if (questions.length === 0) return null;
  const selected = questions[retrievalCount % questions.length];
  return {
    id: selected.id,
    skillId: selected.skillId,
    skillName: selected.skillName,
    question: selected.question,
    hints: selected.hints,
    difficulty: selected.difficulty,
  };
}

export function resolveReviewQuestion(
  id: string,
  skillId: string,
  skillName: string
): ReviewQuestionAnswer | null {
  const generatedMatch = id.match(/^generated:([^:]+):(\d):(.+)$/);
  if (generatedMatch) {
    const difficulty = Number(generatedMatch[2]);
    const generated = generateProblem({
      targetSkillId: skillId,
      skillName,
      difficulty,
      seed: decodeURIComponent(generatedMatch[3]),
      preferredTemplate: generatedMatch[1] as ProblemTemplateCode,
    });
    if (generated) {
      return {
        id,
        skillId,
        skillName,
        question: generated.prompt,
        hints: [],
        difficulty,
        answer: generated.correctAnswer,
        explanation: generated.explanation,
      };
    }
  }
  return questionsForSkill(skillId, skillName).find((question) => question.id === id) ?? null;
}
