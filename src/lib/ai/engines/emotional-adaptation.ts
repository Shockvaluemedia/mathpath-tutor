import { EmotionalState, LearnerProfile } from "../../types";

/**
 * Emotional Adaptation Engine — Detects and responds to learner emotional states
 * No AI calls needed — rule-based for speed and reliability
 */
export const emotionalEngine = {
  /**
   * Detect emotional state from learner signals
   */
  detectState(signals: {
    message?: string;
    timeOnTask?: number;
    hintsUsed?: number;
    consecutiveErrors?: number;
    confidenceRating?: number;
    responseLength?: number;
  }): EmotionalState {
    const { message, consecutiveErrors, confidenceRating, responseLength, timeOnTask } = signals;

    // Frustration signals from text
    if (message) {
      const lower = message.toLowerCase();
      const frustrationPhrases = ["i can't", "i cant", "i don't get", "i dont get", "this is stupid", "i hate", "i give up", "too hard", "impossible"];
      if (frustrationPhrases.some((p) => lower.includes(p))) return "FRUSTRATED";

      const overwhelmedPhrases = ["too much", "overwhelmed", "confused", "lost", "what"];
      if (overwhelmedPhrases.some((p) => lower.includes(p))) return "OVERWHELMED";
    }

    // Behavioral signals
    if (consecutiveErrors && consecutiveErrors >= 4) return "FRUSTRATED";
    if (confidenceRating && confidenceRating <= 2) return "UNCERTAIN";
    if (responseLength !== undefined && responseLength <= 2) return "DISENGAGED";
    if (timeOnTask && timeOnTask > 300) return "DISENGAGED"; // 5+ minutes on one question

    // Positive signals
    if (confidenceRating && confidenceRating >= 8) return "CONFIDENT";
    if (consecutiveErrors === 0) return "ENGAGED";

    return "NEUTRAL";
  },

  /**
   * Get adaptation recommendations based on emotional state
   */
  getAdaptation(state: EmotionalState, learner: LearnerProfile): {
    paceAdjustment: "slow_down" | "maintain" | "speed_up";
    toneShift: string;
    contentAdjustment: string;
    interventionNeeded: boolean;
  } {
    switch (state) {
      case "FRUSTRATED":
        return {
          paceAdjustment: "slow_down",
          toneShift: "Acknowledge feelings. Be extra warm. Normalize struggle.",
          contentAdjustment: "Simplify. Break into smaller steps. Offer easier prerequisite practice.",
          interventionNeeded: learner.confidenceLevel <= 3,
        };
      case "OVERWHELMED":
        return {
          paceAdjustment: "slow_down",
          toneShift: "Calm and reassuring. One thing at a time.",
          contentAdjustment: "Reduce complexity. Focus on one concept only. Remove distractions.",
          interventionNeeded: false,
        };
      case "DISENGAGED":
        return {
          paceAdjustment: "speed_up",
          toneShift: "More energetic. Ask engaging questions. Connect to interests.",
          contentAdjustment: "Try a different format. Add interactivity. Make it relevant.",
          interventionNeeded: false,
        };
      case "UNCERTAIN":
        return {
          paceAdjustment: "slow_down",
          toneShift: "Encouraging. Validate their thinking process.",
          contentAdjustment: "Provide more scaffolding. Give examples before asking.",
          interventionNeeded: false,
        };
      case "CONFIDENT":
        return {
          paceAdjustment: "speed_up",
          toneShift: "Challenge them. Celebrate mastery.",
          contentAdjustment: "Increase difficulty. Introduce next-level concepts.",
          interventionNeeded: false,
        };
      case "ENGAGED":
        return {
          paceAdjustment: "maintain",
          toneShift: "Keep current approach. It's working.",
          contentAdjustment: "Continue at current level. Gradually increase challenge.",
          interventionNeeded: false,
        };
      default:
        return {
          paceAdjustment: "maintain",
          toneShift: "Warm and supportive.",
          contentAdjustment: "Standard approach.",
          interventionNeeded: false,
        };
    }
  },

  /**
   * Calculate emotional momentum over time
   */
  calculateMomentum(recentStates: EmotionalState[]): {
    trend: "improving" | "stable" | "declining";
    dominantState: EmotionalState;
    resilience: number; // 0-10
  } {
    if (recentStates.length === 0) return { trend: "stable", dominantState: "NEUTRAL", resilience: 5 };

    const stateScores: Record<EmotionalState, number> = {
      CONFIDENT: 10, ENGAGED: 8, NEUTRAL: 5, UNCERTAIN: 3, FRUSTRATED: 1, DISENGAGED: 2, OVERWHELMED: 0,
    };

    const scores = recentStates.map((s) => stateScores[s]);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const trend = secondAvg > firstAvg + 1 ? "improving" : secondAvg < firstAvg - 1 ? "declining" : "stable";

    // Find dominant state
    const stateCounts: Record<string, number> = {};
    recentStates.forEach((s) => { stateCounts[s] = (stateCounts[s] || 0) + 1; });
    const dominantState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0][0] as EmotionalState;

    // Resilience: how quickly they recover from negative states
    let recoveries = 0;
    for (let i = 1; i < recentStates.length; i++) {
      if (stateScores[recentStates[i - 1]] < 4 && stateScores[recentStates[i]] >= 5) recoveries++;
    }
    const resilience = Math.min(10, 5 + recoveries * 2);

    return { trend, dominantState, resilience };
  },
};
