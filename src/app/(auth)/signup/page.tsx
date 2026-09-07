import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create a free ProductPilot AI account and run five product analyses every month.',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Five product analyses every month, free. No card required.
      </p>

      <SignupForm />

      <p className="mt-6 text-sm text-fg-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-fg underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
