import Link from 'next/link';
import { Logo } from '@/components/logo';
import { APP_NAME } from '@/lib/constants';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#product-scoring', label: 'Product scoring' },
      { href: '/#calculator', label: 'Profit calculator' },
      { href: '/#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { href: '/dashboard/research', label: 'Product research' },
      { href: '/dashboard/competitors', label: 'Competitor analysis' },
      { href: '/dashboard/keywords', label: 'SEO keywords' },
      { href: '/dashboard/ads', label: 'Ad generator' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Create account' },
      { href: '/dashboard/billing', label: 'Billing' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
              AI-powered product research for e-commerce sellers. Assess an opportunity before you spend money on
              inventory or ads.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-fg-subtle">
            Scores and projections are AI estimates produced from the information you provide. They are not measured
            market data and are not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
