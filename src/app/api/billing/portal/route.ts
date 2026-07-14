import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth-middleware";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Customer Portal session for managing subscriptions

export async function POST(request: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (DEMO_MODE) {
      return NextResponse.json({
        url: `${appUrl}/billing/plans`,
      });
    }

    const auth = authenticateRequest(request);
    if (!auth.ok) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "Billing account not found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
