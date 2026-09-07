import { jsonOk, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { resendVerification } from '@/lib/services/auth';
import { devLink } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.resend_verification', async () => {
  const user = await requireUser();
  await enforceRateLimit('passwordReset', `verify:${user.id}`);
  const link = await resendVerification(user.id);
  return jsonOk({ message: 'Verification email sent.', verificationLink: devLink(link) });
});
