import { round } from '@/lib/utils';

/**
 * Deterministic unit-economics model shared by the interactive calculator and
 * the `/api/profit/calculate` endpoint, so the client preview and the server
 * result can never disagree. All per-order costs are expressed per order.
 */
export type ProfitInput = {
  /** Cost of goods per unit. */
  productCost: number;
  /** Inbound + outbound shipping per order. */
  shippingCost: number;
  sellingPrice: number;
  /** Payment processing, e.g. 2.9 for 2.9%. */
  paymentFeePercent: number;
  /** Fixed processing fee per transaction, e.g. 0.30. */
  paymentFeeFixed: number;
  /** Advertising cost per order (blended CPA). */
  adCostPerOrder: number;
  /** Marketplace or platform commission, e.g. 15 for 15%. */
  platformFeePercent: number;
  /** Any other per-order cost: packaging, support, returns provision. */
  otherExpenses: number;
  expectedOrders: number;
};

export type ProfitResult = {
  revenue: number;
  totalCosts: number;
  profitPerOrder: number;
  totalProfit: number;
  profitMarginPercent: number;
  /** Total per-order fee amount (payment + platform). */
  feesPerOrder: number;
  adSpend: number;
  roas: number | null;
  breakEvenRoas: number | null;
  breakEvenSellingPrice: number | null;
  /** Margin before advertising — what has to cover ad spend. */
  contributionPerOrder: number;
  isProfitable: boolean;
};

export const DEFAULT_PROFIT_INPUT: ProfitInput = {
  productCost: 8,
  shippingCost: 4.5,
  sellingPrice: 39.99,
  paymentFeePercent: 2.9,
  paymentFeeFixed: 0.3,
  adCostPerOrder: 12,
  platformFeePercent: 0,
  otherExpenses: 1.5,
  expectedOrders: 250,
};

export function calculateProfit(input: ProfitInput): ProfitResult {
  const sellingPrice = Math.max(0, input.sellingPrice);
  const orders = Math.max(0, Math.floor(input.expectedOrders));

  const feeRate = (Math.max(0, input.paymentFeePercent) + Math.max(0, input.platformFeePercent)) / 100;
  const feesPerOrder = sellingPrice * feeRate + Math.max(0, input.paymentFeeFixed);

  const baseCosts =
    Math.max(0, input.productCost) + Math.max(0, input.shippingCost) + Math.max(0, input.otherExpenses);
  const adCost = Math.max(0, input.adCostPerOrder);

  const costPerOrder = baseCosts + adCost + feesPerOrder;
  const profitPerOrder = sellingPrice - costPerOrder;
  const contributionPerOrder = sellingPrice - baseCosts - feesPerOrder;

  const revenue = sellingPrice * orders;
  const totalCosts = costPerOrder * orders;
  const totalProfit = profitPerOrder * orders;
  const adSpend = adCost * orders;

  // ROAS is undefined without ad spend; break-even ROAS is undefined when the
  // order cannot cover its own non-advertising costs at any volume.
  const roas = adSpend > 0 ? revenue / adSpend : null;
  const breakEvenRoas = contributionPerOrder > 0 ? sellingPrice / contributionPerOrder : null;
  const breakEvenSellingPrice =
    feeRate < 1 ? (baseCosts + adCost + Math.max(0, input.paymentFeeFixed)) / (1 - feeRate) : null;

  return {
    revenue: round(revenue),
    totalCosts: round(totalCosts),
    profitPerOrder: round(profitPerOrder),
    totalProfit: round(totalProfit),
    profitMarginPercent: sellingPrice > 0 ? round((profitPerOrder / sellingPrice) * 100, 1) : 0,
    feesPerOrder: round(feesPerOrder),
    adSpend: round(adSpend),
    roas: roas === null ? null : round(roas, 2),
    breakEvenRoas: breakEvenRoas === null ? null : round(breakEvenRoas, 2),
    breakEvenSellingPrice: breakEvenSellingPrice === null ? null : round(breakEvenSellingPrice),
    contributionPerOrder: round(contributionPerOrder),
    isProfitable: profitPerOrder > 0,
  };
}
