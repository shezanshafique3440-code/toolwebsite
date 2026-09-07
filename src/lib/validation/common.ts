import { z } from 'zod';

/**
 * Accepts a product page URL. Only http(s) is allowed, which also blocks
 * `javascript:` and `data:` values from ever reaching a rendered anchor.
 */
export const productUrlSchema = z
  .string()
  .trim()
  .max(2048, 'That URL is too long.')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Please provide a valid product URL (starting with http:// or https://).');

export const optionalProductUrl = z.union([productUrlSchema, z.literal('')]).optional();

export const cuidSchema = z.string().trim().min(1).max(60);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const productNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter a product name with at least 2 characters.')
  .max(120, 'Product names can be at most 120 characters.');

export const notesSchema = z
  .string()
  .trim()
  .max(4000, 'Product details can be at most 4000 characters.')
  .optional();
