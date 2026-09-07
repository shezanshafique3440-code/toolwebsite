'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/auth/field';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});

    try {
      await apiFetch('/api/auth/login', {
        body: { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') },
      });
      // Only allow same-origin relative redirects.
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      router.replace(target);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <FormError message={error} />

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        placeholder="you@store.com"
        error={fields.email}
      />

      <div>
        <Field
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          error={fields.password}
        />
        <div className="mt-2 text-right">
          <Link href="/forgot-password" className="text-xs text-fg-muted underline underline-offset-4 hover:text-fg">
            Forgot your password?
          </Link>
        </div>
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
