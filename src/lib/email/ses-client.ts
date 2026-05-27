import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });

const FROM_EMAIL = process.env.SES_FROM_EMAIL || "noreply@mathpath.dev";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Skip in demo mode
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    console.log(`[DEMO] Email to ${options.to}: ${options.subject}`);
    return true;
  }

  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: { Data: options.html },
          ...(options.text ? { Text: { Data: options.text } } : {}),
        },
      },
    });

    await ses.send(command);
    return true;
  } catch (error) {
    console.error("SES send error:", error);
    return false;
  }
}
