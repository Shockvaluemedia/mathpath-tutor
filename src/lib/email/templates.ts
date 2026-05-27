// Email templates for MathPath Tutor

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MathPath Tutor</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="text-align:center;padding:20px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#9333ea);border-radius:12px;padding:10px 14px;">
        <span style="color:white;font-weight:bold;font-size:18px;">M</span>
      </div>
      <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#1f2937;">MathPath Tutor</p>
    </div>
    <!-- Content -->
    <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:20px 0;color:#9ca3af;font-size:12px;">
      <p>MathPath Tutor — Personalized math growth for every student</p>
      <p>You're receiving this because you have a MathPath account.</p>
    </div>
  </div>
</body>
</html>`;
}

export function weeklyReportEmail(data: {
  parentName: string;
  studentName: string;
  progressSummary: string;
  strengths: string[];
  weaknesses: string[];
  recommendedNextSteps: string[];
  lessonsCompleted: number;
  timeSpentMinutes: number;
  confidenceTrend: string;
}): { subject: string; html: string; text: string } {
  const trendEmoji = data.confidenceTrend === "improving" ? "📈" : data.confidenceTrend === "declining" ? "📉" : "➡️";

  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">Weekly Progress Report</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Here's how ${data.studentName} did this week</p>

    <!-- Stats -->
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
        <p style="margin:0;font-size:24px;font-weight:bold;color:#166534;">${data.lessonsCompleted}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#4ade80;">Lessons</p>
      </div>
      <div style="flex:1;background:#eff6ff;border-radius:8px;padding:12px;text-align:center;">
        <p style="margin:0;font-size:24px;font-weight:bold;color:#1e40af;">${data.timeSpentMinutes}m</p>
        <p style="margin:4px 0 0;font-size:11px;color:#60a5fa;">Time</p>
      </div>
      <div style="flex:1;background:#fef3c7;border-radius:8px;padding:12px;text-align:center;">
        <p style="margin:0;font-size:24px;font-weight:bold;color:#92400e;">${trendEmoji}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#f59e0b;">Confidence</p>
      </div>
    </div>

    <!-- Summary -->
    <p style="color:#374151;font-size:14px;line-height:1.6;">${data.progressSummary}</p>

    <!-- Strengths -->
    <h3 style="margin:24px 0 8px;color:#166534;font-size:14px;">💪 Strengths</h3>
    <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">
      ${data.strengths.map((s) => `<li style="margin-bottom:4px;">${s}</li>`).join("")}
    </ul>

    <!-- Focus Areas -->
    <h3 style="margin:24px 0 8px;color:#92400e;font-size:14px;">🎯 Focus Areas</h3>
    <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">
      ${data.weaknesses.map((w) => `<li style="margin-bottom:4px;">${w}</li>`).join("")}
    </ul>

    <!-- Next Steps -->
    <h3 style="margin:24px 0 8px;color:#4338ca;font-size:14px;">📋 Recommended Next Steps</h3>
    <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;">
      ${data.recommendedNextSteps.map((s) => `<li style="margin-bottom:4px;">${s}</li>`).join("")}
    </ul>

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">View Full Dashboard</a>
    </div>
  `);

  const text = `Weekly Progress Report for ${data.studentName}

${data.progressSummary}

Lessons completed: ${data.lessonsCompleted}
Time spent: ${data.timeSpentMinutes} minutes
Confidence: ${data.confidenceTrend}

Strengths: ${data.strengths.join(", ")}
Focus areas: ${data.weaknesses.join(", ")}
Next steps: ${data.recommendedNextSteps.join(", ")}`;

  return {
    subject: `📊 ${data.studentName}'s Weekly Math Progress`,
    html,
    text,
  };
}

export function streakReminderEmail(data: {
  parentName: string;
  studentName: string;
  currentStreak: number;
  lastActive: string;
}): { subject: string; html: string; text: string } {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">🔥 Keep the streak alive!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      ${data.studentName} has a ${data.currentStreak}-day streak going!
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Hi ${data.parentName},<br><br>
      ${data.studentName} hasn't practiced today yet. A quick 10-minute session will keep their ${data.currentStreak}-day streak alive and reinforce what they've been learning.
    </p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/learn" style="display:inline-block;background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">Start Today's Lesson</a>
    </div>
  `);

  return {
    subject: `🔥 ${data.studentName}'s ${data.currentStreak}-day streak needs you!`,
    html,
    text: `${data.studentName} has a ${data.currentStreak}-day streak! A quick session today will keep it going.`,
  };
}

export function inactivityNudgeEmail(data: {
  parentName: string;
  studentName: string;
  daysSinceActive: number;
}): { subject: string; html: string; text: string } {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">We miss ${data.studentName}! 👋</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      It's been ${data.daysSinceActive} days since their last practice session.
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Hi ${data.parentName},<br><br>
      Consistency is key to math growth. Even 10 minutes a day makes a big difference. ${data.studentName}'s personalized lesson is ready and waiting — it picks up right where they left off.
    </p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/learn" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">Resume Learning</a>
    </div>
  `);

  return {
    subject: `${data.studentName} hasn't practiced in ${data.daysSinceActive} days`,
    html,
    text: `It's been ${data.daysSinceActive} days since ${data.studentName}'s last session. Their personalized lesson is ready!`,
  };
}

export function welcomeEmail(data: {
  parentName: string;
}): { subject: string; html: string; text: string } {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">Welcome to MathPath! 🎉</h2>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Hi ${data.parentName},<br><br>
      You're all set! Here's what happens next:
    </p>
    <ol style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;">
      <li>Add your student's profile</li>
      <li>They'll take a quick diagnostic assessment (~15 min)</li>
      <li>We'll build their personalized skill profile</li>
      <li>Daily lessons start immediately</li>
    </ol>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      You'll get weekly progress reports showing exactly what they're learning and where they're growing.
    </p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">Add Your Student</a>
    </div>
  `);

  return {
    subject: "Welcome to MathPath Tutor! 🎉",
    html,
    text: `Welcome to MathPath, ${data.parentName}! Add your student to get started with personalized math tutoring.`,
  };
}
