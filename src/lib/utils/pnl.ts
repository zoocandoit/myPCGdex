import type { FeeRule, RealizedPnL, UnrealizedPnL, CostBasis } from "@/lib/types/trade";

// ─── Net Payout Calculation ────────────────────────────────────────────────────

export interface NetPayoutParams {
  sold_price: number;
  shipping_charged: number;
  shipping_cost: number;
  platform_fee: number;
  payment_fee: number;
  international_fee: number;
  tax_withheld: number;
}

/**
 * Calculate net payout from a completed sale.
 * net_payout = (sold_price + shipping_charged) - shipping_cost
 *              - platform_fee - payment_fee - international_fee - tax_withheld
 */
export function calculateNetPayout(params: NetPayoutParams): number {
  const {
    sold_price,
    shipping_charged,
    shipping_cost,
    platform_fee,
    payment_fee,
    international_fee,
    tax_withheld,
  } = params;

  return (
    sold_price +
    shipping_charged -
    shipping_cost -
    platform_fee -
    payment_fee -
    international_fee -
    tax_withheld
  );
}

// ─── eBay Fee Calculator ───────────────────────────────────────────────────────

export interface EbayPayoutParams {
  soldPrice: number;
  shippingCharged: number;
  shippingCost: number;
  isInternational: boolean;
  /** Pass fee_rules from DB; falls back to hardcoded defaults if not provided */
  rules?: FeeRule[];
}

export interface EbayPayoutBreakdown {
  grossRevenue: number;
  finalValueFee: number;
  fixedFee: number;
  internationalFee: number;
  shippingNet: number;
  totalFees: number;
  netPayout: number;
}

/** Default eBay trading card fee rules (2024) — used if DB rules unavailable */
const DEFAULT_EBAY_RULES = {
  finalValueRate: 0.1325,
  finalValueOverageRate: 0.0235,
  finalValueThreshold: 7500,
  fixedFeePerOrder: 0.3,
  internationalRate: 0.0165,
};

/**
 * Calculate eBay net payout with fee breakdown.
 *
 * eBay fee structure (trading_cards, 2024):
 *   - Final Value Fee: 13.25% on first $7,500
 *   - Final Value Fee: 2.35% on amount over $7,500
 *   - Fixed: $0.30 per order
 *   - International: +1.65% for non-US buyers
 *
 * @example
 * const result = calculateEbayPayout({
 *   soldPrice: 100,
 *   shippingCharged: 5,
 *   shippingCost: 8,
 *   isInternational: true,
 * });
 * // result.netPayout ≈ 84.79
 */
export function calculateEbayPayout(params: EbayPayoutParams): EbayPayoutBreakdown {
  const { soldPrice, shippingCharged, shippingCost, isInternational, rules } = params;

  const grossRevenue = soldPrice + shippingCharged;

  // Resolve rates from DB rules or fall back to defaults
  const rates = resolveEbayRates(rules);

  // Final Value Fee (tiered on grossRevenue)
  let finalValueFee: number;
  if (grossRevenue <= rates.finalValueThreshold) {
    finalValueFee = grossRevenue * rates.finalValueRate;
  } else {
    finalValueFee =
      rates.finalValueThreshold * rates.finalValueRate +
      (grossRevenue - rates.finalValueThreshold) * rates.finalValueOverageRate;
  }

  // Fixed fee per order
  const fixedFee = rates.fixedFeePerOrder;

  // International fee
  const internationalFee = isInternational ? grossRevenue * rates.internationalRate : 0;

  // Net shipping (shipping received - shipping paid)
  const shippingNet = shippingCharged - shippingCost;

  const totalFees = finalValueFee + fixedFee + internationalFee + shippingCost;

  const netPayout = grossRevenue - finalValueFee - fixedFee - internationalFee - shippingCost;

  return {
    grossRevenue,
    finalValueFee: round2(finalValueFee),
    fixedFee: round2(fixedFee),
    internationalFee: round2(internationalFee),
    shippingNet: round2(shippingNet),
    totalFees: round2(totalFees),
    netPayout: round2(netPayout),
  };
}

function resolveEbayRates(rules?: FeeRule[]) {
  if (!rules || rules.length === 0) return DEFAULT_EBAY_RULES;

  const findRate = (type: string) =>
    rules.find((r) => r.rule_type === type)?.rate ?? 0;
  const findFixed = (type: string) =>
    rules.find((r) => r.rule_type === type)?.fixed_amount ?? 0;
  const findThreshold = (type: string) =>
    rules.find((r) => r.rule_type === type)?.threshold_amount ?? 7500;

  return {
    finalValueRate: findRate("final_value") || DEFAULT_EBAY_RULES.finalValueRate,
    finalValueOverageRate: findRate("final_value_overage") || DEFAULT_EBAY_RULES.finalValueOverageRate,
    finalValueThreshold: findThreshold("final_value"),
    fixedFeePerOrder: findFixed("fixed") || DEFAULT_EBAY_RULES.fixedFeePerOrder,
    internationalRate: findRate("international") || DEFAULT_EBAY_RULES.internationalRate,
  };
}

// ─── Cost Basis ────────────────────────────────────────────────────────────────

/**
 * Calculate total cost basis for a card:
 *   total = purchase_price + fees_cost (grading, shipping, etc.)
 */
export function calculateCostBasis(params: {
  purchase_price: number | null;
  fees_cost?: number | null;
}): CostBasis {
  const purchase_price = params.purchase_price ?? 0;
  const fees_cost = params.fees_cost ?? 0;
  return {
    purchase_price,
    fees_cost,
    total: purchase_price + fees_cost,
  };
}

// ─── Realized PnL ─────────────────────────────────────────────────────────────

/**
 * Calculate realized profit/loss from a completed sale.
 */
export function calculateRealizedPnL(params: {
  net_payout: number;
  cost_basis: number;
  gross_revenue: number;
  total_fees: number;
}): RealizedPnL {
  const { net_payout, cost_basis, gross_revenue, total_fees } = params;
  const realized_pnl = net_payout - cost_basis;
  const margin_pct = cost_basis > 0 ? (realized_pnl / cost_basis) * 100 : null;

  return {
    gross_revenue,
    total_fees,
    net_payout,
    cost_basis,
    realized_pnl,
    margin_pct: margin_pct !== null ? round2(margin_pct) : null,
  };
}

// ─── Unrealized PnL ───────────────────────────────────────────────────────────

/**
 * Calculate unrealized profit/loss based on current market price.
 */
export function calculateUnrealizedPnL(params: {
  market_price: number | null;
  cost_basis: number;
}): UnrealizedPnL | null {
  if (params.market_price === null) return null;

  const { market_price, cost_basis } = params;
  const unrealized_pnl = market_price - cost_basis;
  const unrealized_pnl_pct = cost_basis > 0 ? (unrealized_pnl / cost_basis) * 100 : null;

  return {
    market_price,
    cost_basis,
    unrealized_pnl: round2(unrealized_pnl),
    unrealized_pnl_pct: unrealized_pnl_pct !== null ? round2(unrealized_pnl_pct) : null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
