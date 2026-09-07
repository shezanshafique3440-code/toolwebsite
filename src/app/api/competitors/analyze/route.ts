import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { competitorAnalyzeSchema } from '@/lib/validation/tools';
import { analyzeCompetitors } from '@/lib/services/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = route('competitors.analyze', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('aiHeavy', user.id);
  const input = await parseJsonBody(request, competitorAnalyzeSchema);
  const { record, result, isDemo } = await analyzeCompetitors(user, input);
  return jsonCreated({ id: record.id, analysis: result, isDemo });
});
