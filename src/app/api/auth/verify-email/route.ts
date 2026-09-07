import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { verifyEmailSchema } from '@/lib/validation/auth';
import { verifyEmail } from '@/lib/services/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.verify_email', async (request) => {
  await enforceRateLimit('auth', clientIp(request));
  const { token } = await parseJsonBody(request, verifyEmailSchema);
  await verifyEmail(token);
  return jsonOk({ message: 'Your email address has been verified.' });
});
