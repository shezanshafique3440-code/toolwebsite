import { z } from 'zod';
import { jsonCreated, jsonOk, parseJsonBody, route } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { grantPlan, revokeGrant } from '@/lib/services/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<Record<string, string>> };

const grantSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS']),
  // A reason is mandatory: the audit trail is the point of this endpoint.
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters.').max(300),
  expiresAt: z.coerce.date().optional(),
});

const revokeSchema = z.object({ grantId: z.string().trim().min(1).max(60) });

/**
 * Grants a complimentary plan. This is not a payment: the resulting
 * subscription is marked as a manual grant and recorded with the issuing
 * administrator and a reason.
 */
export const POST = route('admin.users.grant', async (request, context: Context) => {
  const admin = await requireAdmin();
  await enforceRateLimit('write', `grant:${admin.id}`);
  const { id } = await context.params;
  const input = await parseJsonBody(request, grantSchema);

  const grant = await grantPlan({
    actorId: admin.id,
    userId: id,
    plan: input.plan,
    reason: input.reason,
    expiresAt: input.expiresAt ?? null,
  });

  return jsonCreated({ id: grant.id, plan: grant.plan, createdAt: grant.createdAt });
});

export const DELETE = route('admin.users.revoke_grant', async (request, _context: Context) => {
  const admin = await requireAdmin();
  await enforceRateLimit('write', `grant:${admin.id}`);
  const input = await parseJsonBody(request, revokeSchema);
  await revokeGrant(admin.id, input.grantId);
  return jsonOk({ ok: true });
});
