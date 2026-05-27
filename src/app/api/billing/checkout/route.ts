import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { stripe, PLANS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, interval = "monthly", userId, email } = body;

    if (!planId || !userId) {
      return NextResponse.json({ error: "Plan and user ID required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id=demo_session`,
        sessionId: "demo_session",
      });
    }

    const plan = PLANS[planId.toUpperCase() as keyof typeof PLANS];
    if (!plan || planId === "FREE") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = interval === "yearly"
      ? (plan as any).stripePriceYearly
      : (plan as any).stripePriceMonthly;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/plans`,
      customer_email: email,
      metadata: { userId, planId },
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
