import { NextResponse } from 'next/server';
import { isPaddleConfigured } from '@/lib/billing/paddle/config';
import { handlePaddleEvent, verifyPaddleWebhook } from '@/lib/billing/paddle/webhook';
import { describeError, logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Paddle webhook receiver.
 *
 * Deliberately outside the usual `route()` wrapper: that helper enforces a
 * same-origin check for CSRF, which would reject Paddle's own request. The
 * cryptographic signature check below is this endpoint's authentication, and it
 * is stronger — the body is verified against the shared webhook secret, so only
 * Paddle can produce an accepted request.
 *
 * No session is involved, and nothing here reads anything the browser controls.
 */
export async function POST(request: Request) {
  if (!isPaddleConfigured()) {
    await logger.error({
      event: 'billing.webhook_unconfigured',
      message: 'Received a Paddle webhook while Paddle is not configured',
    });
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  // The raw body is required: the signature covers the exact bytes sent.
  const rawBody = await request.text();
  const signature = request.headers.get('paddle-signature');

  const verified = await verifyPaddleWebhook(rawBody, signature);
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const outcome = await handlePaddleEvent(verified.event);
    // 200 for duplicates and unmapped events too: retrying will not change the
    // result, and Paddle should stop redelivering.
    return NextResponse.json({ received: true, status: outcome.status });
  } catch (error) {
    await logger.error({
      event: 'billing.webhook_error',
      message: 'Paddle webhook handling failed',
      context: describeError(error),
    });
    // 500 asks Paddle to retry, which is right for a transient failure.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
