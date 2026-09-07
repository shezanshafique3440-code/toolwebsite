'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Route error boundary. Users see a plain, actionable message — never a stack
 * trace. The full error is already logged server-side.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error('[client] route error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-score-avoid/10">
        <AlertTriangle className="size-5 text-score-avoid" aria-hidden />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
        We hit an unexpected problem loading this page. Trying again usually fixes it.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-fg-subtle">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
