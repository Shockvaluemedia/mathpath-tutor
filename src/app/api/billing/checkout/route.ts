import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo-data";
import { prisma } from "@/lib/db";
import { authenticateRequest, requireRequestLearnerAccess } from "@/lib/auth-middleware";
import { stripe, PLANS, SPRINT_OFFER } from "@/lib/stripe";
import {
  getOrCreateActiveSprintEnrollment,
  recordSprintEvent,
} from "@/lib/sprint-events";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, interval = "monthly" } = body;
    const studentId = typeof body.studentId === "string" ? body.studentId : "";

    if (typeof planId !== "string") {
      return NextResponse.json({ error: "Plan required" }, { status: 400 });
    }

    if (interval !== "monthly" && interval !== "yearly") {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const appUrl = DEMO_MODE
      ? request.nextUrl.origin
      : process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (DEMO_MODE) {
      return NextResponse.json({
        url: `${appUrl}/billing/success?session_id=demo_session&offer=${planId.toLowerCase()}`,
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

    const normalizedPlanId = planId.toUpperCase();

    if (normalizedPlanId === "SPRINT") {
      if (!studentId) {
        return NextResponse.json(
          { error: "Add or select a learner before purchasing the Sprint" },
          { status: 400 }
        );
      }

      const access = await requireRequestLearnerAccess(request, studentId);
      if (!access.ok) return access.response;

      const enrollment = await getOrCreateActiveSprintEnrollment(studentId);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ price: SPRINT_OFFER.stripePrice, quantity: 1 }],
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}&offer=sprint`,
        cancel_url: `${appUrl}/billing/plans`,
        ...(user.stripeCustomerId
          ? { customer: user.stripeCustomerId }
          : { customer_email: user.email }),
        metadata: {
          userId: user.id,
          planId: SPRINT_OFFER.id,
          studentId,
          sprintEnrollmentId: enrollment.id,
        },
      });

      await recordSprintEvent({
        enrollmentId: enrollment.id,
        name: "checkout_started",
        idempotencyKey: `${enrollment.id}:checkout_started:${session.id}`,
        metadata: {
          checkoutSessionId: session.id,
          priceCents: SPRINT_OFFER.price,
          currency: SPRINT_OFFER.currency,
        },
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    const plan = PLANS[normalizedPlanId as keyof typeof PLANS];
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
