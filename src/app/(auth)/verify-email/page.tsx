import type { Metadata } from 'next';
import Link from 'next/link';
import { VerifyEmailClient } from '@/components/auth/verify-email-client';

export const metadata: Metadata = {
  title: 'Verify your email',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verification link not valid</h1>
        <p className="mt-2 text-sm text-fg-muted">
          This link is missing its token. Open the most recent verification email, or request a new link from your
          settings.
        </p>
        <Link href="/dashboard/settings" className="mt-6 inline-block text-sm font-medium text-fg underline underline-offset-4">
          Go to settings
        </Link>
      </div>
    );
  }

  return <VerifyEmailClient token={token} />;
}
