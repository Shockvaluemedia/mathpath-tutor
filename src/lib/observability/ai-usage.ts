import { randomUUID } from "node:crypto";

export interface AIUsageRecord {
  requestId?: string;
  learnerId?: string;
  sessionId?: string;
  operationType: string;
  provider: string;
  model: string;
  generationMode?: "AI" | "FALLBACK";
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function configuredAIPricing() {
  const input = Number(process.env.AI_INPUT_COST_PER_MILLION_USD);
  const output = Number(process.env.AI_OUTPUT_COST_PER_MILLION_USD);
  const configured = process.env.AI_INPUT_COST_PER_MILLION_USD !== ""
    && process.env.AI_OUTPUT_COST_PER_MILLION_USD !== ""
    && Number.isFinite(input) && input >= 0 && Number.isFinite(output) && output >= 0;
  return { configured, inputPerMillionUsd: configured ? input : null, outputPerMillionUsd: configured ? output : null };
}

export function calculateAICostMicros(inputTokens: number, outputTokens: number): number | null {
  const pricing = configuredAIPricing();
  if (!pricing.configured || pricing.inputPerMillionUsd === null || pricing.outputPerMillionUsd === null) return null;
  return Math.round(inputTokens * pricing.inputPerMillionUsd + outputTokens * pricing.outputPerMillionUsd);
}

export async function recordAIUsageEvent(record: AIUsageRecord): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const requestId = record.requestId ?? randomUUID();
    const costMicros = calculateAICostMicros(record.inputTokens, record.outputTokens);
    await prisma.aIUsageEvent.upsert({
      where: { requestId },
      update: {},
      create: {
        requestId,
        learnerId: record.learnerId,
        sessionId: record.sessionId,
        operationType: record.operationType,
        provider: record.provider,
        model: record.model,
        generationMode: record.generationMode ?? "AI",
        inputTokens: Math.max(0, Math.round(record.inputTokens)),
        outputTokens: Math.max(0, Math.round(record.outputTokens)),
        costMicros,
        pricingConfigured: costMicros !== null,
        latencyMs: Math.max(0, Math.round(record.latencyMs)),
        success: record.success,
        errorCode: record.errorCode,
        metadata: JSON.parse(JSON.stringify(record.metadata ?? {})),
      },
    });
  } catch (error) {
    console.error("AI usage recording failed:", error instanceof Error ? error.name : "UNKNOWN");
  }
}
