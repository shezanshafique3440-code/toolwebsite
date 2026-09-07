import {
  BarChart3,
  Bookmark,
  Calculator,
  CreditCard,
  FileText,
  LayoutDashboard,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Users2,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Marks tools that are not on the Free plan, so the sidebar can label them. */
  proOnly?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/research', label: 'Product Research', icon: Sparkles },
  { href: '/dashboard/competitors', label: 'Competitor Analysis', icon: Users2, proOnly: true },
  { href: '/dashboard/calculator', label: 'Profit Calculator', icon: Calculator },
  { href: '/dashboard/keywords', label: 'SEO Keywords', icon: Search },
  { href: '/dashboard/listings', label: 'Listing Generator', icon: FileText, proOnly: true },
  { href: '/dashboard/ads', label: 'Ad Generator', icon: Megaphone, proOnly: true },
  { href: '/dashboard/audience', label: 'Audience Builder', icon: Users, proOnly: true },
];

export const LIBRARY_NAV: NavItem[] = [
  { href: '/dashboard/products', label: 'Saved Products', icon: Bookmark },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
];

export const ADMIN_NAV: NavItem[] = [{ href: '/admin', label: 'Admin', icon: ShieldCheck }];
