import type { Plan } from '@prisma/client';

export type PlanDefinition = {
  id: Plan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Analyses included each billing period. */
  analysesPerMonth: number;
  /** AI credits included each billing period (1 credit = 1 AI generation). */
  creditsPerMonth: number;
  teamSeats: number;
  features: string[];
  limitations?: string[];
  highlighted?: boolean;
  cta: string;
};

export const PLANS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    tagline: 'Try the workflow on a handful of products.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    analysesPerMonth: 5,
    creditsPerMonth: 15,
    teamSeats: 1,
    cta: 'Start free',
    features: [
      '5 product analyses per month',
      'Product score with the four sub-metrics',
      'Basic AI insights and verdict',
      'Profit calculator (unlimited)',
      'Limited generators (keywords only)',
    ],
    limitations: ['No competitor analysis', 'No exports or saved reports'],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    tagline: 'For sellers testing products every week.',
    monthlyPrice: 19,
    yearlyPrice: 182,
    analysesPerMonth: 100,
    creditsPerMonth: 400,
    teamSeats: 1,
    highlighted: true,
    cta: 'Upgrade to Pro',
    features: [
      '100 product analyses per month',
      'Full product research report',
      'Competitor analysis and comparison table',
      'SEO keyword research',
      'Ad copy generator (4 platforms)',
      'Product listing generator',
      'Saved reports and history',
      'PDF export',
    ],
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business',
    tagline: 'For agencies and teams running research at volume.',
    monthlyPrice: 49,
    yearlyPrice: 470,
    analysesPerMonth: 500,
    creditsPerMonth: 2000,
    teamSeats: 5,
    cta: 'Upgrade to Business',
    features: [
      '500 product analyses per month',
      'Everything in Pro',
      'Team members (up to 5 seats)',
      'Advanced reports and portfolio view',
      'Priority processing queue',
      'API access (coming soon)',
    ],
  },
};

export const PLAN_ORDER: Plan[] = ['FREE', 'PRO', 'BUSINESS'];

/** Two months free when paying yearly. */
export function yearlySavingsPercent(plan: PlanDefinition) {
  if (plan.monthlyPrice === 0) return 0;
  const fullPrice = plan.monthlyPrice * 12;
  return Math.round(((fullPrice - plan.yearlyPrice) / fullPrice) * 100);
}

export function planFeatureAllowed(plan: Plan, feature: PlanFeature): boolean {
  return PLAN_FEATURES[feature].includes(plan);
}

export type PlanFeature =
  | 'competitorAnalysis'
  | 'keywords'
  | 'listing'
  | 'ads'
  | 'audience'
  | 'export'
  | 'savedReports'
  | 'apiAccess'
  | 'team';

/** Single source of truth for feature gating; enforced server-side. */
export const PLAN_FEATURES: Record<PlanFeature, Plan[]> = {
  competitorAnalysis: ['PRO', 'BUSINESS'],
  keywords: ['FREE', 'PRO', 'BUSINESS'],
  listing: ['PRO', 'BUSINESS'],
  ads: ['PRO', 'BUSINESS'],
  audience: ['PRO', 'BUSINESS'],
  export: ['PRO', 'BUSINESS'],
  savedReports: ['PRO', 'BUSINESS'],
  apiAccess: ['BUSINESS'],
  team: ['BUSINESS'],
};

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  competitorAnalysis: 'Competitor analysis',
  keywords: 'SEO keyword research',
  listing: 'Listing generator',
  ads: 'Ad copy generator',
  audience: 'Audience generator',
  export: 'PDF export',
  savedReports: 'Saved reports',
  apiAccess: 'API access',
  team: 'Team members',
};
