import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { analyzeProductSchema } from '@/lib/validation/tools';
import { analyzeProduct } from '@/lib/services/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Product analysis is the most expensive call in the app; allow it room to finish.
export const maxDuration = 120;

export const POST = route('products.analyze', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('aiHeavy', user.id);
  const input = await parseJsonBody(request, analyzeProductSchema);
  const { product, analysis, isDemo } = await analyzeProduct(user, input);

  return jsonCreated({
    productId: product.id,
    analysisId: analysis.id,
    overallScore: analysis.overallScore,
    verdict: analysis.verdict,
    isDemo,
  });
});
