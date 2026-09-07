import 'server-only';
import type { Plan, Prisma, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * The single writer of subscription entitlement.
 *
 * Nothing else in the application may set `Subscription.plan`. Every path that
 * changes what a user is entitled to — a verified Paddle webhook, or an audited
 * manual admin grant — goes through here, which is what makes "the frontend can
 * never grant itself Pro" true by construction rather than by convention.
 */
export type SubscriptionState = {
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  /** Where this entitlement came from. Never derived from a request body. */
  provider: 'paddle' | 'manual' | 'internal';
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  priceId?: string | null;
  /** Verbatim provider status, for support. */
  providerStatus?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  pausedAt?: Date | null;
  endedAt?: Date | null;
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/**
 * Applies a verified subscription state to the database.
 *
 * The write is transactional and also refreshes the denormalised `plan` and
 * `subscriptionStatus` on `User`, so the two representations cannot drift.
 */
export async function applySubscriptionState(state: SubscriptionState, context: { reason: string }) {
  const now = new Date();
  const periodStart = state.currentPeriodStart ?? now;
  const periodEnd = state.currentPeriodEnd ?? addMonths(periodStart, 1);

  const data = {
    plan: state.plan,
    status: state.status,
    provider: state.provider,
    providerCustomerId: state.providerCustomerId ?? undefined,
    providerSubscriptionId: state.providerSubscriptionId ?? undefined,
    priceId: state.priceId ?? undefined,
    providerStatus: state.providerStatus ?? undefined,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd ?? false,
    pausedAt: state.pausedAt ?? null,
    endedAt: state.endedAt ?? null,
  } satisfies Prisma.SubscriptionUncheckedUpdateInput;

  const [subscription] = await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId: state.userId },
      create: { userId: state.userId, ...data },
      update: data,
    }),
    prisma.user.update({
      where: { id: state.userId },
      data: { plan: state.plan, subscriptionStatus: state.status },
    }),
  ]);

  await logger.info({
    event: 'billing.subscription_applied',
    message: `Subscription set to ${state.plan}/${state.status} (${state.provider})`,
    userId: state.userId,
    context: {
      reason: context.reason,
      provider: state.provider,
      providerSubscriptionId: state.providerSubscriptionId ?? null,
      periodEnd: periodEnd.toISOString(),
    },
  });

  return subscription;
}

/**
 * Drops a user back to Free. Used when Paddle reports the subscription has
 * ended, and when a manual grant is revoked or expires.
 */
export async function revertToFree(userId: string, context: { reason: string; endedAt?: Date }) {
  const now = new Date();
  return applySubscriptionState(
    {
      userId,
      plan: 'FREE',
      status: 'CANCELED',
      provider: 'internal',
      priceId: null,
      currentPeriodStart: now,
      currentPeriodEnd: addMonths(now, 1),
      cancelAtPeriodEnd: false,
      endedAt: context.endedAt ?? now,
    },
    context,
  );
}

/**
 * Maps a Paddle subscription status onto the local enum.
 *
 * A canceled subscription that is still inside its paid period keeps `ACTIVE`
 * with `cancelAtPeriodEnd`, so access is not withdrawn early — the caller
 * decides that from the period dates, not from the word "canceled".
 */
export function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  switch (paddleStatus) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
      return 'PAST_DUE';
    case 'paused':
      return 'PAUSED';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'ACTIVE';
  }
}

/**
 * Whether a subscription record currently entitles the user to its paid plan.
 *
 * `past_due` deliberately keeps access: Paddle retries the payment, and cutting
 * a paying customer off during a dunning cycle loses more than it protects.
 * Access ends when Paddle says the subscription ended, or the period lapses.
 */
export function entitlementIsActive(subscription: {
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  endedAt: Date | null;
}) {
  if (subscription.endedAt && subscription.endedAt.getTime() <= Date.now()) return false;
  if (subscription.status === 'PAUSED') return false;
  if (subscription.status === 'CANCELED') {
    // Canceled but still paid for: access runs to the end of the period.
    return subscription.currentPeriodEnd.getTime() > Date.now();
  }
  return true;
}
