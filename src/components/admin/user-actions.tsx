'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { apiFetch, errorMessage } from '@/lib/api-client';

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  bonusCredits: number;
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  /** Paid Paddle subscriptions are managed in Paddle, not here. */
  paidSubscription: boolean;
};

export function UserActions({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    status: user.status,
    role: user.role,
    bonusCredits: String(user.bonusCredits),
  });

  async function save() {
    setPending(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: {
          status: form.status,
          role: form.role,
          bonusCredits: Number(form.bonusCredits) || 0,
        },
      });
      toast({ title: 'User updated', description: user.email, variant: 'success' });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not update the user', description: errorMessage(error), variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  async function grant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}/grant`, {
        body: {
          plan: String(data.get('plan') ?? 'PRO'),
          reason: String(data.get('reason') ?? ''),
          expiresAt: String(data.get('expiresAt') ?? '') || undefined,
        },
      });
      toast({
        title: 'Complimentary plan granted',
        description: `${user.email} — recorded in the audit log.`,
        variant: 'success',
      });
      setGrantOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not grant the plan', description: errorMessage(error), variant: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Settings2 aria-hidden />
          Manage
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setGrantOpen(true)}
          disabled={user.paidSubscription}
          title={
            user.paidSubscription
              ? 'This account has a paid Paddle subscription — change it in Paddle'
              : 'Grant a complimentary plan'
          }
        >
          <Gift aria-hidden />
          Grant
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {user.name}</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-status">Account status</Label>
              <Select
                id="user-status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as ManagedUser['status'] })}
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
              <p className="text-xs text-fg-subtle">Suspending signs the user out everywhere immediately.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role">Role</Label>
              <Select
                id="user-role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as ManagedUser['role'] })}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-credits">Bonus AI credits</Label>
              <Input
                id="user-credits"
                type="number"
                min={0}
                max={100000}
                value={form.bonusCredits}
                onChange={(event) => setForm({ ...form, bonusCredits: event.target.value })}
              />
              <p className="text-xs text-fg-subtle">Added on top of the plan allowance every period.</p>
            </div>

            <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-fg-muted">
              Plans cannot be changed here. A paid plan comes from a verified Paddle payment; a complimentary plan is
              granted through &ldquo;Grant&rdquo;, which records who issued it and why.
            </p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={pending}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <form onSubmit={grant}>
            <DialogHeader>
              <DialogTitle>Grant a complimentary plan</DialogTitle>
              <DialogDescription>
                This is not a payment. {user.email} will be marked as a manual grant, separate from any Paddle
                subscription, and the grant is written to the audit log.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="grant-plan">Plan</Label>
                <Select id="grant-plan" name="plan" defaultValue="PRO">
                  <option value="PRO">Pro</option>
                  <option value="BUSINESS">Business</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grant-reason">Reason *</Label>
                <Textarea
                  id="grant-reason"
                  name="reason"
                  required
                  minLength={5}
                  maxLength={300}
                  rows={3}
                  placeholder="e.g. Support goodwill after a billing issue — ticket #1423"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grant-expires">Expires (optional)</Label>
                <Input id="grant-expires" name="expiresAt" type="date" />
                <p className="text-xs text-fg-subtle">Leave empty for a grant that stands until revoked.</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setGrantOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Grant plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
