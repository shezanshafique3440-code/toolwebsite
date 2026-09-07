import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { audienceGenerateSchema } from '@/lib/validation/tools';
import { generateAudience } from '@/lib/services/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = route('audience.generate', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('ai', user.id);
  const input = await parseJsonBody(request, audienceGenerateSchema);
  const { record, result, isDemo } = await generateAudience(user, input);
  return jsonCreated({ id: record.id, audience: result, isDemo });
});
