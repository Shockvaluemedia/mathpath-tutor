import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

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

        if (userId && planId) {
          // Update user's subscription in database
          await prisma.user.update({
            where: { id: userId },
            data: {
              planId,
              // In production, add subscription fields to the User model:
              // subscriptionId: session.subscription,
              // subscriptionStatus: "active",
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
