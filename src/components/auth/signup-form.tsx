'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/auth/field';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';

export function SignupForm() {
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
      await apiFetch('/api/auth/signup', {
        body: {
          name: String(form.get('name') ?? ''),
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        },
      });
      router.replace('/dashboard');
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

      <Field id="name" name="name" label="Name" autoComplete="name" required placeholder="Alex Doe" error={fields.name} />
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
      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        required
        hint="At least 10 characters, including a letter and a number."
        error={fields.password}
      />

      <Button type="submit" className="w-full" loading={pending}>
        Create account
      </Button>

      <p className="text-xs leading-relaxed text-fg-subtle">
        By creating an account you agree that scores and projections in this product are AI estimates, not measured
        market data or financial advice.
      </p>
    </form>
  );
}
