import { jsonCreated, parseJsonBody, route } from '@/lib/api';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { signupSchema } from '@/lib/validation/auth';
import { signup } from '@/lib/services/auth';
import { devLink } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.signup', async (request) => {
  await enforceRateLimit('signup', clientIp(request));
  const input = await parseJsonBody(request, signupSchema);
  const { user, verificationLink } = await signup(input);
  return jsonCreated({
    user: { id: user.id, email: user.email, name: user.name },
    verificationLink: devLink(verificationLink),
  });
});
