import { z } from 'zod';
import { jsonOk, noStore, parseQuery, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { listSystemLogs } from '@/lib/services/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  level: z.enum(['INFO', 'WARN', 'ERROR']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = route('admin.logs', async (request) => {
  const admin = await requireAdmin();
  await enforceRateLimit('read', admin.id);
  return noStore(jsonOk(await listSystemLogs(parseQuery(request, querySchema))));
});
