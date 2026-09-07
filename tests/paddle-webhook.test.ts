/**
 * Integration tests for the Paddle webhook against a real database.
 *
 * These cover the security claims that matter: a forged event cannot grant a
 * plan, a redelivered event cannot be applied twice, and entitlement follows
 * the subscription lifecycle Paddle reports.
 *
 * Skipped automatically when no database is reachable.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';

const WEBHOOK_SECRET = 'pdl_ntfset_test_secret_for_the_suite';
const PRO_PRICE = 'pri_test_pro';
const BUSINESS_PRICE = 'pri_test_business';

process.env.PADDLE_API_KEY ||= 'pdl_test_api_key';
process.env.PADDLE_CLIENT_TOKEN ||= 'test_client_token';
process.env.PADDLE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.PADDLE_PRO_PRICE_ID = PRO_PRICE;
process.env.PADDLE_BUSINESS_PRICE_ID = BUSINESS_PRICE;
process.env.PADDLE_ENVIRONMENT = 'sandbox';

const { prisma } = await import('@/lib/db');
const { verifyPaddleWebhook, handlePaddleEvent } = await import('@/lib/billing/paddle/webhook');
const { getEntitlements } = await import('@/lib/billing/service');

let databaseAvailable = true;
try {
  await prisma.$queryRaw`SELECT 1`;
} catch {
  databaseAvailable = false;
}

/** Builds the signature header exactly as Paddle does. */
function sign(body: string, secret = WEBHOOK_SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac('sha256', secret).update(`${timestamp}:${body}`).digest('hex');
  return `ts=${timestamp};h1=${digest}`;
}

function subscriptionEvent(input: {
  eventId: string;
  eventType: string;
  userId: string;
  subscriptionId: string;
  status: string;
  priceId?: string;
  periodEnd?: Date;
  scheduledCancel?: boolean;
  customerId?: string;
}) {
  const start = new Date(Date.now() - 86_400_000);
  const end = input.periodEnd ?? new Date(Date.now() + 29 * 86_400_000);
  return {
    event_id: input.eventId,
    event_type: input.eventType,
    occurred_at: new Date().toISOString(),
    notification_id: randomUUID(),
    data: {
      id: input.subscriptionId,
      status: input.status,
      customer_id: input.customerId ?? 'ctm_test_customer',
      address_id: 'add_test',
      currency_code: 'USD',
      created_at: start.toISOString(),
      updated_at: new Date().toISOString(),
      current_billing_period: { starts_at: start.toISOString(), ends_at: end.toISOString() },
      billing_cycle: { interval: 'month', frequency: 1 },
      collection_mode: 'automatic',
      scheduled_change: input.scheduledCancel
        ? { action: 'cancel', effective_at: end.toISOString(), resume_at: null }
        : null,
      items: [{ price: { id: input.priceId ?? PRO_PRICE }, status: 'active', quantity: 1 }],
      custom_data: { userId: input.userId },
    },
  };
}

describe('Paddle webhook', { skip: databaseAvailable ? false : 'no database available' }, () => {
  let userId: string;
  const subscriptionId = `sub_${randomUUID().slice(0, 12)}`;
  const createdUserIds: string[] = [];

  before(async () => {
    const user = await prisma.user.create({
      data: {
        email: `webhook-${randomUUID()}@example.test`,
        name: 'Webhook Test',
        passwordHash: 'x',
      },
    });
    userId = user.id;
    createdUserIds.push(user.id);
  });

  after(async () => {
    await prisma.paymentEvent.deleteMany({ where: { eventId: { startsWith: 'evt_test_' } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  test('rejects a webhook with no signature', async () => {
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_nosig',
      eventType: 'subscription.activated',
      userId,
      subscriptionId,
      status: 'active',
    }));
    assert.equal(await verifyPaddleWebhook(body, null), null);
  });

  test('rejects a forged signature', async () => {
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_forged',
      eventType: 'subscription.activated',
      userId,
      subscriptionId,
      status: 'active',
    }));
    assert.equal(await verifyPaddleWebhook(body, 'ts=123;h1=deadbeef'), null);
    assert.equal(await verifyPaddleWebhook(body, sign(body, 'the-wrong-secret')), null);
  });

  test('rejects a body tampered with after signing', async () => {
    const original = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_tampered',
      eventType: 'subscription.activated',
      userId,
      subscriptionId,
      status: 'active',
    }));
    const signature = sign(original);
    // An attacker upgrading themselves to Business by editing the signed body.
    const tampered = original.replace(PRO_PRICE, BUSINESS_PRICE);
    assert.notEqual(original, tampered);
    assert.equal(await verifyPaddleWebhook(tampered, signature), null);
  });

  test('an activation from Paddle upgrades the account to Pro', async () => {
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_activate',
      eventType: 'subscription.activated',
      userId,
      subscriptionId,
      status: 'active',
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified, 'a genuine signature must be accepted');

    const outcome = await handlePaddleEvent(verified.event);
    assert.equal(outcome.status, 'processed');

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    assert.equal(subscription?.plan, 'PRO');
    assert.equal(subscription?.status, 'ACTIVE');
    assert.equal(subscription?.provider, 'paddle');
    assert.equal(subscription?.providerSubscriptionId, subscriptionId);
    assert.equal(subscription?.priceId, PRO_PRICE);

    // The denormalised mirror on User must agree.
    const user = await prisma.user.findUnique({ where: { id: userId } });
    assert.equal(user?.plan, 'PRO');

    const entitlements = await getEntitlements(userId, 0);
    assert.equal(entitlements.plan, 'PRO');
    assert.equal(entitlements.analysesLimit, 100);
  });

  test('a redelivered event is ignored rather than applied twice', async () => {
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_activate',
      eventType: 'subscription.activated',
      userId,
      subscriptionId,
      status: 'active',
      priceId: BUSINESS_PRICE,
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified);

    const outcome = await handlePaddleEvent(verified.event);
    assert.equal(outcome.status, 'duplicate');

    // The replay carried a Business price; because it was skipped, the plan is
    // unchanged. A replay must never escalate entitlement.
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    assert.equal(subscription?.plan, 'PRO');

    const events = await prisma.paymentEvent.count({ where: { eventId: 'evt_test_activate' } });
    assert.equal(events, 1);
  });

  test('a scheduled cancellation keeps access until the period ends', async () => {
    const periodEnd = new Date(Date.now() + 10 * 86_400_000);
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_cancel_scheduled',
      eventType: 'subscription.updated',
      userId,
      subscriptionId,
      status: 'active',
      periodEnd,
      scheduledCancel: true,
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified);
    await handlePaddleEvent(verified.event);

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    assert.equal(subscription?.cancelAtPeriodEnd, true);
    assert.equal(subscription?.plan, 'PRO', 'access is not withdrawn early');

    const entitlements = await getEntitlements(userId, 0);
    assert.equal(entitlements.plan, 'PRO');
    assert.equal(entitlements.active, true);
  });

  test('an expired cancellation returns the account to Free', async () => {
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_cancel_final',
      eventType: 'subscription.canceled',
      userId,
      subscriptionId,
      status: 'canceled',
      periodEnd: new Date(Date.now() - 1000),
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified);
    await handlePaddleEvent(verified.event);

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    assert.equal(subscription?.plan, 'FREE');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    assert.equal(user?.plan, 'FREE');

    const entitlements = await getEntitlements(userId, 0);
    assert.equal(entitlements.plan, 'FREE');
    assert.equal(entitlements.analysesLimit, 5, 'Free limits apply again');
  });

  test('an event for an unknown account is recorded, not applied', async () => {
    // No custom data match, no known subscription and no known customer, so
    // there is nothing to attribute this event to.
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_unmapped',
      eventType: 'subscription.activated',
      userId: 'user_that_does_not_exist',
      subscriptionId: `sub_${randomUUID().slice(0, 10)}`,
      status: 'active',
      customerId: `ctm_unknown_${randomUUID().slice(0, 8)}`,
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified);
    const outcome = await handlePaddleEvent(verified.event);
    assert.equal(outcome.status, 'unmapped');
  });

  test('an event is matched by customer id when custom data is missing', async () => {
    // Subscriptions created outside the checkout flow carry no custom data;
    // the stored provider ids are what link them back to an account.
    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_by_customer',
      eventType: 'subscription.updated',
      userId: 'not-a-real-user-id',
      subscriptionId,
      status: 'active',
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified);
    const outcome = await handlePaddleEvent(verified.event);
    assert.equal(outcome.status, 'processed');

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    assert.equal(subscription?.plan, 'PRO', 'resolved to the right account and re-applied Pro');
  });

  test('an unrecognised price never grants a plan', async () => {
    const user = await prisma.user.create({
      data: { email: `price-${randomUUID()}@example.test`, name: 'Price Test', passwordHash: 'x' },
    });
    createdUserIds.push(user.id);

    const body = JSON.stringify(subscriptionEvent({
      eventId: 'evt_test_unknown_price',
      eventType: 'subscription.activated',
      userId: user.id,
      subscriptionId: `sub_${randomUUID().slice(0, 10)}`,
      status: 'active',
      priceId: 'pri_not_configured',
      customerId: `ctm_price_${randomUUID().slice(0, 8)}`,
    }));

    const verified = await verifyPaddleWebhook(body, sign(body));
    assert.ok(verified);
    await handlePaddleEvent(verified.event);

    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
    assert.equal(subscription?.plan, 'FREE', 'an unknown price must not upgrade anyone');
  });
});
