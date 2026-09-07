'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Coins,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/components/theme-provider';
import { SidebarContent } from '@/components/dashboard/sidebar';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { cn, initials } from '@/lib/utils';

export type TopbarUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
  planName: string;
  isFreePlan: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  creditsRemaining: number;
  creditsGranted: number;
  analysesRemaining: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  tone: 'info' | 'warning';
};

export function Topbar({ user, notifications }: { user: TopbarUser; notifications: Notification[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [signingOut, setSigningOut] = React.useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not sign out', description: errorMessage(error), variant: 'error' });
      setSigningOut(false);
    }
  }

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/dashboard/products?q=${encodeURIComponent(trimmed)}` : '/dashboard/products');
  }

  const lowCredits = user.creditsGranted > 0 && user.creditsRemaining <= Math.max(2, user.creditsGranted * 0.1);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>

          <form onSubmit={onSearch} className="relative flex-1 sm:max-w-md" role="search">
            <label htmlFor="dashboard-search" className="sr-only">
              Search your products
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input
              id="dashboard-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your products…"
              className="pl-9"
              type="search"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard/billing"
              className={cn(
                'hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:inline-flex',
                lowCredits ? 'bg-score-risky/10 text-score-risky' : 'bg-surface-muted text-fg-muted hover:text-fg',
              )}
              title={`${user.creditsRemaining} of ${user.creditsGranted} AI credits remaining this period`}
            >
              <Coins className="size-3.5" aria-hidden />
              <span className="tabular-nums">{user.creditsRemaining}</span>
              <span className="text-fg-subtle">credits</span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted"
                  aria-label={`Notifications (${notifications.length})`}
                >
                  <Bell className="size-[18px]" />
                  {notifications.length > 0 && (
                    <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-600" aria-hidden />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                {notifications.length === 0 ? (
                  <p className="px-2.5 py-4 text-sm text-fg-muted">You&apos;re all caught up.</p>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} asChild>
                      <Link href={notification.href ?? '/dashboard'} className="flex-col items-start gap-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-fg">
                          {notification.title}
                          {notification.tone === 'warning' && <Badge variant="risky">Action needed</Badge>}
                        </span>
                        <span className="text-xs leading-relaxed text-fg-muted">{notification.body}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-surface-muted"
                  aria-label="Account menu"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatars are arbitrary user-supplied URLs
                    <img src={user.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-fg">
                      {initials(user.name)}
                    </span>
                  )}
                  <span className="hidden text-sm font-medium sm:inline">{user.name.split(' ')[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium text-fg">{user.name}</p>
                  <p className="truncate text-xs text-fg-muted">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={user.isFreePlan ? 'neutral' : 'brand'}>{user.planName} plan</Badge>
                    <span className="text-xs text-fg-subtle">{user.analysesRemaining} analyses left</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings aria-hidden />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing">
                    <Coins aria-hidden />
                    Plan and credits
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <div className="flex gap-1 px-1.5 pb-1.5">
                  {(
                    [
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={theme === option.value}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] transition-colors',
                        theme === option.value ? 'bg-surface-muted text-fg' : 'text-fg-muted hover:bg-surface-muted',
                      )}
                    >
                      <option.icon className="size-3.5" aria-hidden />
                      {option.label}
                    </button>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => void signOut()} disabled={signingOut}>
                  <LogOut aria-hidden />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-rise bg-surface shadow-raised">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 inline-flex size-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            <SidebarContent
              isFreePlan={user.isFreePlan}
              isAdmin={user.isAdmin}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

/** Shared page heading used across every dashboard screen. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
