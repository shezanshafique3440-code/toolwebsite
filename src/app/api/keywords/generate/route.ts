import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { keywordGenerateSchema } from '@/lib/validation/tools';
import { generateKeywords } from '@/lib/services/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = route('keywords.generate', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('ai', user.id);
  const input = await parseJsonBody(request, keywordGenerateSchema);
  const { record, result, isDemo } = await generateKeywords(user, input);
  return jsonCreated({ id: record.id, keywords: result, isDemo });
});
