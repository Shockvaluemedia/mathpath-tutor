// AI Provider abstraction — supports OpenAI and Amazon Bedrock

export type AIProvider = "openai" | "bedrock";

export const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) || "openai";
export const AI_MODEL = process.env.AI_MODEL || (AI_PROVIDER === "bedrock" ? "us.anthropic.claude-sonnet-4-20250514" : "gpt-4o");
export const AWS_REGION = process.env.AWS_REGION || "us-east-1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  jsonMode?: boolean;
}

/**
 * Unified chat completion function that works with both OpenAI and Bedrock
 */
export async function chatCompletion(options: ChatOptions): Promise<string> {
  if (AI_PROVIDER === "bedrock") {
    return bedrockCompletion(options);
  }
  return openaiCompletion(options);
}

async function openaiCompletion(options: ChatOptions): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder" });

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  return content;
}

async function bedrockCompletion(options: ChatOptions): Promise<string> {
  const { BedrockRuntimeClient, InvokeModelCommand } = await import("@aws-sdk/client-bedrock-runtime");

  const client = new BedrockRuntimeClient({ region: AWS_REGION });

  // Extract system message and conversation messages
  const systemMessage = options.messages.find((m) => m.role === "system")?.content || "";
  const conversationMessages = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: [{ type: "text" as const, text: m.content }],
    }));

  // Ensure conversation starts with a user message
  if (conversationMessages.length === 0 || conversationMessages[0].role !== "user") {
    conversationMessages.unshift({
      role: "user",
      content: [{ type: "text", text: "Please respond based on the system instructions." }],
    });
  }

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    temperature: options.temperature ?? 0.7,
    system: systemMessage + (options.jsonMode ? "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation outside the JSON." : ""),
    messages: conversationMessages,
  });

  const command = new InvokeModelCommand({
    modelId: AI_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  const content = responseBody.content?.[0]?.text;
  if (!content) throw new Error("No response from Bedrock");

  // Strip markdown code blocks if present (Claude sometimes wraps JSON in ```json...```)
  if (options.jsonMode) {
    const stripped = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    return stripped;
  }

  return content;
}

export function getSystemPromptForGradeBand(gradeBand: string): string {
  switch (gradeBand) {
    case "EARLY_ELEMENTARY":
      return `You are a warm, encouraging math tutor for young children (ages 5-8, grades K-2). 
Use simple words, short sentences, and lots of encouragement. 
Use emojis sparingly but effectively (stars, checkmarks). 
Focus on visual explanations and concrete examples (counting objects, simple patterns).
Keep responses brief and celebratory. Never make the child feel bad about mistakes.
Use phrases like "Great try!", "You're getting closer!", "Let's figure this out together!"`;

    case "ELEMENTARY":
      return `You are a friendly, patient math tutor for elementary students (ages 8-11, grades 3-5).
Use clear language and build confidence through guided reasoning.
Explain concepts step by step with relatable examples (sharing pizza for fractions, etc.).
Encourage the student to think through problems before giving hints.
Be supportive but not condescending. Celebrate effort and progress.`;

    case "MIDDLE_SCHOOL":
      return `You are a supportive, relatable math tutor for middle school students (ages 11-14, grades 6-8).
Many students at this level have lost confidence in math. Your job is to rebuild it.
Be encouraging but treat them maturely. Use real-world examples they care about.
Focus on filling foundational gaps without making them feel behind.
Guide them to discover answers rather than telling them directly.
Acknowledge when things are hard and normalize struggle as part of learning.`;

    case "HIGH_SCHOOL":
      return `You are a knowledgeable, efficient math tutor for high school students (ages 14-18, grades 9-12).
Be direct and respectful of their time. Use strategic explanations and real-world applications.
Connect concepts to SAT/ACT prep when relevant. Encourage independent thinking.
Ask probing questions to develop mathematical reasoning.
Be conversational but focused. Help them see the bigger picture of how concepts connect.`;

    default:
      return `You are a helpful, adaptive math tutor. Adjust your teaching style to the student's level.`;
  }
}
