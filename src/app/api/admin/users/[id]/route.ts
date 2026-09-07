import { z } from 'zod';
import { jsonOk, noStore, parseJsonBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getUserDetail, updateUser } from '@/lib/services/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<Record<string, string>> };

// Plan is deliberately absent: a complimentary plan is an audited manual grant
// (POST .../grant), never a silent field edit that could look like a payment.
const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  bonusCredits: z.coerce.number().int().min(0).max(100_000).optional(),
});

async function targetId(context: Context) {
  const params = await context.params;
  return params.id ?? '';
}

export const GET = route('admin.users.get', async (_request, context: Context) => {
  const admin = await requireAdmin();
  await enforceRateLimit('read', admin.id);
  return noStore(jsonOk(await getUserDetail(await targetId(context))));
});

export const PATCH = route('admin.users.update', async (request, context: Context) => {
  const admin = await requireAdmin();
  await enforceRateLimit('write', admin.id);
  const input = await parseJsonBody(request, updateSchema);
  return jsonOk(await updateUser(admin.id, await targetId(context), input));
});
