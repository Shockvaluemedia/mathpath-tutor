import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { recordSprintEvent } from "@/lib/sprint-events";

// Stripe webhook handler
// Configure webhook endpoint in Stripe dashboard pointing to /api/billing/webhook

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { db: prisma } = await import("@/lib/db");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const sprintEnrollmentId = session.metadata?.sprintEnrollmentId;
        const stripeCustomerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

        if (userId && stripeCustomerId) {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId },
          });
        }

        if (planId === "sprint" && sprintEnrollmentId && session.payment_status === "paid") {
          await prisma.sprintEnrollment.update({
            where: { id: sprintEnrollmentId },
            data: {
              priceCents: session.amount_total ?? 4900,
              currency: session.currency ?? "usd",
              stripeCheckoutSessionId: session.id,
              paidAt: new Date(),
            },
          });
          await recordSprintEvent({
            enrollmentId: sprintEnrollmentId,
            name: "payment_completed",
            idempotencyKey: `${sprintEnrollmentId}:payment_completed:${session.id}`,
            metadata: {
              checkoutSessionId: session.id,
              amountTotal: session.amount_total,
              currency: session.currency,
            },
          });
          console.log(`Sprint payment completed: enrollment=${sprintEnrollmentId}`);
          break;
        }

        if (planId === "sprint") {
          break;
        }

        if (userId && planId) {
          // Update user's subscription in database
          await prisma.user.update({
            where: { id: userId },
            data: {
              planId,
              ...(stripeCustomerId && { stripeCustomerId }),
            },
          });
          console.log(`Subscription activated: user=${userId} plan=${planId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const status = subscription.status;
          console.log(`Subscription updated: user=${userId} status=${status}`);
          // Update subscription status in database
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          console.log(`Subscription cancelled: user=${userId}`);
          await prisma.user.update({
            where: { id: userId },
            data: { planId: "free" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log(`Payment failed: customer=${invoice.customer}`);
        // Send payment failure email, maybe grace period
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
