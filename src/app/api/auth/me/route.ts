import { jsonOk, noStore, parseJsonBody, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/current-user';
import { updateProfileSchema } from '@/lib/validation/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route('auth.me', async () => {
  const user = await requireUser();
  return noStore(
    jsonOk({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: user.emailVerified,
      plan: user.plan,
      entitlements: user.entitlements,
    }),
  );
});

export const PATCH = route('auth.update_profile', async (request) => {
  const user = await requireUser();
  const input = await parseJsonBody(request, updateProfileSchema);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name ?? undefined,
      avatarUrl: input.avatarUrl === '' ? null : (input.avatarUrl ?? undefined),
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  return jsonOk(updated);
});
