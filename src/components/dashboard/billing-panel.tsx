'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PricingTable } from '@/components/marketing/pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { apiFetch, errorMessage } from '@/lib/api-client';

type Plan = 'FREE' | 'PRO' | 'BUSINESS';

export function BillingPanel({
  currentPlan,
  cancelAtPeriodEnd,
  paymentsEnabled,
}: {
  currentPlan: Plan;
  cancelAtPeriodEnd: boolean;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  async function selectPlan(plan: Plan, interval: 'MONTHLY' | 'YEARLY') {
    setBusyPlan(plan);
    try {
      const result = await apiFetch<{ kind: 'redirect'; url: string } | { kind: 'applied' }>(
        '/api/billing/checkout',
        { body: { plan, interval } },
      );

      if (result.kind === 'redirect') {
        window.location.href = result.url;
        return;
      }

      toast({
        title: 'Plan updated',
        description: `You are now on the ${plan.charAt(0)}${plan.slice(1).toLowerCase()} plan.`,
        variant: 'success',
      });
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not change your plan', description: errorMessage(error), variant: 'error' });
    } finally {
      setBusyPlan(null);
    }
  }

  async function cancel() {
    setCancelling(true);
    try {
      const result = await apiFetch<{ message: string }>('/api/billing/cancel', { method: 'POST' });
      toast({ title: 'Cancellation scheduled', description: result.message, variant: 'success' });
      setCancelOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not cancel', description: errorMessage(error), variant: 'error' });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      {!paymentsEnabled && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium">No payment processor is connected yet.</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Plan changes are applied directly to your account and nothing is charged. The application talks to a
              billing provider interface, so connecting a real processor is a drop-in change that does not affect the
              rest of the app.
            </p>
          </CardContent>
        </Card>
      )}

      <PricingTable currentPlan={currentPlan} onSelect={selectPlan} busyPlan={busyPlan} />

      {currentPlan !== 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle>Cancel your plan</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              {cancelAtPeriodEnd
                ? 'Your plan is already scheduled to move to Free at the end of the current period.'
                : 'You keep full access until the end of the current period, then move to the Free plan. Your products and reports stay in your account.'}
            </p>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={cancelAtPeriodEnd}>
              {cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancel plan'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your plan?</DialogTitle>
            <DialogDescription>
              You keep every paid feature until the end of the current billing period. After that your account moves to
              the Free plan, with 5 analyses a month.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep my plan
            </Button>
            <Button variant="danger" onClick={cancel} loading={cancelling}>
              Cancel at period end
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
