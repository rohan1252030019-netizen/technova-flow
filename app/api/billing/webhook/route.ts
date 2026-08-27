import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 400 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const orgId = session.metadata?.orgId;
        const planId = session.metadata?.planId || "PRO";

        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              plan: planId,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: "active",
            },
          });

          await audit({
            userId: null,
            action: "UPDATE",
            entityType: "Subscription",
            entityId: orgId,
            details: { event: "checkout.session.completed", plan: planId, customer: session.customer },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const org = await prisma.organization.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (org) {
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              subscriptionStatus: subscription.status,
              currentPeriodEnd,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const org = await prisma.organization.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              plan: "FREE",
              subscriptionStatus: "canceled",
            },
          });

          await audit({
            userId: null,
            action: "UPDATE",
            entityType: "Subscription",
            entityId: org.id,
            details: { event: "customer.subscription.deleted", status: "canceled" },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const org = await prisma.organization.findUnique({
            where: { stripeSubscriptionId: invoice.subscription },
          });

          if (org && invoice.lines?.data?.[0]?.period?.end) {
            await prisma.organization.update({
              where: { id: org.id },
              data: {
                subscriptionStatus: "active",
                currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const org = await prisma.organization.findUnique({
            where: { stripeSubscriptionId: invoice.subscription },
          });

          if (org) {
            await prisma.organization.update({
              where: { id: org.id },
              data: { subscriptionStatus: "past_due" },
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Error processing webhook:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
