import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth-middleware";
import { stripe, PLANS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, interval = "monthly" } = body;

    if (typeof planId !== "string") {
      return NextResponse.json({ error: "Plan required" }, { status: 400 });
    }

    if (interval !== "monthly" && interval !== "yearly") {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (DEMO_MODE) {
      return NextResponse.json({
        url: `${appUrl}/billing/success?session_id=demo_session`,
        sessionId: "demo_session",
      });
    }

    const auth = authenticateRequest(request);
    if (!auth.ok) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const normalizedPlanId = planId.toUpperCase() as keyof typeof PLANS;
    const plan = PLANS[normalizedPlanId];
    if (!plan || normalizedPlanId === "FREE") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = interval === "yearly"
      ? (plan as any).stripePriceYearly
      : (plan as any).stripePriceMonthly;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/plans`,
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
      metadata: { userId: user.id, planId: plan.id },
      subscription_data: {
        metadata: { userId: user.id, planId: plan.id },
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
