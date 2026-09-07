import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { profitCalculateSchema } from '@/lib/validation/tools';
import { calculateProfit } from '@/lib/profit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The calculator runs entirely in the browser for instant feedback; this
 * endpoint exists so the same model can be called from a script or integration
 * and always returns the identical numbers.
 */
export const POST = route('profit.calculate', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('write', user.id);
  const input = await parseJsonBody(request, profitCalculateSchema);
  return jsonOk(calculateProfit(input));
});
