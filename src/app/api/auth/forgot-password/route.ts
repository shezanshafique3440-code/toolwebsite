import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { requestPasswordReset } from '@/lib/services/auth';
import { devLink } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.forgot_password', async (request) => {
  await enforceRateLimit('passwordReset', clientIp(request));
  const { email } = await parseJsonBody(request, forgotPasswordSchema);
  const { link } = await requestPasswordReset(email);
  // The same response is returned whether or not the account exists.
  return jsonOk({
    message: 'If an account exists for that address, a reset link is on its way.',
    resetLink: link ? devLink(link) : undefined,
  });
});
