import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requirePlan, requireFeature } from '@/lib/billing/guards';
import { entitlementIsActive, mapPaddleStatus } from '@/lib/billing/subscription-state';
import { AppError } from '@/lib/errors';
import type { CurrentUser } from '@/lib/auth/current-user';

function userOn(plan: 'FREE' | 'PRO' | 'BUSINESS'): CurrentUser {
  return {
    id: 'u1',
    email: 'a@b.co',
    name: 'A',
    avatarUrl: null,
    role: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    createdAt: new Date(),
    plan,
    entitlements: {} as CurrentUser['entitlements'],
  };
}

function expectThrows(fn: () => void, code: string) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof AppError, 'expected an AppError');
    assert.equal(error.code, code);
    assert.equal(error.status, 403);
    return error;
  }
  assert.fail(`expected ${code} to be thrown`);
}

test('a Free user is refused a Pro-only capability with PRO_PLAN_REQUIRED', () => {
  expectThrows(() => requirePlan(userOn('FREE'), 'PRO'), 'PRO_PLAN_REQUIRED');
  expectThrows(() => requireFeature(userOn('FREE'), 'competitorAnalysis'), 'PRO_PLAN_REQUIRED');
  expectThrows(() => requireFeature(userOn('FREE'), 'export'), 'PRO_PLAN_REQUIRED');
  expectThrows(() => requireFeature(userOn('FREE'), 'ads'), 'PRO_PLAN_REQUIRED');
});

test('a Pro user passes Pro gates and is refused Business-only ones', () => {
  assert.doesNotThrow(() => requirePlan(userOn('PRO'), 'PRO'));
  assert.doesNotThrow(() => requireFeature(userOn('PRO'), 'competitorAnalysis'));
  assert.doesNotThrow(() => requireFeature(userOn('PRO'), 'export'));
  expectThrows(() => requirePlan(userOn('PRO'), 'BUSINESS'), 'BUSINESS_PLAN_REQUIRED');
  expectThrows(() => requireFeature(userOn('PRO'), 'apiAccess'), 'BUSINESS_PLAN_REQUIRED');
});

test('a Business user passes every gate', () => {
  assert.doesNotThrow(() => requirePlan(userOn('BUSINESS'), 'PRO'));
  assert.doesNotThrow(() => requirePlan(userOn('BUSINESS'), 'BUSINESS'));
  assert.doesNotThrow(() => requireFeature(userOn('BUSINESS'), 'apiAccess'));
  assert.doesNotThrow(() => requireFeature(userOn('BUSINESS'), 'team'));
});

test('keyword research stays available on Free', () => {
  assert.doesNotThrow(() => requireFeature(userOn('FREE'), 'keywords'));
});

test('the refusal never leaks a way to bypass it', () => {
  const error = expectThrows(() => requirePlan(userOn('FREE'), 'PRO'), 'PRO_PLAN_REQUIRED');
  const details = (error as AppError).details as Record<string, unknown>;
  assert.equal(details.requiredPlan, 'PRO');
  assert.equal(details.currentPlan, 'FREE');
  assert.ok(!/token|secret|key/i.test(JSON.stringify(details)));
});

test('Paddle statuses map onto the local enum', () => {
  assert.equal(mapPaddleStatus('active'), 'ACTIVE');
  assert.equal(mapPaddleStatus('trialing'), 'TRIALING');
  assert.equal(mapPaddleStatus('past_due'), 'PAST_DUE');
  assert.equal(mapPaddleStatus('paused'), 'PAUSED');
  assert.equal(mapPaddleStatus('canceled'), 'CANCELED');
});

test('a cancelled subscription keeps access until the paid period ends', () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 1000);

  assert.equal(
    entitlementIsActive({ status: 'CANCELED', currentPeriodEnd: future, endedAt: null }),
    true,
    'cancelled but still inside the paid period keeps access',
  );
  assert.equal(
    entitlementIsActive({ status: 'CANCELED', currentPeriodEnd: past, endedAt: null }),
    false,
    'access ends once the paid period is over',
  );
});

test('past due keeps access while Paddle retries, paused does not', () => {
  const future = new Date(Date.now() + 86_400_000);
  assert.equal(entitlementIsActive({ status: 'PAST_DUE', currentPeriodEnd: future, endedAt: null }), true);
  assert.equal(entitlementIsActive({ status: 'PAUSED', currentPeriodEnd: future, endedAt: null }), false);
});

test('an ended subscription is never active, whatever the status says', () => {
  const future = new Date(Date.now() + 86_400_000);
  assert.equal(
    entitlementIsActive({ status: 'ACTIVE', currentPeriodEnd: future, endedAt: new Date(Date.now() - 1) }),
    false,
  );
});
