'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormNotice } from '@/components/auth/field';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});

    try {
      await apiFetch('/api/auth/reset-password', {
        body: { token, password: String(form.get('password') ?? '') },
      });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 space-y-4">
        <FormNotice message="Your password has been updated. Redirecting you to sign in…" />
        <Link href="/login" className="text-sm font-medium text-fg underline underline-offset-4">
          Go to sign in now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <FormError message={error} />
      <Field
        id="password"
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        hint="At least 10 characters, including a letter and a number."
        error={fields.password}
      />
      <Button type="submit" className="w-full" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
