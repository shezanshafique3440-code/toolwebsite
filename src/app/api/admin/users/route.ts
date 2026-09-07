import { z } from 'zod';
import { jsonOk, noStore, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { listUsers } from '@/lib/services/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = route('admin.users.list', async (request) => {
  const admin = await requireAdmin();
  await enforceRateLimit('read', admin.id);
  return noStore(jsonOk(await listUsers(parseQuery(request, querySchema))));
});
