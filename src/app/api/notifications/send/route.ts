import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { sendEmail, weeklyReportEmail, streakReminderEmail, inactivityNudgeEmail } from "@/lib/email";

// This endpoint is designed to be called by a scheduled task (EventBridge, cron)
// Protected by an API key rather than user auth

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const apiKey = request.headers.get("x-api-key");
    if (!DEMO_MODE && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json({ error: "Notification type required" }, { status: 400 });
    }

    let emailContent;
    let recipientEmail = data?.email;

    switch (type) {
      case "weekly_report":
        emailContent = weeklyReportEmail(data);
        break;
      case "streak_reminder":
        emailContent = streakReminderEmail(data);
        break;
      case "inactivity_nudge":
        emailContent = inactivityNudgeEmail(data);
        break;
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: "Recipient email required" }, { status: 400 });
    }

    const success = await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({ success, type, to: recipientEmail });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
