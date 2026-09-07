import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { CurrentUser } from '@/lib/auth/current-user';
import { consumeQuota, refundQuota } from '@/lib/billing/service';
import { generateStructured } from '@/lib/ai';
import { productAnalysisPrompt } from '@/lib/ai/prompts';
import { productAnalysisSchema, type ProductAnalysis } from '@/lib/ai/schemas';
import { computeOverallScore, scoreBand } from '@/lib/scoring';
import { slugify } from '@/lib/utils';
import type { z } from 'zod';
import type { analyzeProductSchema, listProductsSchema } from '@/lib/validation/tools';

type AnalyzeInput = z.infer<typeof analyzeProductSchema>;
type ListInput = z.infer<typeof listProductsSchema>;

/** Loads a product, scoped to its owner. Never fetch by id alone. */
export async function getOwnedProduct(userId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, userId } });
  if (!product) throw new AppError('NOT_FOUND', 'We could not find that product in your account.');
  return product;
}

export async function analyzeProduct(user: CurrentUser, input: AnalyzeInput) {
  const usage = await consumeQuota({
    userId: user.id,
    bonusCredits: user.entitlements.bonusCredits,
    kind: 'analysis',
    credits: 1,
  });

  try {
    const product = input.productId
      ? await prisma.product.update({
          where: { id: (await getOwnedProduct(user.id, input.productId)).id },
          data: {
            name: input.name,
            url: input.url || null,
            imageUrl: input.imageUrl || null,
            category: input.category || null,
            notes: input.notes || null,
          },
        })
      : await prisma.product.create({
          data: {
            userId: user.id,
            name: input.name,
            slug: slugify(input.name),
            url: input.url || null,
            imageUrl: input.imageUrl || null,
            category: input.category || null,
            notes: input.notes || null,
          },
        });

    const result = await generateStructured({
      operation: 'product_analysis',
      schema: productAnalysisSchema,
      userId: user.id,
      maxTokens: 8000,
      prompt: productAnalysisPrompt({
        name: input.name,
        url: input.url,
        category: input.category,
        notes: input.notes,
      }),
      context: { productName: input.name, category: input.category },
    });

    const analysis = normaliseAnalysis(result.data);

    const record = await prisma.productAnalysis.create({
      data: {
        userId: user.id,
        productId: product.id,
        overallScore: analysis.overallScore,
        demandScore: analysis.scores.demand,
        competitionScore: analysis.scores.competition,
        profitScore: analysis.scores.profit,
        viralScore: analysis.scores.viral,
        verdict: analysis.verdict,
        trendDirection: analysis.trend.direction,
        sourcingPriceMin: analysis.pricing.sourcingPriceMin,
        sourcingPriceMax: analysis.pricing.sourcingPriceMax,
        sellingPriceMin: analysis.pricing.recommendedPriceMin,
        sellingPriceMax: analysis.pricing.recommendedPriceMax,
        marginPercent: analysis.pricing.estimatedMarginPercent,
        data: analysis as unknown as Prisma.InputJsonValue,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        isDemo: result.isDemo,
      },
    });

    // Keep the product's category in step with what the analysis concluded.
    if (!product.category && analysis.category) {
      await prisma.product.update({ where: { id: product.id }, data: { category: analysis.category } });
    }

    return { product, analysis: record, isDemo: result.isDemo };
  } catch (error) {
    await refundQuota({
      userId: user.id,
      periodStart: usage.periodStart,
      kind: 'analysis',
      credits: 1,
    });
    throw error;
  }
}

/**
 * The overall score is always recomputed from the sub-scores, and the verdict is
 * derived from that score. A model cannot report a headline number that
 * contradicts its own breakdown.
 */
function normaliseAnalysis(analysis: ProductAnalysis) {
  const overallScore = computeOverallScore({
    demandScore: analysis.scores.demand,
    competitionScore: analysis.scores.competition,
    profitScore: analysis.scores.profit,
    viralScore: analysis.scores.viral,
  });
  return { ...analysis, overallScore, verdict: scoreBand(overallScore) };
}

export type StoredProductAnalysis = ProductAnalysis & { overallScore: number };

export async function listProducts(userId: string, input: ListInput) {
  const where: Prisma.ProductWhereInput = { userId, archivedAt: null };

  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: 'insensitive' } },
      { category: { contains: input.q, mode: 'insensitive' } },
    ];
  }

  if (input.filter === 'unanalyzed') {
    where.analyses = { none: {} };
  } else if (input.filter !== 'all') {
    where.analyses = { some: { verdict: input.filter } };
  }

  const skip = (input.page - 1) * input.pageSize;

  // Score-based ordering needs the latest analysis per product, which Prisma
  // cannot order by directly — fetch the page-relevant set and sort in memory.
  const sortsByScore = input.sort === 'score_desc' || input.sort === 'score_asc';

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    input.sort === 'oldest'
      ? { createdAt: 'asc' }
      : input.sort === 'name_asc'
        ? { name: 'asc' }
        : { createdAt: 'desc' };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: sortsByScore ? undefined : skip,
      take: sortsByScore ? 500 : input.pageSize,
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            overallScore: true,
            demandScore: true,
            competitionScore: true,
            profitScore: true,
            viralScore: true,
            verdict: true,
            isDemo: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  let items = rows;
  if (sortsByScore) {
    items = [...rows].sort((a, b) => {
      const scoreA = a.analyses[0]?.overallScore ?? -1;
      const scoreB = b.analyses[0]?.overallScore ?? -1;
      return input.sort === 'score_desc' ? scoreB - scoreA : scoreA - scoreB;
    });
    items = items.slice(skip, skip + input.pageSize);
  }

  return {
    items: items.map((product) => ({
      id: product.id,
      name: product.name,
      url: product.url,
      imageUrl: product.imageUrl,
      category: product.category,
      isDemo: product.isDemo,
      createdAt: product.createdAt,
      latestAnalysis: product.analyses[0] ?? null,
    })),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getProductDetail(userId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    include: {
      analyses: { orderBy: { createdAt: 'desc' }, take: 10 },
      competitorAnalyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { competitors: { orderBy: { createdAt: 'asc' } } },
      },
      keywordResearch: { orderBy: { createdAt: 'desc' }, take: 1 },
      listings: { orderBy: { createdAt: 'desc' }, take: 1 },
      ads: { orderBy: { createdAt: 'desc' }, take: 4 },
      audiences: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!product) throw new AppError('NOT_FOUND', 'We could not find that product in your account.');
  return product;
}

export async function deleteProduct(userId: string, productId: string) {
  const result = await prisma.product.deleteMany({ where: { id: productId, userId } });
  if (result.count === 0) throw new AppError('NOT_FOUND', 'We could not find that product in your account.');
}

export async function getDashboardSummary(userId: string) {
  const [productCount, analysisCount, reportCount, aggregate, recent, verdictCounts] = await Promise.all([
    prisma.product.count({ where: { userId, archivedAt: null } }),
    prisma.productAnalysis.count({ where: { userId } }),
    prisma.savedReport.count({ where: { userId } }),
    prisma.productAnalysis.aggregate({ where: { userId }, _avg: { overallScore: true } }),
    prisma.productAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        overallScore: true,
        verdict: true,
        createdAt: true,
        isDemo: true,
        product: { select: { id: true, name: true, imageUrl: true, category: true } },
      },
    }),
    prisma.productAnalysis.groupBy({ by: ['verdict'], where: { userId }, _count: { _all: true } }),
  ]);

  return {
    productCount,
    analysisCount,
    reportCount,
    averageScore: aggregate._avg.overallScore ? Math.round(aggregate._avg.overallScore) : null,
    recent,
    verdictCounts: Object.fromEntries(verdictCounts.map((row) => [row.verdict, row._count._all])) as Record<
      string,
      number
    >,
  };
}
