/**
 * Seeds a demo workspace so the application looks populated during development.
 *
 * Everything created here is flagged `isDemo`, and the UI labels it as sample
 * data. Content is produced by the same DemoProvider the app falls back to when
 * no AI key is configured — there are no hand-written fake "statistics".
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, type AdPlatform, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DemoProvider } from '@/lib/ai/providers/demo';
import {
  adGenerationSchema,
  audienceAnalysisSchema,
  competitorAnalysisSchema,
  keywordAnalysisSchema,
  listingGenerationSchema,
  productAnalysisSchema,
} from '@/lib/ai/schemas';
import { computeOverallScore, scoreBand } from '@/lib/scoring';
import { applySubscriptionState } from '@/lib/billing/subscription-state';
import { slugify } from '@/lib/utils';

const prisma = new PrismaClient();
const provider = new DemoProvider();

const DEMO_PRODUCTS = [
  {
    name: 'Portable Blender',
    category: 'Kitchen appliances',
    url: 'https://example.com/products/portable-blender',
    notes: 'USB-C rechargeable 380ml personal blender with a six-blade head. Sourced from a generic supplier.',
  },
  {
    name: 'Mini Projector',
    category: 'Consumer electronics',
    url: 'https://example.com/products/mini-projector',
    notes: '1080p-supported LED mini projector with HDMI and screen mirroring, aimed at bedroom and camping use.',
  },
  {
    name: 'LED Car Vacuum',
    category: 'Car accessories',
    url: 'https://example.com/products/led-car-vacuum',
    notes: 'Handheld 120W car vacuum with a built-in LED light and three nozzle attachments.',
  },
  {
    name: 'Smart Water Bottle',
    category: 'Health & wellness',
    url: 'https://example.com/products/smart-water-bottle',
    notes: 'Insulated bottle with an LED hydration reminder in the lid and a companion app.',
  },
  {
    name: 'Pet Grooming Vacuum',
    category: 'Pet supplies',
    url: 'https://example.com/products/pet-grooming-vacuum',
    notes: 'Low-noise grooming kit that vacuums loose fur while brushing. Five attachments, 2L canister.',
  },
];

async function generate<T>(
  operation: Parameters<DemoProvider['complete']>[0]['operation'],
  schema: { parse: (value: unknown) => T },
  context: Record<string, unknown>,
) {
  const response = await provider.complete({
    operation,
    system: 'seed',
    prompt: 'seed',
    schema: schema as never,
    schemaName: operation,
    maxTokens: 4000,
    context,
  });
  return schema.parse(response.output);
}

function monthWindow() {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO' | 'BUSINESS';
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, role: input.role, passwordHash, emailVerifiedAt: new Date() },
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });

  // Seeded plans go through the same single writer the webhook uses, so the
  // denormalised User.plan mirror cannot drift. They are marked as manual
  // grants: no payment was taken, and nothing should read them as revenue.
  const { start, end } = monthWindow();
  await applySubscriptionState(
    {
      userId: user.id,
      plan: input.plan,
      status: 'ACTIVE',
      provider: input.plan === 'FREE' ? 'internal' : 'manual',
      currentPeriodStart: start,
      currentPeriodEnd: end,
    },
    { reason: 'seed' },
  );

  return user;
}

async function main() {
  console.info('Seeding ProductPilot AI demo data…');

  const demoUser = await upsertUser({
    email: 'demo@productpilot.ai',
    name: 'Demo Seller',
    password: 'demo-password-1',
    role: 'USER',
    plan: 'PRO',
  });

  const adminUser = await upsertUser({
    email: 'admin@productpilot.ai',
    name: 'Admin',
    password: 'admin-password-1',
    role: 'ADMIN',
    plan: 'BUSINESS',
  });

  // Re-seeding is idempotent: clear the previous demo rows for this user first.
  await prisma.product.deleteMany({ where: { userId: demoUser.id, isDemo: true } });

  const { start, end } = monthWindow();

  for (const [index, seed] of DEMO_PRODUCTS.entries()) {
    const product = await prisma.product.create({
      data: {
        userId: demoUser.id,
        name: seed.name,
        slug: slugify(seed.name),
        url: seed.url,
        category: seed.category,
        notes: seed.notes,
        isDemo: true,
        createdAt: new Date(Date.now() - (DEMO_PRODUCTS.length - index) * 36 * 60 * 60 * 1000),
      },
    });

    const analysis = await generate('product_analysis', productAnalysisSchema, {
      productName: seed.name,
      category: seed.category,
    });

    const overallScore = computeOverallScore({
      demandScore: analysis.scores.demand,
      competitionScore: analysis.scores.competition,
      profitScore: analysis.scores.profit,
      viralScore: analysis.scores.viral,
    });
    const verdict = scoreBand(overallScore);
    const stored = { ...analysis, overallScore, verdict };

    const analysisRecord = await prisma.productAnalysis.create({
      data: {
        userId: demoUser.id,
        productId: product.id,
        overallScore,
        demandScore: analysis.scores.demand,
        competitionScore: analysis.scores.competition,
        profitScore: analysis.scores.profit,
        viralScore: analysis.scores.viral,
        verdict,
        trendDirection: analysis.trend.direction,
        sourcingPriceMin: analysis.pricing.sourcingPriceMin,
        sourcingPriceMax: analysis.pricing.sourcingPriceMax,
        sellingPriceMin: analysis.pricing.recommendedPriceMin,
        sellingPriceMax: analysis.pricing.recommendedPriceMax,
        marginPercent: analysis.pricing.estimatedMarginPercent,
        data: stored as unknown as Prisma.InputJsonValue,
        provider: provider.id,
        model: provider.model,
        latencyMs: 260,
        isDemo: true,
        createdAt: product.createdAt,
      },
    });

    // The first two products get the full toolkit so every page has content.
    if (index < 2) {
      const competitors = await generate('competitor_analysis', competitorAnalysisSchema, {
        productName: seed.name,
        competitorUrls: [
          'https://competitor-one.example.com/product',
          'https://competitor-two.example.com/store',
          'https://competitor-three.example.com/shop',
        ],
      });

      await prisma.competitorAnalysis.create({
        data: {
          userId: demoUser.id,
          productId: product.id,
          summary: competitors.summary,
          data: competitors as unknown as Prisma.InputJsonValue,
          provider: provider.id,
          model: provider.model,
          isDemo: true,
          competitors: {
            create: competitors.competitors.map((competitor) => ({
              userId: demoUser.id,
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
      });

      const keywords = await generate('keyword_research', keywordAnalysisSchema, { productName: seed.name });
      await prisma.keywordResearch.create({
        data: {
          userId: demoUser.id,
          productId: product.id,
          primaryKeyword: keywords.primaryKeyword,
          suggestedTitle: keywords.suggestedProductTitle,
          keywordCount: keywords.keywords.length,
          data: keywords as unknown as Prisma.InputJsonValue,
          provider: provider.id,
          model: provider.model,
          isDemo: true,
        },
      });

      const listing = await generate('listing_generation', listingGenerationSchema, { productName: seed.name });
      await prisma.generatedListing.create({
        data: {
          userId: demoUser.id,
          productId: product.id,
          title: listing.title,
          data: listing as unknown as Prisma.InputJsonValue,
          provider: provider.id,
          model: provider.model,
          isDemo: true,
        },
      });

      const ads = await generate('ad_generation', adGenerationSchema, {
        productName: seed.name,
        platforms: ['FACEBOOK', 'TIKTOK'],
      });
      for (const platform of ads.platforms) {
        await prisma.generatedAd.create({
          data: {
            userId: demoUser.id,
            productId: product.id,
            platform: platform.platform as AdPlatform,
            data: platform as unknown as Prisma.InputJsonValue,
            provider: provider.id,
            model: provider.model,
            isDemo: true,
          },
        });
      }

      const audience = await generate('audience_analysis', audienceAnalysisSchema, { productName: seed.name });
      await prisma.audienceAnalysis.create({
        data: {
          userId: demoUser.id,
          productId: product.id,
          personaName: audience.persona.name,
          data: audience as unknown as Prisma.InputJsonValue,
          provider: provider.id,
          model: provider.model,
          isDemo: true,
        },
      });

      const { buildReportSnapshot } = await import('@/lib/services/reports');
      const snapshot = await buildReportSnapshot(demoUser.id, product.id, analysisRecord.id);
      await prisma.savedReport.create({
        data: {
          userId: demoUser.id,
          productId: product.id,
          title: `${seed.name} research report`,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          isDemo: true,
        },
      });
    }

    await prisma.aiRequestLog.create({
      data: {
        userId: demoUser.id,
        operation: 'product_analysis',
        provider: provider.id,
        model: provider.model,
        success: true,
        latencyMs: 260,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        createdAt: product.createdAt,
      },
    });
  }

  await prisma.usage.upsert({
    where: { userId_periodStart: { userId: demoUser.id, periodStart: start } },
    update: { analysisCount: DEMO_PRODUCTS.length, generationCount: 10, creditsUsed: DEMO_PRODUCTS.length + 16 },
    create: {
      userId: demoUser.id,
      periodStart: start,
      periodEnd: end,
      analysisCount: DEMO_PRODUCTS.length,
      generationCount: 10,
      creditsUsed: DEMO_PRODUCTS.length + 16,
    },
  });

  await prisma.systemLog.create({
    data: { level: 'INFO', event: 'seed.completed', message: 'Demo data seeded', userId: adminUser.id },
  });

  console.info(`Seeded ${DEMO_PRODUCTS.length} demo products.`);
  console.info('  Seller account: demo@productpilot.ai / demo-password-1');
  console.info('  Admin account:  admin@productpilot.ai / admin-password-1');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
