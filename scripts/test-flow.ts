/**
 * End-to-end flow test — simulates a complete user journey
 * Works in both demo mode and production mode
 *
 * Run: npx tsx scripts/test-flow.ts
 */

import "dotenv/config";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function api(path: string, options: any = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log("🧪 End-to-End Flow Test");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Demo Mode: ${process.env.NEXT_PUBLIC_DEMO_MODE}\n`);

  let token: string;
  let studentId: string;

  // 1. Health check
  console.log("1️⃣  Health check...");
  const health = await api("/api/health");
  console.log(`   Status: ${health.status} | AI: ${health.aiProvider} | Demo: ${health.demoMode}\n`);

  // 2. Parent signup
  console.log("2️⃣  Parent signup...");
  const signup = await api("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name: "Test Parent", email: `test-${Date.now()}@flow.dev`, password: "test123456" }),
  });
  token = signup.token;
  console.log(`   User: ${signup.user.name} (${signup.user.role})\n`);

  // 3. Add student
  console.log("3️⃣  Add student...");
  const student = await api("/api/students", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: "TestKid",
      age: 10,
      grade: 5,
      confidenceLevel: 6,
      learningPreferences: { style: "visual", hardTopics: ["Fractions"] },
    }),
  });
  studentId = student.student.id;
  console.log(`   Student: ${student.student.name} (Grade ${student.student.grade}, ${student.student.gradeBand})\n`);

  // 4. Generate diagnostic
  console.log("4️⃣  Generate diagnostic...");
  const diagnostic = await api("/api/diagnostic/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ studentId }),
  });
  console.log(`   Questions: ${diagnostic.questions.length}`);
  console.log(`   Assessment ID: ${diagnostic.assessmentId}`);
  if (diagnostic.questions[0]) {
    console.log(`   Sample: "${diagnostic.questions[0].question}"\n`);
  }

  // 5. Submit answers
  console.log("5️⃣  Submit diagnostic answers...");
  const responses = diagnostic.questions.slice(0, 3).map((q: any) => ({
    skillId: q.skillId,
    question: q.question,
    studentAnswer: q.correctAnswer, // answer correctly for test
    correctAnswer: q.correctAnswer,
    isCorrect: true,
    timeSpent: 15,
    hintsUsed: 0,
    confidenceRating: 7,
  }));
  const submit = await api("/api/diagnostic/submit", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assessmentId: diagnostic.assessmentId, studentId, responses }),
  });
  console.log(`   Evaluations: ${submit.evaluations.length}`);
  console.log(`   First result: ${submit.evaluations[0]?.isCorrect ? "✓ Correct" : "✗ Incorrect"}\n`);

  // 6. Generate lesson
  console.log("6️⃣  Generate lesson...");
  const lesson = await api("/api/lessons/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ studentId }),
  });
  console.log(`   Title: "${lesson.lesson.title}"`);
  console.log(`   Skill: ${lesson.lesson.focusSkill}\n`);

  // 7. Chat with tutor
  console.log("7️⃣  Chat with tutor...");
  const chat = await api("/api/tutor/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ studentId, message: "Can you help me understand fractions?" }),
  });
  console.log(`   Response: "${chat.response.slice(0, 100)}..."`);
  console.log(`   Frustration: ${chat.metadata.frustrationDetected}\n`);

  // 8. Get progress
  console.log("8️⃣  Get progress...");
  const progress = await api(`/api/students/${studentId}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Mastered: ${progress.stats.masteredSkillsCount} skills`);
  console.log(`   Confidence: ${progress.stats.avgConfidence}/10\n`);

  // 9. Get gamification
  console.log("9️⃣  Get gamification...");
  const gamification = await api(`/api/students/${studentId}/gamification`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   XP: ${gamification.xp} | Level: ${gamification.level} (${gamification.levelName})`);
  console.log(`   Badges: ${gamification.badges.length}\n`);

  // 10. Domain lesson (Reading)
  console.log("🔟 Generate Reading lesson...");
  const readingLesson = await api("/api/domains/reading/lessons", {
    method: "POST",
    body: JSON.stringify({ studentId }),
  });
  console.log(`   Title: "${readingLesson.lesson.title}"`);
  console.log(`   Sections: ${readingLesson.lesson.sections.length}\n`);

  // 11. Get domains
  console.log("1️⃣1️⃣ List domains...");
  const domains = await api("/api/domains");
  console.log(`   Active: ${domains.domains.length} | Total: ${domains.allDomains.length}`);
  console.log(`   Domains: ${domains.domains.map((d: any) => d.name).join(", ")}\n`);

  // Summary
  console.log("═══════════════════════════════════════════════════");
  console.log("✅ Full flow test PASSED");
  console.log("");
  console.log("The complete user journey works:");
  console.log("  Signup → Add Student → Diagnostic → Lesson → Tutor → Progress → Gamification → Multi-domain");
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(`\n❌ FAILED: ${err.message}`);
  process.exit(1);
});
