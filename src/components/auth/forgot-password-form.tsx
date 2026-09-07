'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field, FormError, FormNotice } from '@/components/auth/field';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [devLink, setDevLink] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setNotice(null);
    setFields({});

    try {
      const result = await apiFetch<{ message: string; resetLink?: string }>('/api/auth/forgot-password', {
        body: { email: String(form.get('email') ?? '') },
      });
      setNotice(result.message);
      setDevLink(result.resetLink ?? null);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <FormError message={error} />
      <FormNotice message={notice} />

      {devLink && (
        <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-fg-muted">
          Development mode: no email transport is configured, so the link is shown here.{' '}
          <Link href={devLink} className="font-medium text-fg underline underline-offset-4">
            Open the reset link
          </Link>
        </p>
      )}

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

      <Button type="submit" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}
