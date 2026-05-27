/**
 * Comprehensive Bedrock AI Integration Test
 * Tests all AI engines across multiple domains
 *
 * Run: npx tsx scripts/test-bedrock.ts
 *
 * Prerequisites:
 * - AWS credentials configured (env vars, ~/.aws/credentials, or IAM role)
 * - Bedrock model access enabled for Claude in your AWS account
 * - AI_PROVIDER=bedrock in .env
 */

import "dotenv/config";

const DIVIDER = "─".repeat(60);

async function main() {
  console.log("🧪 Adaptive Learning OS — Bedrock AI Integration Tests\n");
  console.log(`Provider: ${process.env.AI_PROVIDER || "openai"}`);
  console.log(`Model: ${process.env.AI_MODEL || "gpt-4o"}`);
  console.log(`Region: ${process.env.AWS_REGION || "us-east-1"}`);
  console.log(`Demo Mode: ${process.env.NEXT_PUBLIC_DEMO_MODE}\n`);
  console.log(DIVIDER);

  const results: { test: string; passed: boolean; time: number; error?: string }[] = [];

  // Test 1: Assessment Engine — Math
  await runTest(results, "Assessment Engine (Math)", async () => {
    const { assessmentEngine } = await import("../src/lib/ai/engines/assessment");
    const questions = await assessmentEngine.generateQuestions(
      { id: "test", name: "Alex", age: 10, grade: 5, developmentalStage: "ELEMENTARY", confidenceLevel: 6, learningPace: "moderate", preferredStyle: "visual", engagementPattern: "consistent", frustrationThreshold: 5, retentionStrength: "moderate", strengths: [], challenges: ["Fractions"], preferences: { style: "visual", hardTopics: ["Fractions"] } },
      { id: "d1", slug: "mathematics", name: "Mathematics", description: "Math", icon: "🔢", color: "#6366f1", isActive: true, config: { tutoringModes: [], assessmentTypes: [], contentTypes: [], interventionTypes: [] } },
    );
    console.log(`  Generated ${questions.length} questions`);
    if (questions.length > 0) console.log(`  Sample: "${questions[0].question}"`);
    if (questions.length === 0) throw new Error("No questions generated");
  });

  // Test 2: Assessment Engine — Reading
  await runTest(results, "Assessment Engine (Reading)", async () => {
    const { assessmentEngine } = await import("../src/lib/ai/engines/assessment");
    const questions = await assessmentEngine.generateQuestions(
      { id: "test", name: "Maya", age: 13, grade: 7, developmentalStage: "MIDDLE", confidenceLevel: 4, learningPace: "moderate", preferredStyle: "step-by-step", engagementPattern: "consistent", frustrationThreshold: 5, retentionStrength: "moderate", strengths: [], challenges: ["Inference"], preferences: { style: "step-by-step", hardTopics: ["Inference"] } },
      { id: "d2", slug: "reading", name: "Reading Comprehension", description: "Reading", icon: "📖", color: "#10b981", isActive: true, config: { tutoringModes: [], assessmentTypes: [], contentTypes: [], interventionTypes: [] } },
    );
    console.log(`  Generated ${questions.length} questions`);
    if (questions.length > 0) console.log(`  Sample: "${questions[0].question.slice(0, 80)}..."`);
    if (questions.length === 0) throw new Error("No questions generated");
  });

  // Test 3: Tutoring Engine — Guided teaching
  await runTest(results, "Tutoring Engine (Guided)", async () => {
    const { tutoringEngine } = await import("../src/lib/ai/engines/tutoring");
    const result = await tutoringEngine.chat("I don't understand how to add fractions with different denominators", {
      learner: { id: "test", name: "Alex", age: 10, grade: 5, developmentalStage: "ELEMENTARY", confidenceLevel: 6, learningPace: "moderate", preferredStyle: "visual", engagementPattern: "consistent", frustrationThreshold: 5, retentionStrength: "moderate", strengths: [], challenges: [], preferences: { style: "visual", hardTopics: [] } },
      domain: { id: "d1", slug: "mathematics", name: "Mathematics", description: "Math", icon: "🔢", color: "#6366f1", isActive: true, config: { tutoringModes: [], assessmentTypes: [], contentTypes: [], interventionTypes: [] } },
      sessionType: "tutoring",
      recentMessages: [],
      skillsBeingPracticed: ["Fractions"],
    });
    console.log(`  Response: "${result.response.slice(0, 100)}..."`);
    console.log(`  Frustration: ${result.metadata.frustrationDetected} | Hint: ${result.metadata.hintGiven}`);
    // Verify it doesn't just give the answer
    if (result.response.toLowerCase().includes("the answer is")) throw new Error("Tutor gave answer directly");
  });

  // Test 4: Tutoring Engine — Frustration handling
  await runTest(results, "Tutoring Engine (Frustration)", async () => {
    const { tutoringEngine } = await import("../src/lib/ai/engines/tutoring");
    const result = await tutoringEngine.chat("I hate this I can't do math it's too hard I give up", {
      learner: { id: "test", name: "Alex", age: 10, grade: 5, developmentalStage: "ELEMENTARY", confidenceLevel: 3, learningPace: "slow", preferredStyle: "visual", engagementPattern: "sporadic", frustrationThreshold: 3, retentionStrength: "weak", strengths: [], challenges: [], preferences: { style: "visual", hardTopics: [] } },
      domain: { id: "d1", slug: "mathematics", name: "Mathematics", description: "Math", icon: "🔢", color: "#6366f1", isActive: true, config: { tutoringModes: [], assessmentTypes: [], contentTypes: [], interventionTypes: [] } },
      sessionType: "tutoring",
      recentMessages: [],
      skillsBeingPracticed: ["Fractions"],
    });
    console.log(`  Response: "${result.response.slice(0, 100)}..."`);
    console.log(`  Frustration detected: ${result.metadata.frustrationDetected}`);
    if (!result.metadata.frustrationDetected) throw new Error("Failed to detect frustration");
  });

  // Test 5: Module Generation — AI Literacy
  await runTest(results, "Module Engine (AI Literacy)", async () => {
    const { moduleEngine } = await import("../src/lib/ai/engines/module-generation");
    const module = await moduleEngine.generateModule(
      { id: "test", name: "Maya", age: 13, grade: 7, developmentalStage: "MIDDLE", confidenceLevel: 7, learningPace: "moderate", preferredStyle: "real-world", engagementPattern: "consistent", frustrationThreshold: 6, retentionStrength: "moderate", strengths: [], challenges: ["AI Ethics"], preferences: { style: "real-world", hardTopics: ["AI Ethics"] } },
      { id: "d3", slug: "ai-literacy", name: "AI Literacy", description: "Understanding AI", icon: "🤖", color: "#ec4899", isActive: true, config: { tutoringModes: [], assessmentTypes: [], contentTypes: [], interventionTypes: [] } },
      { estimatedLevel: "Grade 7", levelComparison: "On track", masteredSkills: [{ id: "1", name: "What is AI", domain: "AI Literacy", masteryScore: 90, confidenceScore: 85, status: "MASTERED" }], developingSkills: [{ id: "2", name: "Prompting", domain: "AI Literacy", masteryScore: 45, confidenceScore: 40, status: "DEVELOPING" }], weakSkills: [{ id: "3", name: "AI Ethics", domain: "AI Literacy", masteryScore: 20, confidenceScore: 15, status: "EMERGING" }], rootCauses: ["Limited exposure to ethical AI discussions"], recommendedStartingPoint: "AI Ethics basics" },
      "LESSON"
    );
    console.log(`  Title: "${module.title}"`);
    console.log(`  Sections: ${module.sections?.length || 0}`);
    if (!module.title) throw new Error("No module title generated");
  });

  // Test 6: Intervention Engine
  await runTest(results, "Intervention Engine", async () => {
    const { interventionEngine } = await import("../src/lib/ai/engines/intervention");
    const result = await interventionEngine.recommendIntervention(
      { id: "test", name: "Alex", age: 10, grade: 5, developmentalStage: "ELEMENTARY", confidenceLevel: 2, learningPace: "slow", preferredStyle: "visual", engagementPattern: "declining", frustrationThreshold: 2, retentionStrength: "weak", strengths: ["Addition"], challenges: ["Fractions", "Division"], preferences: { style: "visual", hardTopics: ["Fractions"] } },
      { estimatedLevel: "Grade 3", levelComparison: "Below grade level", masteredSkills: [], developingSkills: [], weakSkills: [{ id: "1", name: "Fractions", domain: "Math", masteryScore: 15, confidenceScore: 10, status: "EMERGING" }], rootCauses: ["Missing prerequisite skills", "Low confidence"], recommendedStartingPoint: "Rebuild confidence with basics" },
      "Mathematics"
    );
    console.log(`  Intervention needed: ${(result as any).needed}`);
    if ((result as any).needed) {
      console.log(`  Type: ${(result as any).type}`);
      console.log(`  Reason: ${(result as any).plan?.reason?.slice(0, 80)}...`);
    }
  });

  // Test 7: Report Engine
  await runTest(results, "Report Engine", async () => {
    const { reportEngine } = await import("../src/lib/ai/engines/reporting");
    const report = await reportEngine.generateProgressReport({
      learnerName: "Alex",
      age: 10,
      grade: 5,
      domainName: "Mathematics",
      periodStart: "2025-01-20",
      periodEnd: "2025-01-27",
      modulesCompleted: 4,
      totalTimeMinutes: 52,
      skillsWorkedOn: [{ name: "Fractions", startMastery: 20, endMastery: 35 }, { name: "Multiplication", startMastery: 65, endMastery: 72 }],
      confidenceRatings: [5, 6, 6, 7, 7],
      frustrationEvents: 1,
      sessionCount: 5,
      recipientRole: "parent",
    });
    console.log(`  Summary: "${report.progressSummary?.slice(0, 80)}..."`);
    console.log(`  Strengths: ${report.strengths?.length} | Steps: ${report.recommendedNextSteps?.length}`);
    if (!report.progressSummary) throw new Error("No summary generated");
  });

  // Summary
  console.log(`\n${DIVIDER}`);
  console.log("📊 RESULTS\n");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  results.forEach((r) => {
    const icon = r.passed ? "✅" : "❌";
    console.log(`${icon} ${r.test} (${r.time}ms)${r.error ? ` — ${r.error}` : ""}`);
  });
  console.log(`\n${passed}/${results.length} passed, ${failed} failed`);
  console.log(`Total time: ${results.reduce((sum, r) => sum + r.time, 0)}ms`);

  if (failed > 0) process.exit(1);
}

async function runTest(results: any[], name: string, fn: () => Promise<void>) {
  console.log(`\n${DIVIDER}`);
  console.log(`🧪 ${name}`);
  const start = Date.now();
  try {
    await fn();
    const time = Date.now() - start;
    results.push({ test: name, passed: true, time });
    console.log(`  ✅ PASSED (${time}ms)`);
  } catch (error: any) {
    const time = Date.now() - start;
    results.push({ test: name, passed: false, time, error: error.message });
    console.log(`  ❌ FAILED: ${error.message}`);
  }
}

main().catch(console.error);
