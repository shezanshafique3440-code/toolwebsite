import 'server-only';
import type { Plan, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { PLANS } from '@/lib/plans';

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
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
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
      usagePeriods: { orderBy: { periodStart: 'desc' }, take: 6 },
      _count: { select: { products: true, analyses: true, reports: true } },
    },
  });
  if (!user) throw new AppError('NOT_FOUND', 'That user does not exist.');
  return user;
}

export type AdminUserUpdate = {
  status?: 'ACTIVE' | 'SUSPENDED';
  plan?: Plan;
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

  if (input.plan) {
    const start = new Date();
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: input.plan,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
      update: { plan: input.plan, status: 'ACTIVE', cancelAtPeriodEnd: false },
    });
  }

  await logger.info({
    event: 'admin.user_updated',
    message: `Admin updated user ${userId}`,
    userId: actorId,
    context: { targetUserId: userId, changes: { ...input, planName: input.plan ? PLANS[input.plan].name : undefined } },
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
