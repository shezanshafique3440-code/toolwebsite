import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-10 text-sm font-medium uppercase tracking-wide text-fg-subtle">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
        The link may be out of date, or the item may have been deleted from your account.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Back to homepage</Link>
        </Button>
      </div>
    </div>
  );
}
