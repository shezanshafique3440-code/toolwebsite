'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
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
import { useTheme } from '@/components/theme-provider';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type PaidPlan = 'PRO' | 'BUSINESS';
type Plan = 'FREE' | PaidPlan;

/**
 * Payment states shown to the user. "activated" is only ever reached after the
 * backend reports the plan changed, which happens only once Paddle's verified
 * webhook has been applied — a completed checkout on its own is reported as
 * "confirming", never as success.
 */
type PaymentState =
  | { kind: 'idle' }
  | { kind: 'opening'; plan: PaidPlan }
  | { kind: 'confirming'; plan: PaidPlan }
  | { kind: 'activated'; plan: PaidPlan }
  | { kind: 'pending'; plan: PaidPlan }
  | { kind: 'failed'; message: string }
  | { kind: 'canceled' };

const STATE_COPY: Record<string, { title: string; body: string; tone: 'info' | 'success' | 'warning' | 'error' }> = {
  opening: { title: 'Opening secure checkout…', body: 'Paddle is preparing your payment page.', tone: 'info' },
  confirming: {
    title: 'Confirming your payment…',
    body: 'Your payment was submitted. We are waiting for Paddle to confirm the subscription.',
    tone: 'info',
  },
  activated: { title: 'Subscription activated.', body: 'Your new plan is active and ready to use.', tone: 'success' },
  pending: {
    title: 'Your payment was received and your subscription is being confirmed.',
    body: 'This usually takes a few seconds. You can safely leave this page — the plan updates automatically once Paddle confirms it.',
    tone: 'warning',
  },
  failed: { title: 'Payment could not be completed.', body: '', tone: 'error' },
  canceled: { title: 'Checkout canceled.', body: 'No payment was taken and your plan is unchanged.', tone: 'info' },
};

export type BillingSnapshot = {
  plan: Plan;
  active: boolean;
  cancelAtPeriodEnd: boolean;
  managedExternally: boolean;
  manualGrant: boolean;
  paddleConfigured: boolean;
  paddleEnvironment: 'sandbox' | 'production';
  clientToken: string | null;
};

export function BillingPanel({ snapshot }: { snapshot: BillingSnapshot }) {
  const router = useRouter();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [paddle, setPaddle] = React.useState<Paddle | null>(null);
  const [state, setState] = React.useState<PaymentState>({ kind: 'idle' });
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [portalPending, setPortalPending] = React.useState(false);

  // Kept in a ref so the Paddle event callback, which is registered once, always
  // sees the plan that is actually being purchased.
  const pendingPlan = React.useRef<PaidPlan | null>(null);
  const completed = React.useRef(false);

  /**
   * Polls the backend until it reports the new plan. The webhook is the only
   * thing that can change it, so this waits for real confirmation rather than
   * assuming the checkout succeeded.
   */
  const confirmSubscription = React.useCallback(
    async (plan: PaidPlan) => {
      setState({ kind: 'confirming', plan });

      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1500 : 2000));
        try {
          const result = await apiFetch<{ entitlements: { plan: Plan; active: boolean } }>('/api/billing');
          if (result.entitlements.plan === plan && result.entitlements.active) {
            setState({ kind: 'activated', plan });
            router.refresh();
            return;
          }
        } catch {
          // Keep polling: a transient read failure is not a payment failure.
        }
      }

      // The payment went through; the webhook simply has not arrived yet.
      setState({ kind: 'pending', plan });
      router.refresh();
    },
    [router],
  );

  React.useEffect(() => {
    if (!snapshot.paddleConfigured || !snapshot.clientToken) return;
    let cancelled = false;

    initializePaddle({
      token: snapshot.clientToken,
      environment: snapshot.paddleEnvironment,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          completed.current = true;
          const plan = pendingPlan.current;
          if (plan) void confirmSubscription(plan);
          return;
        }
        if (event.name === 'checkout.closed') {
          // Closing after completing is normal; only treat it as a cancellation
          // when no completion was seen.
          if (!completed.current) setState({ kind: 'canceled' });
          return;
        }
        if (event.name === 'checkout.error' || event.name === 'checkout.failed') {
          setState({
            kind: 'failed',
            message: 'The payment was not completed. No charge was made — you can try again.',
          });
        }
      },
    })
      .then((instance) => {
        if (!cancelled) setPaddle(instance ?? null);
      })
      .catch(() => {
        if (!cancelled) setPaddle(null);
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot.paddleConfigured, snapshot.clientToken, snapshot.paddleEnvironment, confirmSubscription]);

  async function startCheckout(plan: Plan) {
    if (plan === 'FREE') return;
    if (!paddle) {
      toast({
        title: 'Checkout is not available',
        description: 'Payments are not configured for this deployment yet.',
        variant: 'error',
      });
      return;
    }

    completed.current = false;
    pendingPlan.current = plan;
    setState({ kind: 'opening', plan });

    try {
      const intent = await apiFetch<{ transactionId: string }>('/api/billing/checkout', { body: { plan } });
      paddle.Checkout.open({
        transactionId: intent.transactionId,
        settings: { displayMode: 'overlay', theme: resolvedTheme === 'dark' ? 'dark' : 'light' },
      });
    } catch (error) {
      setState({ kind: 'failed', message: errorMessage(error) });
    }
  }

  async function openPortal() {
    setPortalPending(true);
    try {
      const session = await apiFetch<{ overviewUrl: string }>('/api/billing/portal', { method: 'POST' });
      window.open(session.overviewUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({ title: 'Could not open the billing portal', description: errorMessage(error), variant: 'error' });
    } finally {
      setPortalPending(false);
    }
  }

  async function cancelSubscription() {
    setCancelling(true);
    try {
      const result = await apiFetch<{ message: string }>('/api/billing/cancel', { method: 'POST' });
      toast({ title: 'Cancellation requested', description: result.message, variant: 'success' });
      setCancelOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not cancel', description: errorMessage(error), variant: 'error' });
    } finally {
      setCancelling(false);
    }
  }

  const copy = state.kind === 'idle' ? null : STATE_COPY[state.kind];

  return (
    <>
      {copy && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-start gap-3 rounded-card px-4 py-3.5 text-sm hairline',
            copy.tone === 'success' && 'border-score-strong/30 bg-score-strong/[0.06]',
            copy.tone === 'warning' && 'border-score-potential/30 bg-score-potential/[0.06]',
            copy.tone === 'error' && 'border-score-avoid/30 bg-score-avoid/[0.05]',
            copy.tone === 'info' && 'bg-surface',
          )}
        >
          {state.kind === 'opening' || state.kind === 'confirming' ? (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-fg-muted" aria-hidden />
          ) : copy.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-score-strong" aria-hidden />
          ) : (
            <AlertTriangle
              className={cn(
                'mt-0.5 size-4 shrink-0',
                copy.tone === 'error' ? 'text-score-avoid' : 'text-score-potential',
              )}
              aria-hidden
            />
          )}
          <div>
            <p className="font-medium text-fg">{copy.title}</p>
            <p className="mt-0.5 leading-relaxed text-fg-muted">
              {state.kind === 'failed' ? state.message : copy.body}
            </p>
          </div>
        </div>
      )}

      {!snapshot.paddleConfigured && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium">Payments are not configured on this deployment.</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Plan upgrades are unavailable until the Paddle credentials are set on the server. No plan can be
              changed from the browser — a subscription becomes active only after Paddle confirms the payment.
            </p>
          </CardContent>
        </Card>
      )}

      {snapshot.paddleConfigured && snapshot.paddleEnvironment === 'sandbox' && (
        <p className="flex items-center gap-2 rounded-card bg-surface px-4 py-3 text-xs text-fg-muted hairline">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          Paddle is running in sandbox mode. Checkouts use test cards and no real money moves.
        </p>
      )}

      <PricingTable
        currentPlan={snapshot.plan}
        onSelect={startCheckout}
        busyPlan={state.kind === 'opening' ? state.plan : null}
        disabled={!snapshot.paddleConfigured}
      />

      {(snapshot.managedExternally || snapshot.plan !== 'FREE') && (
        <Card>
          <CardHeader>
            <CardTitle>Manage your subscription</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              {snapshot.manualGrant
                ? 'This plan was granted by an administrator rather than purchased, so there is no billing account to manage.'
                : 'Billing details, payment method, invoices and cancellation are handled securely by Paddle.'}
            </p>
          </CardHeader>
          {!snapshot.manualGrant && snapshot.managedExternally && (
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={openPortal} loading={portalPending}>
                <ExternalLink aria-hidden />
                Manage subscription
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCancelOpen(true)}
                disabled={snapshot.cancelAtPeriodEnd}
              >
                {snapshot.cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancel subscription'}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your subscription?</DialogTitle>
            <DialogDescription>
              You keep every paid feature until the end of the current billing period. After that your account moves
              to the Free plan. Your products and reports stay in your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep my plan
            </Button>
            <Button variant="danger" onClick={cancelSubscription} loading={cancelling}>
              Cancel at period end
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
