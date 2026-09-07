import 'server-only';
import type { Plan } from '@prisma/client';
import { AppError } from '@/lib/errors';
import type { CurrentUser } from '@/lib/auth/current-user';
import { FEATURE_LABELS, PLANS, planFeatureAllowed, type PlanFeature } from '@/lib/plans';

const PLAN_RANK: Record<Plan, number> = { FREE: 0, PRO: 1, BUSINESS: 2 };

/**
 * Server-side plan gate.
 *
 * `user.plan` is the *effective* plan computed from the subscription record —
 * an expired, paused or ended subscription already reads as FREE — so this can
 * never be satisfied by anything the browser sends. The UI hiding a button is
 * only cosmetic; this is the actual authorisation boundary.
 *
 * Throws `PRO_PLAN_REQUIRED` / `BUSINESS_PLAN_REQUIRED`, both HTTP 403.
 */
export function requirePlan(user: CurrentUser, minimum: Exclude<Plan, 'FREE'>) {
  if (PLAN_RANK[user.plan] >= PLAN_RANK[minimum]) return;

  const code = minimum === 'BUSINESS' ? 'BUSINESS_PLAN_REQUIRED' : 'PRO_PLAN_REQUIRED';
  const required = minimum === 'BUSINESS' ? 'Business' : 'Pro and Business';

  throw new AppError(
    code,
    `This feature is available on the ${required} plan${minimum === 'BUSINESS' ? '' : 's'}. You are currently on ${PLANS[user.plan].name}.`,
    { details: { requiredPlan: minimum, currentPlan: user.plan } },
  );
}

/**
 * Gates a named capability rather than a plan tier, so the plan-to-feature map
 * stays the single place features move between tiers.
 */
export function requireFeature(user: CurrentUser, feature: PlanFeature) {
  if (planFeatureAllowed(user.plan, feature)) return;

  const minimum: Exclude<Plan, 'FREE'> = planFeatureAllowed('PRO', feature) ? 'PRO' : 'BUSINESS';
  const code = minimum === 'BUSINESS' ? 'BUSINESS_PLAN_REQUIRED' : 'PRO_PLAN_REQUIRED';

  throw new AppError(
    code,
    `${FEATURE_LABELS[feature]} is available on the ${minimum === 'BUSINESS' ? 'Business plan' : 'Pro and Business plans'}. You are currently on ${PLANS[user.plan].name}.`,
    { details: { requiredPlan: minimum, currentPlan: user.plan, feature } },
  );
}
