import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { changePasswordSchema } from '@/lib/validation/auth';
import { changePassword } from '@/lib/services/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.change_password', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('auth', `change:${user.id}`);
  const input = await parseJsonBody(request, changePasswordSchema);
  await changePassword(user.id, input.currentPassword, input.newPassword);
  return jsonOk({ message: 'Password updated.' });
});
