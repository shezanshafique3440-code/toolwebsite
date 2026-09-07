import 'server-only';
import type { Plan, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { PLANS } from '@/lib/plans';
import { applySubscriptionState, revertToFree } from '@/lib/billing/subscription-state';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    newUsers7d,
    newUsers30d,
    totalProducts,
    totalAnalyses,
    analyses7d,
    totalReports,
    aiAggregate,
    aiFailures,
    planCounts,
    recentErrors,
    dailyAnalyses,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE', lastLoginAt: { gte: daysAgo(30) } } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.product.count(),
    prisma.productAnalysis.count(),
    prisma.productAnalysis.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.savedReport.count(),
    prisma.aiRequestLog.aggregate({
      where: { createdAt: { gte: daysAgo(30) } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: { _all: true },
      _avg: { latencyMs: true },
    }),
    prisma.aiRequestLog.count({ where: { success: false, createdAt: { gte: daysAgo(30) } } }),
    prisma.subscription.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.systemLog.count({ where: { level: 'ERROR', createdAt: { gte: daysAgo(7) } } }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "ProductAnalysis"
      WHERE "createdAt" >= ${daysAgo(14)}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  return {
    users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, new7d: newUsers7d, new30d: newUsers30d },
    content: { products: totalProducts, analyses: totalAnalyses, analyses7d, reports: totalReports },
    ai: {
      requests30d: aiAggregate._count._all,
      failures30d: aiFailures,
      costUsd30d: Number((aiAggregate._sum.costUsd ?? 0).toFixed(4)),
      inputTokens30d: aiAggregate._sum.inputTokens ?? 0,
      outputTokens30d: aiAggregate._sum.outputTokens ?? 0,
      averageLatencyMs: Math.round(aiAggregate._avg.latencyMs ?? 0),
    },
    subscriptions: Object.fromEntries(planCounts.map((row) => [row.plan, row._count._all])) as Record<string, number>,
    errors7d: recentErrors,
    analysesByDay: dailyAnalyses.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      count: Number(row.count),
    })),
  };
}

export async function listUsers(input: { q?: string; page: number; pageSize: number }) {
  const where: Prisma.UserWhereInput = input.q
    ? {
        OR: [
          { email: { contains: input.q, mode: 'insensitive' } },
          { name: { contains: input.q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        bonusCredits: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            provider: true,
            providerCustomerId: true,
            providerSubscriptionId: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
        _count: { select: { products: true, analyses: true } },
      },
    }),
  ]);

  return { users, total, page: input.page, pageSize: input.pageSize };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      bonusCredits: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      subscription: true,
      manualGrants: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          plan: true,
          reason: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          grantedBy: { select: { email: true } },
        },
      },
      usagePeriods: { orderBy: { periodStart: 'desc' }, take: 6 },
      _count: { select: { products: true, analyses: true, reports: true } },
    },
  });
  if (!user) throw new AppError('NOT_FOUND', 'That user does not exist.');
  return user;
}

export type AdminUserUpdate = {
  status?: 'ACTIVE' | 'SUSPENDED';
  bonusCredits?: number;
  role?: 'USER' | 'ADMIN';
};

export async function updateUser(actorId: string, userId: string, input: AdminUserUpdate) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) throw new AppError('NOT_FOUND', 'That user does not exist.');

  if (actorId === userId && (input.role === 'USER' || input.status === 'SUSPENDED')) {
    throw new AppError('CONFLICT', 'You cannot remove your own administrator access.');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status: input.status,
      role: input.role,
      bonusCredits: input.bonusCredits,
      // Suspending or changing a role invalidates the user's existing sessions.
      sessionVersion:
        input.status === 'SUSPENDED' || input.role !== undefined ? { increment: 1 } : undefined,
    },
    select: { id: true, status: true, role: true, bonusCredits: true },
  });

  await logger.info({
    event: 'admin.user_updated',
    message: `Admin updated user ${userId}`,
    userId: actorId,
    context: { targetUserId: userId, changes: input },
  });

  return user;
}

export async function listSystemLogs(input: { level?: 'INFO' | 'WARN' | 'ERROR'; page: number; pageSize: number }) {
  const where: Prisma.SystemLogWhereInput = input.level ? { level: input.level } : {};
  const [total, logs] = await Promise.all([
    prisma.systemLog.count({ where }),
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  return { logs, total, page: input.page, pageSize: input.pageSize };
}

export async function listAiRequests(limit = 25) {
  return prisma.aiRequestLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      operation: true,
      provider: true,
      model: true,
      success: true,
      errorCode: true,
      latencyMs: true,
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
      createdAt: true,
      user: { select: { id: true, email: true } },
    },
  });
}


/**
 * Grants a complimentary plan.
 *
 * Deliberately separate from a Paddle subscription: the grant is recorded in
 * `ManualPlanGrant` with who issued it and why, and the resulting subscription
 * is marked `provider: "manual"` so it can never be mistaken for a payment.
 * An administrator cannot fabricate a Paddle transaction through this path.
 */
export async function grantPlan(input: {
  actorId: string;
  userId: string;
  plan: Plan;
  reason: string;
  expiresAt?: Date | null;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, subscription: { select: { provider: true } } },
  });
  if (!target) throw new AppError('NOT_FOUND', 'That user does not exist.');

  if (target.subscription?.provider === 'paddle') {
    throw new AppError(
      'CONFLICT',
      'This account has a paid Paddle subscription. Change it in Paddle rather than overriding it here.',
    );
  }

  const grant = await prisma.manualPlanGrant.create({
    data: {
      userId: input.userId,
      grantedById: input.actorId,
      plan: input.plan,
      reason: input.reason,
      expiresAt: input.expiresAt ?? null,
    },
  });

  const start = new Date();
  const end = input.expiresAt ?? new Date(start.getFullYear() + 10, start.getMonth(), start.getDate());

  await applySubscriptionState(
    {
      userId: input.userId,
      plan: input.plan,
      status: 'ACTIVE',
      provider: 'manual',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
    { reason: `admin_grant:${grant.id}` },
  );

  await logger.warn({
    event: 'admin.plan_granted',
    message: `Complimentary ${PLANS[input.plan].name} granted to ${input.userId}`,
    userId: input.actorId,
    context: {
      grantId: grant.id,
      targetUserId: input.userId,
      plan: input.plan,
      reason: input.reason,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    },
  });

  return grant;
}

/** Revokes a manual grant and returns the account to Free. */
export async function revokeGrant(actorId: string, grantId: string) {
  const grant = await prisma.manualPlanGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new AppError('NOT_FOUND', 'That grant does not exist.');
  if (grant.revokedAt) throw new AppError('CONFLICT', 'That grant has already been revoked.');

  await prisma.manualPlanGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date(), revokedById: actorId },
  });

  await revertToFree(grant.userId, { reason: `admin_grant_revoked:${grantId}` });

  await logger.warn({
    event: 'admin.plan_grant_revoked',
    message: `Complimentary plan revoked for ${grant.userId}`,
    userId: actorId,
    context: { grantId, targetUserId: grant.userId },
  });
}

/** Recent webhook deliveries, for troubleshooting billing in the admin panel. */
export async function listPaymentEvents(limit = 25) {
  return prisma.paymentEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      provider: true,
      eventId: true,
      eventType: true,
      processed: true,
      processedAt: true,
      error: true,
      createdAt: true,
    },
  });
}
