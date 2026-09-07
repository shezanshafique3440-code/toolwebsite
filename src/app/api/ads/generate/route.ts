import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { adGenerateSchema } from '@/lib/validation/tools';
import { generateAds } from '@/lib/services/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = route('ads.generate', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('aiHeavy', user.id);
  const input = await parseJsonBody(request, adGenerateSchema);
  const { records, result, isDemo } = await generateAds(user, input);
  return jsonCreated({ ids: records.map((record) => record.id), ads: result, isDemo });
});
