import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { getCurrentUser } from '@/lib/auth/current-user';
import { AdminNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin · ProductPilot AI' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Role is re-checked here, not just in middleware: routing is never the
  // authorisation boundary.
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo href="/admin" />
            <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-[11px] font-medium text-white">Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to app
          </Link>
        </div>
        <div className="container-page">
          <AdminNav />
        </div>
      </header>

      <main id="main" className="container-page py-8">
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
