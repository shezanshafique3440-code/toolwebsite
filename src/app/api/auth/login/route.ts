import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validation/auth';
import { login } from '@/lib/services/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('auth.login', async (request) => {
  const input = await parseJsonBody(request, loginSchema);
  // Rate limit per IP and per account so neither a single client nor a single
  // target can be brute-forced.
  await enforceRateLimit('auth', clientIp(request));
  await enforceRateLimit('auth', `email:${input.email}`);
  const user = await login(input);
  return jsonOk({ user });
});
