import { chatCompletion, getSystemPromptForGradeBand } from "./config";
import { StudentProfile, TutorMessage } from "../types";

interface TutorContext {
  studentProfile: StudentProfile;
  currentLesson?: string;
  recentMessages: TutorMessage[];
  skillsBeingPracticed: string[];
}

export async function tutorChat(
  message: string,
  context: TutorContext
): Promise<{ response: string; metadata: { frustrationDetected: boolean; encouragement: boolean; hintGiven: boolean } }> {
  const gradeBandPrompt = getSystemPromptForGradeBand(context.studentProfile.gradeBand || context.studentProfile.developmentalStage || "ELEMENTARY");

  const systemPrompt = `${gradeBandPrompt}

CRITICAL TUTORING RULES:
1. NEVER give the answer immediately. Always ask a guiding question first.
2. If the student is stuck, provide a hint, not the answer.
3. If the student shows frustration (short responses, "I don't get it", "this is stupid", etc.), acknowledge their feelings, slow down, and simplify.
4. Celebrate effort and progress, not just correct answers.
5. Use age-appropriate language and examples.
6. When explaining, break things into small steps.
7. If a student gets something wrong, help them understand WHY without making them feel bad.
8. Detect when prerequisites are missing and address them.
9. Summarize what the student learned at natural stopping points.
10. Keep responses concise - don't overwhelm with text.

Student context:
- Name: ${context.studentProfile.name}
- Age: ${context.studentProfile.age}
- Grade: ${context.studentProfile.grade}
- Confidence: ${context.studentProfile.confidenceLevel}/10
- Learning style: ${context.studentProfile.learningPreferences.style}
- Current lesson: ${context.currentLesson || "general help"}
- Skills being practiced: ${context.skillsBeingPracticed.join(", ")}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of context.recentMessages.slice(-10)) {
    messages.push({
      role: msg.role === "student" ? "user" : "assistant",
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: message });

  const tutorResponse = await chatCompletion({
    messages,
    temperature: 0.8,
  });

  // Detect frustration signals
  const frustrationSignals = [
    "i don't get it", "i dont get it", "this is hard", "i hate math",
    "i can't", "i cant", "this is stupid", "i give up", "whatever",
    "idk", "i don't know", "help me", "confused", "lost",
  ];
  const frustrationDetected = frustrationSignals.some(
    (signal) => message.toLowerCase().includes(signal)
  );

  const encouragement = /great|awesome|nice|good job|well done|keep going|you're getting/i.test(tutorResponse);
  const hintGiven = /hint|try thinking|what if|consider|remember/i.test(tutorResponse);

  return {
    response: tutorResponse,
    metadata: { frustrationDetected, encouragement, hintGiven },
  };
}
