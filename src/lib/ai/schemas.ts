import { z } from 'zod';

/**
 * Response contracts for every AI operation.
 *
 * These schemas are the single source of truth: they are converted to JSON
 * Schema and handed to the model as an output constraint, *and* used to validate
 * whatever comes back before it reaches the database or the UI. Fields are
 * deliberately non-optional so both providers can run in strict schema mode.
 */

const score = z.number().int().min(0).max(100);
const shortText = z.string().min(1).max(400);
const paragraph = z.string().min(1).max(2000);
const money = z.number().min(0).max(1_000_000);

export const VerdictEnum = z.enum(['STRONG', 'POTENTIAL', 'RISKY', 'AVOID']);
export const TrendDirectionEnum = z.enum(['GROWING', 'STABLE', 'DECLINING', 'SEASONAL', 'UNKNOWN']);
export const SaturationEnum = z.enum(['LOW', 'MODERATE', 'HIGH', 'SATURATED']);
export const DependencyEnum = z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH']);
export const PriorityEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const ConfidenceEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const AdPlatformEnum = z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE']);

export const productAnalysisSchema = z.object({
  productName: shortText.describe('Cleaned-up product name.'),
  category: shortText.describe('Primary e-commerce category, e.g. "Kitchen appliances".'),
  overview: paragraph.describe('2-4 sentences describing what the product is and how it is sold.'),
  targetAudience: paragraph.describe('Who realistically buys this product.'),
  painPoint: paragraph.describe('The specific customer problem the product solves.'),
  scores: z.object({
    demand: score.describe('Apparent buyer interest, 0-100.'),
    competition: score.describe('Favourability of the competitive landscape, 0-100 (higher = less crowded).'),
    profit: score.describe('Margin headroom, 0-100.'),
    viral: score.describe('Short-form video and social sharing potential, 0-100.'),
  }),
  scoreReasoning: z.object({
    demand: shortText,
    competition: shortText,
    profit: shortText,
    viral: shortText,
  }),
  verdict: VerdictEnum,
  verdictReasoning: paragraph.describe('Why this verdict, referencing the sub-scores.'),
  pricing: z.object({
    currency: z.string().min(3).max(3).describe('ISO currency code, use USD.'),
    sourcingPriceMin: money,
    sourcingPriceMax: money,
    recommendedPriceMin: money,
    recommendedPriceMax: money,
    estimatedMarginPercent: z.number().min(-100).max(100),
    rationale: paragraph,
  }),
  marketSaturation: z.object({ level: SaturationEnum, explanation: paragraph }),
  seasonality: z.object({
    dependency: DependencyEnum,
    peakPeriods: z.array(shortText).max(6),
    explanation: paragraph,
  }),
  trend: z.object({
    direction: TrendDirectionEnum,
    score,
    explanation: paragraph.describe('Reasoning only — never claim access to live trend data.'),
  }),
  swot: z.object({
    strengths: z.array(shortText).min(2).max(8),
    weaknesses: z.array(shortText).min(2).max(8),
    opportunities: z.array(shortText).min(2).max(8),
    risks: z.array(shortText).min(2).max(8),
  }),
  marketingChannels: z
    .array(
      z.object({
        channel: shortText,
        priority: PriorityEnum,
        why: shortText,
        firstStep: shortText,
      }),
    )
    .min(2)
    .max(6),
  audienceSnapshot: z.object({
    ageRange: shortText,
    gender: shortText,
    interests: z.array(shortText).min(2).max(10),
  }),
  confidence: ConfidenceEnum,
  assumptions: z.array(shortText).min(1).max(6).describe('What the model had to assume.'),
});

export type ProductAnalysis = z.infer<typeof productAnalysisSchema>;

export const competitorSchema = z.object({
  name: shortText,
  url: z.string().max(2048).describe('Competitor URL if one was supplied, otherwise an empty string.'),
  estimatedPrice: money,
  currency: z.string().min(3).max(3),
  positioning: shortText,
  sellingPoints: z.array(shortText).min(2).max(8),
  targetCustomer: shortText,
  strengths: z.array(shortText).min(1).max(6),
  weaknesses: z.array(shortText).min(1).max(6),
  marketingAngle: shortText,
  offerStructure: shortText,
  cta: shortText,
  estimatedPositioning: shortText.describe('e.g. "Premium", "Value", "Mid-market specialist".'),
});

export const competitorAnalysisSchema = z.object({
  summary: paragraph,
  competitors: z.array(competitorSchema).min(1).max(8),
  comparison: z.object({
    priceRangeMin: money,
    priceRangeMax: money,
    commonAngles: z.array(shortText).min(1).max(6),
    marketGaps: z.array(shortText).min(1).max(6),
    differentiationOpportunities: z.array(shortText).min(1).max(6),
  }),
  recommendedPositioning: paragraph,
  confidence: ConfidenceEnum,
});

export type CompetitorAnalysisResult = z.infer<typeof competitorAnalysisSchema>;

export const KeywordGroupEnum = z.enum([
  'PRIMARY',
  'SECONDARY',
  'LONG_TAIL',
  'BUYER_INTENT',
  'PROBLEM',
  'QUESTION',
]);

export const keywordAnalysisSchema = z.object({
  primaryKeyword: shortText,
  suggestedProductTitle: shortText,
  keywords: z
    .array(
      z.object({
        keyword: shortText,
        group: KeywordGroupEnum,
        rationale: shortText,
        estimatedIntent: z.enum(['INFORMATIONAL', 'COMMERCIAL', 'TRANSACTIONAL']),
      }),
    )
    .min(12)
    .max(60),
  notes: paragraph.describe('How to use these keywords; no invented search-volume figures.'),
});

export type KeywordAnalysis = z.infer<typeof keywordAnalysisSchema>;

export const listingGenerationSchema = z.object({
  title: shortText,
  shortDescription: paragraph,
  longDescription: z.string().min(200).max(6000),
  bulletPoints: z.array(shortText).min(4).max(8),
  benefits: z.array(shortText).min(3).max(8),
  features: z.array(shortText).min(3).max(10),
  faq: z.array(z.object({ question: shortText, answer: paragraph })).min(3).max(8),
  metaTitle: z.string().min(10).max(70),
  metaDescription: z.string().min(50).max(180),
  imageAltTexts: z.array(shortText).min(3).max(8),
});

export type ListingGeneration = z.infer<typeof listingGenerationSchema>;

export const adVariationSchema = z.object({
  angle: shortText.describe('The marketing angle, e.g. "Problem/solution".'),
  hook: shortText,
  primaryText: paragraph,
  headline: z.string().min(5).max(120),
  cta: z.string().min(2).max(60),
  shortVersion: z.string().min(10).max(300),
  longVersion: z.string().min(100).max(1800),
});

export const adGenerationSchema = z.object({
  platforms: z
    .array(
      z.object({
        platform: AdPlatformEnum,
        guidance: shortText.describe('One line on how this platform differs for this product.'),
        variations: z.array(adVariationSchema).min(2).max(4),
      }),
    )
    .min(1)
    .max(4),
});

export type AdGeneration = z.infer<typeof adGenerationSchema>;

export const audienceAnalysisSchema = z.object({
  ageRange: shortText,
  gender: shortText,
  location: shortText,
  interests: z.array(shortText).min(3).max(10),
  problems: z.array(shortText).min(3).max(8),
  buyingMotivations: z.array(shortText).min(3).max(8),
  objections: z.array(shortText).min(3).max(8),
  desiredOutcome: paragraph,
  persona: z.object({
    name: shortText,
    age: z.number().int().min(13).max(99),
    occupation: shortText,
    location: shortText,
    bio: paragraph,
    quote: shortText,
    goals: z.array(shortText).min(2).max(6),
    frustrations: z.array(shortText).min(2).max(6),
    shoppingBehaviour: paragraph,
    preferredChannels: z.array(shortText).min(2).max(6),
  }),
});

export type AudienceAnalysis = z.infer<typeof audienceAnalysisSchema>;

export const AI_SCHEMAS = {
  product_analysis: productAnalysisSchema,
  competitor_analysis: competitorAnalysisSchema,
  keyword_research: keywordAnalysisSchema,
  listing_generation: listingGenerationSchema,
  ad_generation: adGenerationSchema,
  audience_analysis: audienceAnalysisSchema,
} as const;

export type AIOperation = keyof typeof AI_SCHEMAS;
