import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordSchema, signupSchema } from '@/lib/validation/auth';
import { productUrlSchema } from '@/lib/validation/common';
import { profitCalculateSchema } from '@/lib/validation/tools';

test('passwords must be long enough and mix letters with numbers', () => {
  assert.equal(passwordSchema.safeParse('short1').success, false);
  assert.equal(passwordSchema.safeParse('alllettersonly').success, false);
  assert.equal(passwordSchema.safeParse('1234567890').success, false);
  assert.equal(passwordSchema.safeParse('correct-horse-9').success, true);
});

test('signup normalises the email address', () => {
  const result = signupSchema.parse({ name: '  Ada  ', email: '  ADA@Example.COM ', password: 'password123' });
  assert.equal(result.email, 'ada@example.com');
  assert.equal(result.name, 'Ada');
});

test('only http(s) product URLs are accepted', () => {
  assert.equal(productUrlSchema.safeParse('https://example.com/p/1').success, true);
  assert.equal(productUrlSchema.safeParse('http://example.com').success, true);
  assert.equal(productUrlSchema.safeParse('javascript:alert(1)').success, false);
  assert.equal(productUrlSchema.safeParse('data:text/html,<script>').success, false);
  assert.equal(productUrlSchema.safeParse('not a url').success, false);
});

test('profit inputs reject negative money values', () => {
  const base = {
    productCost: 1,
    shippingCost: 1,
    sellingPrice: 10,
    paymentFeePercent: 2.9,
    paymentFeeFixed: 0.3,
    adCostPerOrder: 1,
    platformFeePercent: 0,
    otherExpenses: 0,
    expectedOrders: 10,
  };
  assert.equal(profitCalculateSchema.safeParse(base).success, true);
  assert.equal(profitCalculateSchema.safeParse({ ...base, productCost: -5 }).success, false);
  assert.equal(profitCalculateSchema.safeParse({ ...base, expectedOrders: 1.5 }).success, false);
});
