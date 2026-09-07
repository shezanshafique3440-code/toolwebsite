import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { Plan, Role, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { getEntitlements, type Entitlements } from '@/lib/billing/service';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  plan: Plan;
  entitlements: Entitlements;
};

/**
 * Resolves the signed-in user from the session cookie.
 *
 * The JWT is only a claim: the user row is always re-read so a suspended,
 * deleted or password-reset account loses access immediately (`sessionVersion`).
 * Memoised per request via React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      sessionVersion: true,
      bonusCredits: true,
      createdAt: true,
    },
  });

  if (!user) return null;
  if (user.sessionVersion !== claims.sv) return null;
  if (user.status === 'SUSPENDED') return null;

  const entitlements = await getEntitlements(user.id, user.bonusCredits);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
    plan: entitlements.plan,
    entitlements,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError('UNAUTHORIZED');
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Administrator access is required.');
  return user;
}
