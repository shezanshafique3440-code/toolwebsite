import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SidebarContent } from '@/components/dashboard/sidebar';
import { Topbar, type Notification } from '@/components/dashboard/topbar';
import { DemoModeBanner } from '@/components/dashboard/demo-banner';
import { getCurrentUser } from '@/lib/auth/current-user';
import { isDemoMode } from '@/lib/ai';
import { PLANS } from '@/lib/plans';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s · ProductPilot AI' },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Middleware already redirects unauthenticated visitors; this is the
  // authoritative server-side check that actually protects the data.
  if (!user) redirect('/login?next=/dashboard');

  const plan = PLANS[user.plan];
  const demoMode = isDemoMode();

  const notifications: Notification[] = [];

  if (!user.emailVerified) {
    notifications.push({
      id: 'verify-email',
      title: 'Confirm your email address',
      body: 'Verify your email so you can recover your account if you lose your password.',
      href: '/dashboard/settings',
      tone: 'warning',
    });
  }

  if (user.entitlements.analysesRemaining === 0) {
    notifications.push({
      id: 'analyses-exhausted',
      title: 'Monthly analysis limit reached',
      body: `You've used all ${user.entitlements.analysesLimit} analyses on the ${plan.name} plan this period.`,
      href: '/dashboard/billing',
      tone: 'warning',
    });
  } else if (user.entitlements.analysesRemaining <= 2) {
    notifications.push({
      id: 'analyses-low',
      title: 'Analyses running low',
      body: `${user.entitlements.analysesRemaining} of ${user.entitlements.analysesLimit} analyses left this period.`,
      href: '/dashboard/billing',
      tone: 'info',
    });
  }

  if (demoMode) {
    notifications.push({
      id: 'demo-mode',
      title: 'Demo mode is active',
      body: 'No AI provider key is configured, so generated content is clearly-labelled sample output.',
      href: '/dashboard/settings',
      tone: 'info',
    });
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">
        <SidebarContent isFreePlan={user.plan === 'FREE'} isAdmin={user.role === 'ADMIN'} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <Topbar
          user={{
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            planName: plan.name,
            isFreePlan: user.plan === 'FREE',
            isAdmin: user.role === 'ADMIN',
            emailVerified: user.emailVerified,
            creditsRemaining: user.entitlements.creditsRemaining,
            creditsGranted: user.entitlements.creditsGranted,
            analysesRemaining: user.entitlements.analysesRemaining,
          }}
          notifications={notifications}
        />

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {demoMode && <DemoModeBanner />}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
