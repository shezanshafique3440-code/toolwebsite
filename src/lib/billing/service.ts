import 'server-only';
import type { Plan, Subscription, Usage } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PLANS } from '@/lib/plans';

export type BillingPeriod = { start: Date; end: Date };

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/**
 * Returns the subscription for a user, creating the default Free subscription on
 * first access and rolling the period forward when it has lapsed. Rolling the
 * period forward is what resets monthly usage: `Usage` rows are keyed by
 * `periodStart`, so a new period starts from a fresh counter.
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
        currentPeriodStart: start,
        currentPeriodEnd: addMonths(start, 1),
      },
    });
  }

  if (existing.currentPeriodEnd.getTime() > Date.now()) return existing;

  // Period lapsed. For the internal (non-payment) provider we simply renew.
  const months = existing.interval === 'YEARLY' ? 12 : 1;
  let start = existing.currentPeriodEnd;
  let end = addMonths(start, months);
  const now = Date.now();
  // Catch up if the account was dormant for several periods.
  while (end.getTime() <= now) {
    start = end;
    end = addMonths(start, months);
  }

  const downgrade = existing.cancelAtPeriodEnd && existing.plan !== 'FREE';

  return prisma.subscription.update({
    where: { userId },
    data: {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      plan: downgrade ? 'FREE' : existing.plan,
      status: downgrade ? 'CANCELED' : existing.status,
      cancelAtPeriodEnd: downgrade ? false : existing.cancelAtPeriodEnd,
    },
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
  plan: Plan;
  period: BillingPeriod;
  analysesLimit: number;
  analysesUsed: number;
  analysesRemaining: number;
  creditsGranted: number;
  creditsUsed: number;
  creditsRemaining: number;
  bonusCredits: number;
};

export async function getEntitlements(userId: string, bonusCredits: number): Promise<Entitlements> {
  const subscription = await ensureSubscription(userId);
  const period = { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd };
  const usage = await getOrCreateUsage(userId, period);
  const definition = PLANS[subscription.plan];
  const creditsGranted = definition.creditsPerMonth + bonusCredits;

  return {
    plan: subscription.plan,
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
 * conditional update so two concurrent requests cannot both spend the last credit.
 */
export async function consumeQuota(input: {
  userId: string;
  bonusCredits: number;
  kind: ConsumeKind;
  credits: number;
}) {
  const subscription = await ensureSubscription(input.userId);
  const period = { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd };
  await getOrCreateUsage(input.userId, period);
  const definition = PLANS[subscription.plan];
  const creditsGranted = definition.creditsPerMonth + input.bonusCredits;

  return prisma.$transaction(async (tx) => {
    const usage = await tx.usage.findUniqueOrThrow({
      where: { userId_periodStart: { userId: input.userId, periodStart: period.start } },
    });

    if (input.kind === 'analysis' && usage.analysisCount >= definition.analysesPerMonth) {
      throw new AppError(
        'QUOTA_EXCEEDED',
        `You've used all ${definition.analysesPerMonth} analyses on the ${definition.name} plan this month. Upgrade to keep researching.`,
      );
    }

    if (usage.creditsUsed + input.credits > creditsGranted) {
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

/**
 * Billing provider abstraction. `InternalBillingProvider` records plan changes
 * directly; a Stripe implementation can be dropped in behind the same interface
 * without touching callers.
 */
export interface BillingProvider {
  readonly id: string;
  readonly supportsCheckout: boolean;
  createCheckout(input: {
    userId: string;
    plan: Plan;
    interval: 'MONTHLY' | 'YEARLY';
  }): Promise<{ kind: 'redirect'; url: string } | { kind: 'applied' }>;
  cancel(input: { userId: string }): Promise<void>;
}

export class InternalBillingProvider implements BillingProvider {
  readonly id = 'internal';
  readonly supportsCheckout = false;

  async createCheckout(input: { userId: string; plan: Plan; interval: 'MONTHLY' | 'YEARLY' }) {
    const subscription = await ensureSubscription(input.userId);

    // The billing window is deliberately preserved across a plan change.
    // Restarting it would reset the usage counter, letting anyone refresh their
    // monthly quota by switching plans back and forth. A new window only opens
    // when the current one has already lapsed.
    const lapsed = subscription.currentPeriodEnd.getTime() <= Date.now();
    const start = lapsed ? new Date() : subscription.currentPeriodStart;
    const end = lapsed ? addMonths(start, input.interval === 'YEARLY' ? 12 : 1) : subscription.currentPeriodEnd;

    await prisma.subscription.update({
      where: { userId: input.userId },
      data: {
        plan: input.plan,
        interval: input.interval,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        provider: this.id,
      },
    });
    return { kind: 'applied' as const };
  }

  async cancel(input: { userId: string }) {
    await prisma.subscription.update({
      where: { userId: input.userId },
      data: { cancelAtPeriodEnd: true },
    });
  }
}

/**
 * Resolves the active billing provider. Stripe keys are read server-side only;
 * until a Stripe implementation is added the internal provider is used and the
 * UI states plainly that payments are not yet live.
 */
export function getBillingProvider(): BillingProvider {
  return new InternalBillingProvider();
}

export function paymentsConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
