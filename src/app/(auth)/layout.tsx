import Link from 'next/link';
import { Logo } from '@/components/logo';
import { APP_NAME } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-8">
        <Logo />
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <p className="text-xs text-fg-subtle">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      <aside className="hidden flex-col justify-between bg-ink-950 p-12 lg:flex">
        <div />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Why sellers use it</p>
          <blockquote className="mt-5 text-balance text-2xl font-medium leading-snug text-white">
            “The question is never whether a product looks good. It is whether the numbers still work after ads,
            fees and shipping.”
          </blockquote>
          <ul className="mt-8 space-y-3 text-sm text-ink-300">
            {[
              'Consistent 0-100 scoring across every product you consider',
              'Unit economics and break-even ROAS before you commit budget',
              'Competitor positioning, keywords, listings and ad copy in one place',
              'Estimates clearly labelled as estimates — never dressed up as data',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Link href="/" className="text-sm text-ink-400 transition-colors hover:text-white">
          ← Back to homepage
        </Link>
      </aside>
    </div>
  );
}
