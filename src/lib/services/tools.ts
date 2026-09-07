import 'server-only';
import type { AdPlatform, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { CurrentUser } from '@/lib/auth/current-user';
import { consumeQuota, refundQuota } from '@/lib/billing/service';
import { FEATURE_LABELS, PLANS, planFeatureAllowed, type PlanFeature } from '@/lib/plans';
import { generateStructured } from '@/lib/ai';
import { adPrompt, audiencePrompt, competitorAnalysisPrompt, keywordPrompt, listingPrompt } from '@/lib/ai/prompts';
import {
  adGenerationSchema,
  audienceAnalysisSchema,
  competitorAnalysisSchema,
  keywordAnalysisSchema,
  listingGenerationSchema,
} from '@/lib/ai/schemas';
import type {
  adGenerateSchema,
  audienceGenerateSchema,
  competitorAnalyzeSchema,
  keywordGenerateSchema,
  listingGenerateSchema,
} from '@/lib/validation/tools';
import { getOwnedProduct } from '@/lib/services/products';

/** Server-side feature gate. The UI hides locked tools; this is what enforces it. */
export function assertFeature(user: CurrentUser, feature: PlanFeature) {
  if (!planFeatureAllowed(user.plan, feature)) {
    throw new AppError(
      'FORBIDDEN',
      `${FEATURE_LABELS[feature]} is available on the Pro and Business plans. You are currently on ${PLANS[user.plan].name}.`,
    );
  }
}

async function resolveProductId(userId: string, productId?: string) {
  if (!productId) return null;
  const product = await getOwnedProduct(userId, productId);
  return product.id;
}

/** Wraps a generation with quota reservation and refund-on-failure. */
async function withCredits<T>(user: CurrentUser, credits: number, run: () => Promise<T>): Promise<T> {
  const usage = await consumeQuota({
    userId: user.id,
    bonusCredits: user.entitlements.bonusCredits,
    kind: 'generation',
    credits,
  });
  try {
    return await run();
  } catch (error) {
    await refundQuota({ userId: user.id, periodStart: usage.periodStart, kind: 'generation', credits });
    throw error;
  }
}

export async function analyzeCompetitors(user: CurrentUser, input: z.infer<typeof competitorAnalyzeSchema>) {
  assertFeature(user, 'competitorAnalysis');
  const productId = await resolveProductId(user.id, input.productId);

  return withCredits(user, 2, async () => {
    const result = await generateStructured({
      operation: 'competitor_analysis',
      schema: competitorAnalysisSchema,
      userId: user.id,
      maxTokens: 8000,
      prompt: competitorAnalysisPrompt({
        productName: input.productName,
        competitorUrls: input.competitorUrls,
        notes: input.notes,
      }),
      context: {
        productName: input.productName,
        competitorUrls: input.competitorUrls,
      },
    });

    const { competitors, ...rest } = result.data;

    const record = await prisma.competitorAnalysis.create({
      data: {
        userId: user.id,
        productId,
        summary: rest.summary,
        data: result.data as unknown as Prisma.InputJsonValue,
        provider: result.provider,
        model: result.model,
        isDemo: result.isDemo,
        competitors: {
          create: competitors.map((competitor) => ({
            userId: user.id,
            name: competitor.name,
            url: competitor.url || null,
            price: competitor.estimatedPrice,
            currency: competitor.currency,
            positioning: competitor.positioning,
            sellingPoints: competitor.sellingPoints,
            targetCustomer: competitor.targetCustomer,
            strengths: competitor.strengths,
            weaknesses: competitor.weaknesses,
            marketingAngle: competitor.marketingAngle,
            offerStructure: competitor.offerStructure,
            cta: competitor.cta,
            estimatedPositioning: competitor.estimatedPositioning,
          })),
        },
      },
      include: { competitors: { orderBy: { createdAt: 'asc' } } },
    });

    return { record, result: result.data, isDemo: result.isDemo };
  });
}

export async function generateKeywords(user: CurrentUser, input: z.infer<typeof keywordGenerateSchema>) {
  assertFeature(user, 'keywords');
  const productId = await resolveProductId(user.id, input.productId);

  return withCredits(user, 1, async () => {
    const result = await generateStructured({
      operation: 'keyword_research',
      schema: keywordAnalysisSchema,
      userId: user.id,
      maxTokens: 6000,
      prompt: keywordPrompt({
        productName: input.productName,
        category: input.category,
        notes: input.notes,
      }),
      context: { productName: input.productName },
    });

    const record = await prisma.keywordResearch.create({
      data: {
        userId: user.id,
        productId,
        primaryKeyword: result.data.primaryKeyword,
        suggestedTitle: result.data.suggestedProductTitle,
        keywordCount: result.data.keywords.length,
        data: result.data as unknown as Prisma.InputJsonValue,
        provider: result.provider,
        model: result.model,
        isDemo: result.isDemo,
      },
    });

    return { record, result: result.data, isDemo: result.isDemo };
  });
}

export async function generateListing(user: CurrentUser, input: z.infer<typeof listingGenerateSchema>) {
  assertFeature(user, 'listing');
  const productId = await resolveProductId(user.id, input.productId);

  return withCredits(user, 2, async () => {
    const result = await generateStructured({
      operation: 'listing_generation',
      schema: listingGenerationSchema,
      userId: user.id,
      maxTokens: 8000,
      prompt: listingPrompt({
        productName: input.productName,
        category: input.category,
        notes: input.notes,
        tone: input.tone,
        audience: input.audience,
      }),
      context: { productName: input.productName },
    });

    const record = await prisma.generatedListing.create({
      data: {
        userId: user.id,
        productId,
        title: result.data.title,
        data: result.data as unknown as Prisma.InputJsonValue,
        provider: result.provider,
        model: result.model,
        isDemo: result.isDemo,
      },
    });

    return { record, result: result.data, isDemo: result.isDemo };
  });
}

export async function generateAds(user: CurrentUser, input: z.infer<typeof adGenerateSchema>) {
  assertFeature(user, 'ads');
  const productId = await resolveProductId(user.id, input.productId);

  return withCredits(user, 2, async () => {
    const result = await generateStructured({
      operation: 'ad_generation',
      schema: adGenerationSchema,
      userId: user.id,
      maxTokens: 8000,
      prompt: adPrompt({
        productName: input.productName,
        platforms: input.platforms,
        audience: input.audience,
        angle: input.angle,
        notes: input.notes,
      }),
      context: { productName: input.productName, platforms: input.platforms },
    });

    // One row per platform keeps ads queryable and independently deletable.
    const records = await prisma.$transaction(
      result.data.platforms.map((platform) =>
        prisma.generatedAd.create({
          data: {
            userId: user.id,
            productId,
            platform: platform.platform as AdPlatform,
            data: platform as unknown as Prisma.InputJsonValue,
            provider: result.provider,
            model: result.model,
            isDemo: result.isDemo,
          },
        }),
      ),
    );

    return { records, result: result.data, isDemo: result.isDemo };
  });
}

export async function generateAudience(user: CurrentUser, input: z.infer<typeof audienceGenerateSchema>) {
  assertFeature(user, 'audience');
  const productId = await resolveProductId(user.id, input.productId);

  return withCredits(user, 1, async () => {
    const result = await generateStructured({
      operation: 'audience_analysis',
      schema: audienceAnalysisSchema,
      userId: user.id,
      maxTokens: 6000,
      prompt: audiencePrompt({
        productName: input.productName,
        category: input.category,
        notes: input.notes,
      }),
      context: { productName: input.productName },
    });

    const record = await prisma.audienceAnalysis.create({
      data: {
        userId: user.id,
        productId,
        personaName: result.data.persona.name,
        data: result.data as unknown as Prisma.InputJsonValue,
        provider: result.provider,
        model: result.model,
        isDemo: result.isDemo,
      },
    });

    return { record, result: result.data, isDemo: result.isDemo };
  });
}
