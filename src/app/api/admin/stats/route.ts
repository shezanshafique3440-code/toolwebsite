import { jsonOk, noStore, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getAdminStats } from '@/lib/services/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route('admin.stats', async () => {
  const admin = await requireAdmin();
  await enforceRateLimit('read', admin.id);
  return noStore(jsonOk(await getAdminStats()));
});
