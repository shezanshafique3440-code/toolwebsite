import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Enter your email address and we&apos;ll send a link to choose a new password.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-sm text-fg-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-fg underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
