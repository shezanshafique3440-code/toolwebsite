'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_NAV, ADMIN_NAV, LIBRARY_NAV, PRIMARY_NAV, type NavItem } from '@/components/dashboard/nav-items';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string) {
  if (href === '/dashboard' || href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  locked,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  locked: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
        active ? 'bg-surface-muted font-medium text-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
      )}
    >
      <item.icon className={cn('size-4 shrink-0', active ? 'text-fg' : 'text-fg-subtle')} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {locked && (
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
          Pro
        </Badge>
      )}
    </Link>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  isFreePlan,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  isFreePlan: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="px-3 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{title}</p>
      <nav className="space-y-0.5" aria-label={title}>
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            locked={Boolean(item.proOnly && isFreePlan)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}

export function SidebarContent({
  isFreePlan,
  isAdmin,
  onNavigate,
}: {
  isFreePlan: boolean;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-4">
        <Logo href="/dashboard" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <NavGroup title="Research" items={PRIMARY_NAV} pathname={pathname} isFreePlan={isFreePlan} onNavigate={onNavigate} />
        <NavGroup title="Library" items={LIBRARY_NAV} pathname={pathname} isFreePlan={isFreePlan} onNavigate={onNavigate} />
        <NavGroup title="Account" items={ACCOUNT_NAV} pathname={pathname} isFreePlan={isFreePlan} onNavigate={onNavigate} />
        {isAdmin && (
          <NavGroup title="Administration" items={ADMIN_NAV} pathname={pathname} isFreePlan={false} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}
