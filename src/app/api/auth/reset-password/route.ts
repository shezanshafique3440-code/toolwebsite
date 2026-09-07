import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { resetPassword } from '@/lib/services/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.reset_password', async (request) => {
  await enforceRateLimit('passwordReset', clientIp(request));
  const { token, password } = await parseJsonBody(request, resetPasswordSchema);
  await resetPassword(token, password);
  return jsonOk({ message: 'Your password has been updated. You can now sign in.' });
});
