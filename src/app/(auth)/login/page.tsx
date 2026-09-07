import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your ProductPilot AI account.',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-fg-muted">Sign in to continue your product research.</p>

      <LoginForm next={params.next} />

      <p className="mt-6 text-sm text-fg-muted">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-fg underline underline-offset-4">
          Create one free
        </Link>
      </p>
    </div>
  );
}
