import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { ProductAnalysis } from '@/lib/ai/schemas';
import type { Verdict } from '@/lib/scoring';

/**
 * A report is an immutable snapshot. Re-running an analysis later must not
 * silently change a report the user already saved or exported.
 */
export type ReportSnapshot = {
  version: 1;
  generatedAt: string;
  isDemo: boolean;
  product: {
    id: string;
    name: string;
    url: string | null;
    imageUrl: string | null;
    category: string | null;
    notes: string | null;
  };
  analysis: {
    id: string;
    createdAt: string;
    provider: string;
    model: string;
    overallScore: number;
    verdict: Verdict;
    scores: { demand: number; competition: number; profit: number; viral: number };
    detail: ProductAnalysis;
  };
  competitors: {
    summary: string;
    rows: Array<{
      name: string;
      url: string | null;
      price: number | null;
      positioning: string;
      targetCustomer: string;
      marketingAngle: string;
      offerStructure: string;
      cta: string;
      estimatedPositioning: string;
      strengths: string[];
      weaknesses: string[];
      sellingPoints: string[];
    }>;
  } | null;
  keywords: {
    primaryKeyword: string;
    suggestedTitle: string;
    items: Array<{ keyword: string; group: string; estimatedIntent: string; rationale: string }>;
  } | null;
  marketing: {
    channels: ProductAnalysis['marketingChannels'];
  };
};

export async function buildReportSnapshot(
  userId: string,
  productId: string,
  analysisId?: string,
): Promise<ReportSnapshot> {
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    include: {
      analyses: analysisId
        ? { where: { id: analysisId }, take: 1 }
        : { orderBy: { createdAt: 'desc' }, take: 1 },
      competitorAnalyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { competitors: { orderBy: { createdAt: 'asc' } } },
      },
      keywordResearch: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!product) throw new AppError('NOT_FOUND', 'We could not find that product in your account.');

  const analysis = product.analyses[0];
  if (!analysis) {
    throw new AppError('BAD_REQUEST', 'Analyse this product before creating a report.');
  }

  const detail = analysis.data as unknown as ProductAnalysis;
  const competitorAnalysis = product.competitorAnalyses[0] ?? null;
  const keywordResearch = product.keywordResearch[0] ?? null;
  const keywordData = keywordResearch?.data as
    | { keywords?: Array<{ keyword: string; group: string; estimatedIntent: string; rationale: string }> }
    | undefined;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    isDemo: analysis.isDemo,
    product: {
      id: product.id,
      name: product.name,
      url: product.url,
      imageUrl: product.imageUrl,
      category: product.category,
      notes: product.notes,
    },
    analysis: {
      id: analysis.id,
      createdAt: analysis.createdAt.toISOString(),
      provider: analysis.provider,
      model: analysis.model,
      overallScore: analysis.overallScore,
      verdict: analysis.verdict as Verdict,
      scores: {
        demand: analysis.demandScore,
        competition: analysis.competitionScore,
        profit: analysis.profitScore,
        viral: analysis.viralScore,
      },
      detail,
    },
    competitors: competitorAnalysis
      ? {
          summary: competitorAnalysis.summary,
          rows: competitorAnalysis.competitors.map((row) => ({
            name: row.name,
            url: row.url,
            price: row.price,
            positioning: row.positioning,
            targetCustomer: row.targetCustomer,
            marketingAngle: row.marketingAngle,
            offerStructure: row.offerStructure,
            cta: row.cta,
            estimatedPositioning: row.estimatedPositioning,
            strengths: row.strengths,
            weaknesses: row.weaknesses,
            sellingPoints: row.sellingPoints,
          })),
        }
      : null,
    keywords: keywordResearch
      ? {
          primaryKeyword: keywordResearch.primaryKeyword,
          suggestedTitle: keywordResearch.suggestedTitle,
          items: (keywordData?.keywords ?? []).slice(0, 40),
        }
      : null,
    marketing: { channels: detail.marketingChannels },
  };
}

export async function saveReport(userId: string, productId: string, analysisId?: string, title?: string) {
  const snapshot = await buildReportSnapshot(userId, productId, analysisId);
  return prisma.savedReport.create({
    data: {
      userId,
      productId,
      title: title?.trim() || `${snapshot.product.name} research report`,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      isDemo: snapshot.isDemo,
    },
  });
}

export async function listReports(userId: string) {
  return prisma.savedReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      title: true,
      createdAt: true,
      isDemo: true,
      product: { select: { id: true, name: true, category: true, imageUrl: true } },
    },
  });
}

export async function getReport(userId: string, reportId: string) {
  const report = await prisma.savedReport.findFirst({ where: { id: reportId, userId } });
  if (!report) throw new AppError('NOT_FOUND', 'We could not find that report in your account.');
  return report;
}

export async function deleteReport(userId: string, reportId: string) {
  const result = await prisma.savedReport.deleteMany({ where: { id: reportId, userId } });
  if (result.count === 0) throw new AppError('NOT_FOUND', 'We could not find that report in your account.');
}
