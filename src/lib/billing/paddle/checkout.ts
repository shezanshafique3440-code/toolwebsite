import 'server-only';
import type { Plan } from '@prisma/client';
import { ApiError } from '@paddle/paddle-node-sdk';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { describeError, logger } from '@/lib/logger';
import { getPaddleClient } from '@/lib/billing/paddle/client';
import { priceIdForPlan } from '@/lib/billing/paddle/config';
import { ensureSubscription } from '@/lib/billing/service';

export type CheckoutIntent = {
  /** Paddle transaction to open in the checkout. */
  transactionId: string;
  /** Public client-side token; safe to send to the browser. */
  clientToken: string;
  environment: 'sandbox' | 'production';
  plan: Plan;
};

/**
 * Finds or creates the Paddle customer for a user and remembers the id.
 *
 * Reusing the same customer keeps a person's subscriptions, invoices and
 * payment methods together in Paddle instead of creating a new customer on
 * every checkout.
 */
async function ensurePaddleCustomer(user: { id: string; email: string; name: string }) {
  const { paddle } = getPaddleClient();
  const subscription = await ensureSubscription(user.id);
  if (subscription.providerCustomerId) return subscription.providerCustomerId;

  // Paddle rejects a duplicate email, so an existing customer is reused.
  let customerId: string | null = null;
  try {
    const existing = paddle.customers.list({ email: [user.email] });
    for await (const customer of existing) {
      customerId = customer.id;
      break;
    }
  } catch (error) {
    await logger.warn({
      event: 'billing.customer_lookup_failed',
      message: 'Could not look up the Paddle customer; will attempt to create one',
      userId: user.id,
      context: describeError(error),
    });
  }

  if (!customerId) {
    const created = await paddle.customers.create({
      email: user.email,
      name: user.name,
      // Lets a Paddle-side record be traced back to this account.
      customData: { userId: user.id },
    });
    customerId = created.id;
  }

  await prisma.subscription.update({
    where: { userId: user.id },
    data: { providerCustomerId: customerId },
  });

  return customerId;
}

/**
 * Creates a Paddle transaction for a plan upgrade and returns what the browser
 * needs to open the hosted checkout.
 *
 * This grants nothing. The user's plan changes only when Paddle later sends a
 * verified webhook confirming the subscription is active.
 */
export async function createCheckoutIntent(
  user: { id: string; email: string; name: string },
  plan: Exclude<Plan, 'FREE'>,
): Promise<CheckoutIntent> {
  const { paddle, config } = getPaddleClient();
  const priceId = priceIdForPlan(config, plan);

  let customerId: string;
  try {
    customerId = await ensurePaddleCustomer(user);
  } catch (error) {
    // Includes a rejected API key: the customer never reaches a raw provider error.
    throw toBillingError(error, user.id, 'resolve customer');
  }

  try {
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customerId,
      // Echoed back on every webhook for this subscription, so the event can be
      // matched to an account even before a subscription id is stored.
      customData: { userId: user.id, plan },
    });

    await logger.info({
      event: 'billing.checkout_created',
      message: `Checkout opened for ${plan}`,
      userId: user.id,
      context: { transactionId: transaction.id, plan },
    });

    return {
      transactionId: transaction.id,
      clientToken: config.clientToken,
      environment: config.environment,
      plan,
    };
  } catch (error) {
    throw toBillingError(error, user.id, 'create checkout');
  }
}

/**
 * Opens a Paddle customer portal session: billing details, payment method,
 * invoices and cancellation are all handled by Paddle, so this application
 * never builds payment-management screens of its own.
 */
export async function createPortalSession(userId: string) {
  const { paddle } = getPaddleClient();
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { providerCustomerId: true, providerSubscriptionId: true },
  });

  if (!subscription?.providerCustomerId) {
    throw new AppError('NOT_FOUND', 'There is no billing account to manage yet.');
  }

  try {
    const session = await paddle.customerPortalSessions.create(
      subscription.providerCustomerId,
      subscription.providerSubscriptionId ? [subscription.providerSubscriptionId] : [],
    );

    const forSubscription = session.urls.subscriptions.find(
      (entry) => entry.id === subscription.providerSubscriptionId,
    );

    return {
      overviewUrl: session.urls.general.overview,
      cancelUrl: forSubscription?.cancelSubscription ?? null,
      updatePaymentMethodUrl: forSubscription?.updateSubscriptionPaymentMethod ?? null,
    };
  } catch (error) {
    throw toBillingError(error, userId, 'open customer portal');
  }
}

/**
 * Requests cancellation at the end of the paid period.
 *
 * The local record is not changed here: Paddle confirms the cancellation with a
 * `subscription.updated` / `subscription.canceled` webhook, and that is what
 * updates entitlement. Access continues until the period actually ends.
 */
export async function cancelSubscriptionAtPeriodEnd(userId: string) {
  const { paddle } = getPaddleClient();
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { providerSubscriptionId: true, provider: true },
  });

  if (subscription?.provider !== 'paddle' || !subscription.providerSubscriptionId) {
    throw new AppError('NOT_FOUND', 'There is no active paid subscription to cancel.');
  }

  try {
    await paddle.subscriptions.cancel(subscription.providerSubscriptionId, {
      effectiveFrom: 'next_billing_period',
    });

    await logger.info({
      event: 'billing.cancel_requested',
      message: 'Cancellation requested at period end',
      userId,
      context: { providerSubscriptionId: subscription.providerSubscriptionId },
    });
  } catch (error) {
    throw toBillingError(error, userId, 'cancel subscription');
  }
}

/**
 * Maps a Paddle API failure to a user-safe error. The provider's message is
 * logged, never returned: it can name internal ids and configuration.
 */
function toBillingError(error: unknown, userId: string, action: string) {
  if (error instanceof AppError) return error;

  void logger.error({
    event: 'billing.paddle_error',
    message: `Paddle request failed: ${action}`,
    userId,
    context: error instanceof ApiError ? { code: error.code, detail: error.detail } : describeError(error),
  });

  return new AppError('BILLING_UNAVAILABLE', 'We could not reach the payment provider. Please try again.');
}
