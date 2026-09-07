'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/components/theme-provider';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function ProfileForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFields({});

    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: String(form.get('name') ?? ''),
          avatarUrl: String(form.get('avatarUrl') ?? ''),
        },
      });
      toast({ title: 'Profile updated', variant: 'success' });
      router.refresh();
    } catch (error) {
      setFields(fieldErrors(error));
      toast({ title: 'Could not update your profile', description: errorMessage(error), variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <p className="mt-1 text-sm text-fg-muted">How your account appears across the app.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" name="name" defaultValue={name} maxLength={80} required />
            {fields.name && (
              <p className="text-xs text-score-avoid" role="alert">
                {fields.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-avatar">Avatar URL</Label>
            <Input
              id="profile-avatar"
              name="avatarUrl"
              type="url"
              defaultValue={avatarUrl ?? ''}
              placeholder="https://…/avatar.jpg"
            />
            {fields.avatarUrl ? (
              <p className="text-xs text-score-avoid" role="alert">
                {fields.avatarUrl}
              </p>
            ) : (
              <p className="text-xs text-fg-subtle">Leave empty to use your initials.</p>
            )}
          </div>

          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFields({});

    try {
      await apiFetch('/api/auth/change-password', {
        body: {
          currentPassword: String(form.get('currentPassword') ?? ''),
          newPassword: String(form.get('newPassword') ?? ''),
        },
      });
      toast({
        title: 'Password updated',
        description: 'Other devices have been signed out.',
        variant: 'success',
      });
      formRef.current?.reset();
    } catch (error) {
      setFields(fieldErrors(error));
      toast({ title: 'Could not change your password', description: errorMessage(error), variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <p className="mt-1 text-sm text-fg-muted">Changing your password signs out every other device.</p>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
            {fields.currentPassword && (
              <p className="text-xs text-score-avoid" role="alert">
                {fields.currentPassword}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required />
            {fields.newPassword ? (
              <p className="text-xs text-score-avoid" role="alert">
                {fields.newPassword}
              </p>
            ) : (
              <p className="text-xs text-fg-subtle">At least 10 characters, including a letter and a number.</p>
            )}
          </div>

          <Button type="submit" loading={pending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function EmailVerification({ verified, email }: { verified: boolean; email: string }) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [link, setLink] = React.useState<string | null>(null);

  async function resend() {
    setPending(true);
    try {
      const result = await apiFetch<{ verificationLink?: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      setLink(result.verificationLink ?? null);
      toast({ title: 'Verification email sent', description: `Check ${email}.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not send the email', description: errorMessage(error), variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Email address
          <Badge variant={verified ? 'strong' : 'potential'}>{verified ? 'Verified' : 'Not verified'}</Badge>
        </CardTitle>
        <p className="mt-1 text-sm text-fg-muted">{email}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {verified ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <MailCheck className="size-4 text-score-strong" aria-hidden />
            Your email address is confirmed.
          </p>
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              Verify your address so you can reset your password if you lose access to your account.
            </p>
            <Button variant="secondary" onClick={resend} loading={pending}>
              Resend verification email
            </Button>
            {link && (
              <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-fg-muted">
                Development mode: no email transport is configured, so the link is shown here.{' '}
                <a href={link} className="font-medium text-fg underline underline-offset-4">
                  Open the verification link
                </a>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <p className="mt-1 text-sm text-fg-muted">Applies to this browser.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {(['light', 'dark', 'system'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
              className={cn(
                'rounded-lg px-3 py-2.5 text-sm capitalize transition-colors hairline',
                theme === option ? 'bg-accent text-accent-fg' : 'bg-surface text-fg-muted hover:bg-surface-muted',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
