'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
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
};

export function UserActions({ user }: { user: ManagedUser }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    status: user.status,
    plan: user.plan,
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
          plan: form.plan,
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

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Settings2 aria-hidden />
        Manage
      </Button>

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
              <Label htmlFor="user-plan">Subscription plan</Label>
              <Select
                id="user-plan"
                value={form.plan}
                onChange={(event) => setForm({ ...form, plan: event.target.value as ManagedUser['plan'] })}
              >
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="BUSINESS">Business</option>
              </Select>
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
    </>
  );
}
