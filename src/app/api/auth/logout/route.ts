import { jsonOk, route } from '@/lib/api';
import { logout } from '@/lib/services/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.logout', async () => {
  await logout();
  return jsonOk({ ok: true });
});
