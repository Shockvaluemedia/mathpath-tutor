/**
 * Test script for Bedrock AI integration
 * Run: npx tsx scripts/test-bedrock.ts
 *
 * Prerequisites:
 * - AWS credentials configured (env vars or ~/.aws/credentials)
 * - Bedrock model access enabled for Claude in your AWS account
 * - Set AI_PROVIDER=bedrock and AWS_REGION in .env
 */

import "dotenv/config";

async function testBedrock() {
  console.log("🧪 Testing Bedrock AI Integration\n");
  console.log(`Provider: ${process.env.AI_PROVIDER}`);
  console.log(`Model: ${process.env.AI_MODEL}`);
  console.log(`Region: ${process.env.AWS_REGION}\n`);

  if (process.env.AI_PROVIDER !== "bedrock") {
    console.log("⚠️  AI_PROVIDER is not set to 'bedrock'. Set it in .env to test Bedrock.");
    console.log("   Falling back to demo mode for this test.\n");
  }

  // Dynamic import to use the same config as the app
  const { chatCompletion } = await import("../src/lib/ai/config");

  // Test 1: Basic completion
  console.log("--- Test 1: Basic Math Question ---");
  try {
    const response = await chatCompletion({
      messages: [
        { role: "system", content: "You are a helpful math tutor. Be concise." },
        { role: "user", content: "What is 7 × 8? Just give the answer." },
      ],
      temperature: 0.3,
    });
    console.log(`✅ Response: ${response.trim()}\n`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 2: JSON mode
  console.log("--- Test 2: JSON Response ---");
  try {
    const response = await chatCompletion({
      messages: [
        { role: "system", content: "Return valid JSON only." },
        {
          role: "user",
          content: 'Generate a simple math question for a 5th grader. Return JSON: {"question": "...", "answer": "...", "hint": "..."}',
        },
      ],
      jsonMode: true,
      temperature: 0.7,
    });
    const parsed = JSON.parse(response);
    console.log(`✅ Question: ${parsed.question}`);
    console.log(`   Answer: ${parsed.answer}`);
    console.log(`   Hint: ${parsed.hint}\n`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 3: Tutor-style conversation
  console.log("--- Test 3: Tutor Conversation ---");
  try {
    const response = await chatCompletion({
      messages: [
        {
          role: "system",
          content: "You are a patient math tutor for a 10-year-old. Never give the answer directly. Ask guiding questions. Be encouraging. Keep it short (2-3 sentences max).",
        },
        { role: "user", content: "I don't understand fractions. What is 1/2 + 1/4?" },
      ],
      temperature: 0.8,
    });
    console.log(`✅ Tutor: ${response.trim()}\n`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 4: Frustration detection response
  console.log("--- Test 4: Frustration Handling ---");
  try {
    const response = await chatCompletion({
      messages: [
        {
          role: "system",
          content: "You are a supportive math tutor. The student is frustrated. Acknowledge their feelings, slow down, and offer a simpler approach. Be warm and brief.",
        },
        { role: "user", content: "I hate math. I can't do this. It's too hard and I'm stupid." },
      ],
      temperature: 0.8,
    });
    console.log(`✅ Tutor: ${response.trim()}\n`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  console.log("🏁 Tests complete!");
}

testBedrock().catch(console.error);
