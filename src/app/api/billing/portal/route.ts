import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Customer Portal session for managing subscriptions

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (DEMO_MODE) {
      return NextResponse.json({
        url: `${appUrl}/billing/plans`,
      });
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
