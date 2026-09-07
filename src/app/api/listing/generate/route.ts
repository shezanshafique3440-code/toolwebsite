import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { listingGenerateSchema } from '@/lib/validation/tools';
import { generateListing } from '@/lib/services/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = route('listing.generate', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('aiHeavy', user.id);
  const input = await parseJsonBody(request, listingGenerateSchema);
  const { record, result, isDemo } = await generateListing(user, input);
  return jsonCreated({ id: record.id, listing: result, isDemo });
});
