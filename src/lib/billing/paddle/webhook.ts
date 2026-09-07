import 'server-only';
import type { Plan, Prisma } from '@prisma/client';
import { EventName, type EventEntity } from '@paddle/paddle-node-sdk';
import { prisma } from '@/lib/db';
import { describeError, logger } from '@/lib/logger';
import { getPaddleClient } from '@/lib/billing/paddle/client';
import { planForPriceId, type PaddleConfig } from '@/lib/billing/paddle/config';
import { applySubscriptionState, mapPaddleStatus, revertToFree } from '@/lib/billing/subscription-state';
import { billingEmails } from '@/lib/billing/emails';

export type WebhookOutcome =
  | { status: 'processed'; eventType: string }
  | { status: 'duplicate'; eventType: string }
  | { status: 'ignored'; eventType: string }
  | { status: 'unmapped'; eventType: string };

/**
 * Verifies a Paddle webhook and returns the parsed event.
 *
 * Verification is mandatory: without it anyone could POST a "subscription
 * activated" body and upgrade themselves for free. A bad signature returns
 * null and the caller answers 400 without touching the database.
 */
export async function verifyPaddleWebhook(rawBody: string, signature: string | null) {
  if (!signature) {
    await logger.warn({
      event: 'billing.webhook_missing_signature',
      message: 'Rejected a Paddle webhook that carried no signature header',
    });
    return null;
  }

  const { paddle, config } = getPaddleClient();

  // Checked first and separately, so the log distinguishes a forged request
  // from a genuine one whose body this SDK version cannot parse. Both are
  // refused, but they need very different investigation.
  let signatureValid = false;
  try {
    signatureValid = await paddle.webhooks.isSignatureValid(rawBody, config.webhookSecret, signature);
  } catch (error) {
    await logger.warn({
      event: 'billing.webhook_invalid_signature',
      message: 'Rejected a Paddle webhook: signature header could not be read',
      context: describeError(error),
    });
    return null;
  }

  if (!signatureValid) {
    await logger.warn({
      event: 'billing.webhook_invalid_signature',
      message: 'Rejected a Paddle webhook with an invalid signature',
    });
    return null;
  }

  try {
    const event = await paddle.webhooks.unmarshal(rawBody, config.webhookSecret, signature);
    return event ? { event, config } : null;
  } catch (error) {
    // The signature was valid, so this really came from Paddle — an event shape
    // this SDK version does not understand. Surfaced loudly rather than
    // silently dropped.
    await logger.error({
      event: 'billing.webhook_unparseable',
      message: 'A correctly-signed Paddle webhook could not be parsed',
      context: describeError(error),
    });
    return null;
  }
}

/** Shape shared by the subscription events this application reacts to. */
type SubscriptionEventData = {
  id: string;
  status: string;
  customerId: string;
  currentBillingPeriod?: { startsAt: string; endsAt: string } | null;
  scheduledChange?: { action: string; effectiveAt: string } | null;
  items?: Array<{ price?: { id?: string | null } | null }>;
  customData?: unknown;
  canceledAt?: string | null;
  pausedAt?: string | null;
};

function readUserIdFromCustomData(customData: unknown): string | null {
  if (!customData || typeof customData !== 'object') return null;
  const value = (customData as Record<string, unknown>).userId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Resolves which local account an event belongs to.
 *
 * Custom data is the primary link because it is set when the checkout is
 * created. The provider ids are fallbacks for subscriptions created outside
 * this flow (for example, imported in the Paddle dashboard).
 */
async function resolveUserId(data: SubscriptionEventData): Promise<string | null> {
  const fromCustomData = readUserIdFromCustomData(data.customData);
  if (fromCustomData) {
    const user = await prisma.user.findUnique({ where: { id: fromCustomData }, select: { id: true } });
    if (user) return user.id;
  }

  const bySubscription = await prisma.subscription.findUnique({
    where: { providerSubscriptionId: data.id },
    select: { userId: true },
  });
  if (bySubscription) return bySubscription.userId;

  const byCustomer = await prisma.subscription.findFirst({
    where: { providerCustomerId: data.customerId },
    select: { userId: true },
  });
  return byCustomer?.userId ?? null;
}

/** Applies a subscription event to the local entitlement record. */
async function applySubscriptionEvent(
  data: SubscriptionEventData,
  config: PaddleConfig,
  eventType: string,
): Promise<WebhookOutcome> {
  const userId = await resolveUserId(data);
  if (!userId) {
    await logger.warn({
      event: 'billing.webhook_unmapped',
      message: `Could not map ${eventType} to an account`,
      context: { subscriptionId: data.id, customerId: data.customerId },
    });
    return { status: 'unmapped', eventType };
  }

  const priceId = data.items?.[0]?.price?.id ?? null;
  const planFromPrice = planForPriceId(config, priceId);

  // An unrecognised price must not silently grant a plan. Keep whatever the
  // account already had and flag it for investigation.
  let plan: Plan;
  if (planFromPrice) {
    plan = planFromPrice;
  } else {
    const current = await prisma.subscription.findUnique({ where: { userId }, select: { plan: true } });
    plan = current?.plan ?? 'FREE';
    await logger.warn({
      event: 'billing.webhook_unknown_price',
      message: 'Subscription event referenced a price that is not configured',
      userId,
      context: { priceId, subscriptionId: data.id },
    });
  }

  const status = mapPaddleStatus(data.status);
  const period = data.currentBillingPeriod;
  const cancelAtPeriodEnd = data.scheduledChange?.action === 'cancel';

  // "canceled" with the period already over means the subscription has ended.
  const periodEnd = period ? new Date(period.endsAt) : null;
  const ended = data.status === 'canceled' && (!periodEnd || periodEnd.getTime() <= Date.now());

  if (ended) {
    await revertToFree(userId, { reason: `paddle:${eventType}` });
    await billingEmails.subscriptionCanceled({ userId });
    return { status: 'processed', eventType };
  }

  await applySubscriptionState(
    {
      userId,
      plan,
      status,
      provider: 'paddle',
      providerCustomerId: data.customerId,
      providerSubscriptionId: data.id,
      priceId,
      providerStatus: data.status,
      currentPeriodStart: period ? new Date(period.startsAt) : null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
      pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
    },
    { reason: `paddle:${eventType}` },
  );

  if (eventType === EventName.SubscriptionActivated || eventType === EventName.SubscriptionCreated) {
    await billingEmails.subscriptionStarted({ userId, plan });
  }
  if (eventType === EventName.SubscriptionPastDue) {
    await billingEmails.paymentFailed({ userId });
  }
  if (cancelAtPeriodEnd && periodEnd) {
    await billingEmails.subscriptionExpiring({ userId, endsAt: periodEnd });
  }

  return { status: 'processed', eventType };
}

/**
 * Handles one verified event.
 *
 * Idempotency is enforced by the unique `PaymentEvent.eventId`: a redelivered
 * event loses the insert race and is reported as a duplicate without being
 * applied twice.
 */
export async function handlePaddleEvent(event: EventEntity): Promise<WebhookOutcome> {
  const { config } = getPaddleClient();
  const eventType = String(event.eventType);

  try {
    await prisma.paymentEvent.create({
      data: {
        provider: 'paddle',
        eventId: event.eventId,
        eventType,
        payload: event.data as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Unique violation: this delivery has been seen before.
    await logger.info({
      event: 'billing.webhook_duplicate',
      message: `Ignored a repeated ${eventType} delivery`,
      context: { eventId: event.eventId },
    });
    return { status: 'duplicate', eventType };
  }

  let outcome: WebhookOutcome;
  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionImported:
        outcome = await applySubscriptionEvent(
          event.data as unknown as SubscriptionEventData,
          config,
          eventType,
        );
        break;

      case EventName.TransactionPaymentFailed: {
        // The matching subscription.past_due event carries the state change;
        // this is recorded so support can see the failed attempt.
        await logger.warn({
          event: 'billing.payment_failed',
          message: 'Paddle reported a failed payment',
          context: { eventId: event.eventId },
        });
        outcome = { status: 'processed', eventType };
        break;
      }

      case EventName.TransactionCompleted:
      case EventName.TransactionPaid: {
        await billingEmails.paymentSucceeded({ eventId: event.eventId });
        outcome = { status: 'processed', eventType };
        break;
      }

      default:
        outcome = { status: 'ignored', eventType };
    }

    await prisma.paymentEvent.update({
      where: { eventId: event.eventId },
      data: { processed: outcome.status === 'processed', processedAt: new Date() },
    });

    return outcome;
  } catch (error) {
    // Record why it failed so the delivery can be investigated and replayed.
    await prisma.paymentEvent
      .update({
        where: { eventId: event.eventId },
        data: {
          processed: false,
          processedAt: new Date(),
          error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
        },
      })
      .catch(() => undefined);

    await logger.error({
      event: 'billing.webhook_failed',
      message: `Failed to handle ${eventType}`,
      context: { eventId: event.eventId, ...describeError(error) },
    });

    throw error;
  }
}
