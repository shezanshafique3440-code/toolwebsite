'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';

export function VerifyEmailClient({ token }: { token: string }) {
  const [state, setState] = React.useState<'pending' | 'done' | 'error'>('pending');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    apiFetch('/api/auth/verify-email', { body: { token } })
      .then(() => {
        if (!cancelled) setState('done');
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(errorMessage(error));
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'pending') {
    return (
      <div className="flex items-center gap-3 text-sm text-fg-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Verifying your email address…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div>
        <XCircle className="size-8 text-score-avoid" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">We could not verify that link</h1>
        <p className="mt-2 text-sm text-fg-muted">{message}</p>
        <Link href="/dashboard/settings" className="mt-6 inline-block text-sm font-medium text-fg underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <CheckCircle2 className="size-8 text-score-strong" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Email verified</h1>
      <p className="mt-2 text-sm text-fg-muted">Thanks — your email address is confirmed.</p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-fg underline underline-offset-4">
        Go to your dashboard
      </Link>
    </div>
  );
}
