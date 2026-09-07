import 'server-only';
import type { Plan, Subscription, Usage } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PLANS } from '@/lib/plans';
import { entitlementIsActive } from '@/lib/billing/subscription-state';

export type BillingPeriod = { start: Date; end: Date };

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/**
 * Returns the subscription record, creating the default Free one on first
 * access.
 *
 * The usage window is only rolled forward for accounts this application owns
 * (Free and manual grants). For a Paddle-managed subscription the billing
 * period comes from Paddle and is written by the webhook — rolling it here
 * would let the local clock disagree with what the customer is actually billed.
 */
export async function ensureSubscription(userId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({ where: { userId } });

  if (!existing) {
    const start = new Date();
    return prisma.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        interval: 'MONTHLY',
        provider: 'internal',
        currentPeriodStart: start,
        currentPeriodEnd: addMonths(start, 1),
      },
    });
  }

  if (existing.provider === 'paddle') return existing;
  if (existing.currentPeriodEnd.getTime() > Date.now()) return existing;

  // A locally-managed period has lapsed: open the next one so monthly usage
  // resets. Catch up if the account was dormant for several periods.
  const months = existing.interval === 'YEARLY' ? 12 : 1;
  let start = existing.currentPeriodEnd;
  let end = addMonths(start, months);
  while (end.getTime() <= Date.now()) {
    start = end;
    end = addMonths(start, months);
  }

  return prisma.subscription.update({
    where: { userId },
    data: { currentPeriodStart: start, currentPeriodEnd: end },
  });
}

export async function getOrCreateUsage(userId: string, period: BillingPeriod): Promise<Usage> {
  const existing = await prisma.usage.findUnique({
    where: { userId_periodStart: { userId, periodStart: period.start } },
  });
  if (existing) return existing;
  return prisma.usage.create({
    data: { userId, periodStart: period.start, periodEnd: period.end },
  });
}

export type Entitlements = {
  /** The plan actually in force right now — never what the client claims. */
  plan: Plan;
  /** The plan on the subscription record, which may be lapsed. */
  subscribedPlan: Plan;
  /** False when the paid subscription is expired, paused or ended. */
  active: boolean;
  period: BillingPeriod;
  analysesLimit: number;
  analysesUsed: number;
  analysesRemaining: number;
  creditsGranted: number;
  creditsUsed: number;
  creditsRemaining: number;
  bonusCredits: number;
};

/**
 * Resolves what a user may actually do, from the database only.
 *
 * A paid plan whose entitlement is no longer active silently falls back to the
 * Free allowance, so an expired or paused subscription cannot keep spending.
 */
export async function getEntitlements(userId: string, bonusCredits: number): Promise<Entitlements> {
  const subscription = await ensureSubscription(userId);
  const active = entitlementIsActive(subscription);
  const plan: Plan = active ? subscription.plan : 'FREE';

  const period = { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd };
  const usage = await getOrCreateUsage(userId, period);
  const definition = PLANS[plan];
  const creditsGranted = definition.creditsPerMonth + bonusCredits;

  return {
    plan,
    subscribedPlan: subscription.plan,
    active,
    period,
    analysesLimit: definition.analysesPerMonth,
    analysesUsed: usage.analysisCount,
    analysesRemaining: Math.max(0, definition.analysesPerMonth - usage.analysisCount),
    creditsGranted,
    creditsUsed: usage.creditsUsed,
    creditsRemaining: Math.max(0, creditsGranted - usage.creditsUsed),
    bonusCredits,
  };
}

export type ConsumeKind = 'analysis' | 'generation';

/**
 * Atomically reserves quota before an AI call. Runs inside a transaction with a
 * conditional check so two concurrent requests cannot both spend the last
 * credit. The limit comes from the effective plan, never from the request.
 */
export async function consumeQuota(input: {
  userId: string;
  bonusCredits: number;
  kind: ConsumeKind;
  credits: number;
}) {
  const entitlements = await getEntitlements(input.userId, input.bonusCredits);
  const definition = PLANS[entitlements.plan];
  const period = entitlements.period;

  return prisma.$transaction(async (tx) => {
    const usage = await tx.usage.findUniqueOrThrow({
      where: { userId_periodStart: { userId: input.userId, periodStart: period.start } },
    });

    if (input.kind === 'analysis' && usage.analysisCount >= definition.analysesPerMonth) {
      throw new AppError(
        'QUOTA_EXCEEDED',
        `You've used all ${definition.analysesPerMonth} analyses on the ${definition.name} plan this period. Upgrade to keep researching.`,
      );
    }

    if (usage.creditsUsed + input.credits > entitlements.creditsGranted) {
      throw new AppError(
        'QUOTA_EXCEEDED',
        `You've run out of AI credits for this billing period. Upgrade your plan or wait until ${period.end.toLocaleDateString('en-US', { dateStyle: 'medium' })}.`,
      );
    }

    return tx.usage.update({
      where: { id: usage.id },
      data: {
        creditsUsed: { increment: input.credits },
        analysisCount: input.kind === 'analysis' ? { increment: 1 } : undefined,
        generationCount: input.kind === 'generation' ? { increment: 1 } : undefined,
      },
    });
  });
}

/** Refunds reserved quota when the AI call ultimately failed. */
export async function refundQuota(input: {
  userId: string;
  periodStart: Date;
  kind: ConsumeKind;
  credits: number;
}) {
  try {
    await prisma.usage.update({
      where: { userId_periodStart: { userId: input.userId, periodStart: input.periodStart } },
      data: {
        creditsUsed: { decrement: input.credits },
        analysisCount: input.kind === 'analysis' ? { decrement: 1 } : undefined,
        generationCount: input.kind === 'generation' ? { decrement: 1 } : undefined,
      },
    });
  } catch {
    // A failed refund must not mask the original error; usage self-corrects next period.
  }
}
