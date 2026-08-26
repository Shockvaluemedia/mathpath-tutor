import { chatCompletion, getSystemPromptForGradeBand } from "./config";
import { INSTRUCTIONAL_STRATEGIES } from "@/lib/tutor/strategies";
import type { TutorLearnerState, TutorTurnDecision } from "@/lib/tutor/orchestration";
import type { TutorMessage } from "../types";
import { buildMinimumTutorContext } from "@/lib/tutor/privacy";

interface TutorContext {
  state: TutorLearnerState;
  decision: TutorTurnDecision;
  recentMessages: TutorMessage[];
}

export interface TutorResponseMetadata {
  frustrationDetected: boolean;
  encouragement: boolean;
  hintGiven: boolean;
  action: TutorTurnDecision["action"];
  strategy: TutorTurnDecision["strategy"];
  reasonCodes: string[];
  targetSkillId: string | null;
  prerequisiteSkillId: string | null;
  orchestrationVersion: "tutor-orchestration-v1";
}

export async function tutorChat(
  message: string,
  context: TutorContext
): Promise<{ response: string; metadata: TutorResponseMetadata }> {
  const { state, decision } = context;
  const minimumContext = buildMinimumTutorContext(state);
  const gradeBandPrompt = getSystemPromptForGradeBand(state.developmentalStage);
  const strategy = INSTRUCTIONAL_STRATEGIES[decision.strategy];
  const patterns = minimumContext.activePatterns.map((pattern) =>
    `${pattern.patternType} (${pattern.confidence.toFixed(2)}): ${pattern.statement}`
  );
  const misconceptions = minimumContext.activeMisconceptions.map((item) =>
    `${item.code} (${item.probability.toFixed(2)})`
  );

  const systemPrompt = `${gradeBandPrompt}

You are executing a server-selected instructional action. Follow the decision rather than inventing a different learner path.

Decision:
- Action: ${decision.action}
- Strategy: ${decision.strategy}
- Purpose: ${strategy.purpose}
- Strategy guidance: ${strategy.tutorGuidance}
- Target skill: ${minimumContext.targetSkill ?? "general mathematics"}
- Prerequisite focus: ${minimumContext.prerequisiteSkill ?? "none"}
- Reason codes: ${decision.reasonCodes.join(", ")}
- Maximum sentences: ${decision.responseConstraints.maximumSentences}
- Vocabulary: ${decision.responseConstraints.vocabulary}
- Example contexts: ${decision.responseConstraints.exampleContexts.join(", ")}
- Visual density: ${decision.responseConstraints.visualDensity}
- Scaffolding: ${decision.responseConstraints.scaffolding}
- Suggested session length: ${decision.responseConstraints.sessionMinutes} minutes
- Challenge level: ${decision.responseConstraints.challengeLevel}
- Motivational framing: ${decision.responseConstraints.motivationalFraming}

Evidence-backed learner context:
- Grade: ${minimumContext.grade}
- Developmental stage: ${minimumContext.developmentalStage}
- Confidence level: ${minimumContext.confidenceLevel}/10
- Current frustration: ${minimumContext.currentFrustration ? "yes" : "no"}
- Active patterns: ${patterns.join(" | ") || "insufficient evidence"}
- Active misconception hypotheses: ${misconceptions.join(", ") || "none above threshold"}

Pedagogical safety:
1. Teach for understanding; do not withhold an explanation merely to be indirect.
2. A worked example is appropriate when the selected action permits it. Use a parallel example, not the answer to an active graded item.
3. Ask only one question at a time.
4. Use age-respectful language even when remediating an earlier-grade skill.
5. Never use frustration or emotional signals for judgment, punishment, or scoring.
6. Do not mention internal probabilities, labels, or reason codes to the learner.
7. Stay within the selected action and sentence limit.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];
  for (const item of context.recentMessages.slice(-8)) {
    messages.push({
      role: item.role === "student" || item.role === "learner" ? "user" : "assistant",
      content: item.content,
    });
  }
  messages.push({ role: "user", content: message });

  const tutorResponse = await chatCompletion({
    messages,
    temperature: 0.45,
    maxTokens: 700,
    observability: { operationType: "TUTOR_CHAT", learnerId: state.learnerId },
  });
  const frustrationSignals = ["i don't get", "i dont get", "i can't", "i cant", "give up", "too hard", "confused", "lost"];
  const frustrationDetected = frustrationSignals.some((signal) => message.toLowerCase().includes(signal));
  return {
    response: tutorResponse,
    metadata: {
      frustrationDetected,
      encouragement: /great|good thinking|nice work|keep going|you can/i.test(tutorResponse),
      hintGiven: decision.action === "GIVE_HINT" || /hint|first step|consider/i.test(tutorResponse),
      action: decision.action,
      strategy: decision.strategy,
      reasonCodes: decision.reasonCodes,
      targetSkillId: decision.targetSkillId,
      prerequisiteSkillId: decision.prerequisiteSkillId,
      orchestrationVersion: "tutor-orchestration-v1",
    },
  };
}
