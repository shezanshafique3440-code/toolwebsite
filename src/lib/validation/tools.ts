import { z } from 'zod';
import { cuidSchema, notesSchema, optionalProductUrl, productNameSchema, productUrlSchema } from '@/lib/validation/common';

export const analyzeProductSchema = z.object({
  name: productNameSchema,
  url: optionalProductUrl,
  category: z.string().trim().max(80).optional(),
  notes: notesSchema,
  imageUrl: optionalProductUrl,
  /** Reuse an existing product row instead of creating another one. */
  productId: cuidSchema.optional(),
});

export const createProductSchema = z.object({
  name: productNameSchema,
  url: optionalProductUrl,
  imageUrl: optionalProductUrl,
  category: z.string().trim().max(80).optional(),
  notes: notesSchema,
});

export const updateProductSchema = z.object({
  name: productNameSchema.optional(),
  url: optionalProductUrl,
  imageUrl: optionalProductUrl,
  category: z.string().trim().max(80).optional(),
  notes: notesSchema,
});

export const productSortSchema = z.enum([
  'newest',
  'oldest',
  'score_desc',
  'score_asc',
  'name_asc',
]);

export const productFilterSchema = z.enum(['all', 'STRONG', 'POTENTIAL', 'RISKY', 'AVOID', 'unanalyzed']);

export const listProductsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  sort: productSortSchema.default('newest'),
  filter: productFilterSchema.default('all'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const competitorAnalyzeSchema = z.object({
  productId: cuidSchema.optional(),
  productName: productNameSchema,
  competitorUrls: z.array(productUrlSchema).max(6).default([]),
  notes: notesSchema,
});

export const keywordGenerateSchema = z.object({
  productId: cuidSchema.optional(),
  productName: productNameSchema,
  category: z.string().trim().max(80).optional(),
  notes: notesSchema,
});

export const listingGenerateSchema = z.object({
  productId: cuidSchema.optional(),
  productName: productNameSchema,
  category: z.string().trim().max(80).optional(),
  audience: z.string().trim().max(200).optional(),
  tone: z.enum(['Professional', 'Friendly', 'Premium', 'Playful', 'Technical']).default('Professional'),
  notes: notesSchema,
});

export const adGenerateSchema = z.object({
  productId: cuidSchema.optional(),
  productName: productNameSchema,
  platforms: z
    .array(z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE']))
    .min(1, 'Choose at least one platform.')
    .max(4),
  audience: z.string().trim().max(200).optional(),
  angle: z.string().trim().max(200).optional(),
  notes: notesSchema,
});

export const audienceGenerateSchema = z.object({
  productId: cuidSchema.optional(),
  productName: productNameSchema,
  category: z.string().trim().max(80).optional(),
  notes: notesSchema,
});

const money = z.coerce.number().min(0).max(1_000_000);

export const profitCalculateSchema = z.object({
  productCost: money,
  shippingCost: money,
  sellingPrice: money,
  paymentFeePercent: z.coerce.number().min(0).max(100),
  paymentFeeFixed: money,
  adCostPerOrder: money,
  platformFeePercent: z.coerce.number().min(0).max(100),
  otherExpenses: money,
  expectedOrders: z.coerce.number().int().min(0).max(1_000_000),
});

export const saveReportSchema = z.object({
  productId: cuidSchema,
  analysisId: cuidSchema.optional(),
  title: z.string().trim().min(2).max(140).optional(),
});
