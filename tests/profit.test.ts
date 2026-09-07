import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfit, DEFAULT_PROFIT_INPUT } from '@/lib/profit';

test('computes revenue, costs and profit for a typical order', () => {
  const result = calculateProfit({
    productCost: 10,
    shippingCost: 5,
    sellingPrice: 50,
    paymentFeePercent: 2.9,
    paymentFeeFixed: 0.3,
    adCostPerOrder: 12,
    platformFeePercent: 0,
    otherExpenses: 1,
    expectedOrders: 100,
  });

  // fees = 50 * 0.029 + 0.30 = 1.75
  assert.equal(result.feesPerOrder, 1.75);
  // profit = 50 - (10 + 5 + 1 + 12 + 1.75)
  assert.equal(result.profitPerOrder, 20.25);
  assert.equal(result.revenue, 5000);
  assert.equal(result.totalProfit, 2025);
  assert.equal(result.adSpend, 1200);
  assert.equal(result.profitMarginPercent, 40.5);
  assert.equal(result.isProfitable, true);
});

test('ROAS and break-even ROAS reflect the ad spend', () => {
  const result = calculateProfit(DEFAULT_PROFIT_INPUT);
  assert.ok(result.roas !== null && result.roas > 0);
  assert.ok(result.breakEvenRoas !== null && result.breakEvenRoas > 1);
  // Break-even ROAS is price divided by contribution before advertising.
  const expected = DEFAULT_PROFIT_INPUT.sellingPrice / result.contributionPerOrder;
  assert.ok(Math.abs((result.breakEvenRoas as number) - expected) < 0.02);
});

test('break-even selling price yields zero profit when applied', () => {
  const input = { ...DEFAULT_PROFIT_INPUT };
  const breakEven = calculateProfit(input).breakEvenSellingPrice;
  assert.ok(breakEven !== null);
  const atBreakEven = calculateProfit({ ...input, sellingPrice: breakEven as number });
  assert.ok(Math.abs(atBreakEven.profitPerOrder) < 0.02);
});

test('ROAS is undefined without advertising spend', () => {
  const result = calculateProfit({ ...DEFAULT_PROFIT_INPUT, adCostPerOrder: 0 });
  assert.equal(result.roas, null);
});

test('a loss-making price is reported as unprofitable rather than clamped', () => {
  const result = calculateProfit({ ...DEFAULT_PROFIT_INPUT, sellingPrice: 5 });
  assert.equal(result.isProfitable, false);
  assert.ok(result.profitPerOrder < 0);
});
