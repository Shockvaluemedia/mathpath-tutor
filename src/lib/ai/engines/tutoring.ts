import { chatCompletion } from "../config";
import { LearnerProfile, TutorMessage, SubjectDomain, EmotionalState } from "../../types";

interface TutoringContext {
  learner: LearnerProfile;
  domain: SubjectDomain;
  sessionType: "tutoring" | "mentoring" | "coaching" | "restorative";
  currentModule?: string;
  recentMessages: TutorMessage[];
  skillsBeingPracticed: string[];
}

interface TutoringResponse {
  response: string;
  metadata: {
    frustrationDetected: boolean;
    encouragement: boolean;
    hintGiven: boolean;
    detectedEmotionalState: EmotionalState;
  };
}

/**
 * Tutoring Engine — Adaptive conversational tutoring for any domain
 */
export const tutoringEngine = {
  async chat(message: string, context: TutoringContext): Promise<TutoringResponse> {
    const systemPrompt = buildSystemPrompt(context);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of context.recentMessages.slice(-10)) {
      messages.push({
        role: msg.role === "learner" ? "user" : "assistant",
        content: msg.content,
      });
    }

    messages.push({ role: "user", content: message });

    const response = await chatCompletion({ messages, temperature: 0.8 });

    // Detect emotional signals
    const frustrationSignals = [
      "i don't get it", "i dont get it", "this is hard", "i hate",
      "i can't", "i cant", "this is stupid", "i give up", "whatever",
      "idk", "i don't know", "confused", "lost", "help me",
    ];
    const frustrationDetected = frustrationSignals.some((s) => message.toLowerCase().includes(s));
    const encouragement = /great|awesome|nice|good job|well done|keep going|you're getting/i.test(response);
    const hintGiven = /hint|try thinking|what if|consider|remember/i.test(response);

    const detectedEmotionalState: EmotionalState = frustrationDetected
      ? "FRUSTRATED"
      : message.length < 5
      ? "DISENGAGED"
      : "ENGAGED";

    return {
      response,
      metadata: { frustrationDetected, encouragement, hintGiven, detectedEmotionalState },
    };
  },
};

function buildSystemPrompt(context: TutoringContext): string {
  const { learner, domain, sessionType } = context;

  const baseRules = `CRITICAL RULES:
1. NEVER give answers immediately. Ask guiding questions first.
2. If the learner is stuck, provide a hint, not the answer.
3. If frustration is detected, acknowledge feelings, slow down, simplify.
4. Celebrate effort and progress, not just correct answers.
5. Use age-appropriate language for a ${learner.age}-year-old.
6. Break explanations into small steps.
7. Help them understand WHY without shame.
8. Detect missing prerequisites and address them.
9. Keep responses concise.
10. Adapt to their preferred learning style: ${learner.preferredStyle}.`;

  const stagePrompt = getStagePrompt(learner.developmentalStage, domain.name);
  const sessionTypePrompt = getSessionTypePrompt(sessionType);

  return `${stagePrompt}

You are working in the domain of: ${domain.name}
Session type: ${sessionType}

${sessionTypePrompt}

${baseRules}

Learner context:
- Name: ${learner.name}
- Age: ${learner.age}, Grade: ${learner.grade}
- Confidence: ${learner.confidenceLevel}/10
- Learning style: ${learner.preferredStyle}
- Current focus: ${context.skillsBeingPracticed.join(", ") || "general"}
- Current module: ${context.currentModule || "general help"}`;
}

function getStagePrompt(stage: string, domain: string): string {
  switch (stage) {
    case "EARLY_CHILDHOOD":
      return `You are a warm, encouraging ${domain} guide for young children (ages 5-8). Use simple words, short sentences, lots of encouragement. Keep it visual and concrete.`;
    case "ELEMENTARY":
      return `You are a friendly, patient ${domain} tutor for elementary learners (ages 8-11). Use clear language, relatable examples, and build confidence through guided reasoning.`;
    case "MIDDLE":
      return `You are a supportive, relatable ${domain} tutor for middle schoolers (ages 11-14). Many have lost confidence. Rebuild it. Be encouraging but mature. Normalize struggle.`;
    case "HIGH_SCHOOL":
      return `You are a knowledgeable, efficient ${domain} tutor for high schoolers (ages 14-18). Be direct, strategic, and connect to real-world applications. Encourage independent thinking.`;
    case "ADULT":
      return `You are a professional ${domain} coach for adult learners. Be respectful of their time and experience. Focus on practical application and self-directed learning.`;
    default:
      return `You are a helpful, adaptive ${domain} tutor. Adjust your style to the learner's level.`;
  }
}

function getSessionTypePrompt(type: string): string {
  switch (type) {
    case "mentoring":
      return "Focus on guidance, life connections, and building the whole person. Ask about their goals and connect learning to their aspirations.";
    case "coaching":
      return "Focus on skill development, accountability, and growth mindset. Help them set goals and track progress.";
    case "restorative":
      return "Focus on emotional safety, rebuilding confidence, and healing relationship with learning. Be extra patient and affirming.";
    default:
      return "Focus on teaching concepts, guiding through problems, and building mastery.";
  }
}
