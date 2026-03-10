-- Migration: Create fee_rules table + seed eBay default rules
-- Purpose: Rule-based fee calculation (avoids hardcoding)
-- Phase B: Pivot to Trade Management

CREATE TABLE IF NOT EXISTS public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL
    CHECK (platform IN ('ebay', 'bunjang', 'danggeun', 'other')),
  category text NOT NULL DEFAULT 'trading_cards',
  rule_type text NOT NULL
    CHECK (rule_type IN ('final_value', 'final_value_overage', 'payment', 'international', 'fixed')),

  -- Fee components (apply rate first, then add fixed_amount per transaction)
  rate numeric(6,4) NOT NULL DEFAULT 0,         -- 비율 (0.1325 = 13.25%)
  fixed_amount numeric(10,2) NOT NULL DEFAULT 0, -- 건당 고정 금액
  currency text NOT NULL DEFAULT 'USD',

  -- Validity period (null valid_to = currently active)
  valid_from date NOT NULL,
  valid_to date,

  -- Threshold for tiered rates (e.g., $7,500 for eBay)
  threshold_amount numeric(10,2),

  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS fee_rules_platform_idx ON public.fee_rules (platform, category);
CREATE INDEX IF NOT EXISTS fee_rules_valid_idx ON public.fee_rules (valid_from, valid_to);

-- RLS: fee_rules are read-only for all authenticated users (shared reference data)
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fee rules"
  ON public.fee_rules FOR SELECT
  TO authenticated
  USING (true);

-- Seed: eBay Trading Cards fee rules (effective 2024)
-- Source: https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees
INSERT INTO public.fee_rules (platform, category, rule_type, rate, fixed_amount, currency, valid_from, threshold_amount, notes)
VALUES
  -- Final Value Fee: 13.25% on first $7,500
  ('ebay', 'trading_cards', 'final_value', 0.1325, 0, 'USD', '2024-01-01', 7500.00,
   'eBay final value fee 13.25% on amount up to $7,500'),

  -- Final Value Fee: 2.35% on amount over $7,500
  ('ebay', 'trading_cards', 'final_value_overage', 0.0235, 0, 'USD', '2024-01-01', 7500.00,
   'eBay final value fee 2.35% on amount over $7,500'),

  -- Fixed fee per order: $0.30
  ('ebay', 'trading_cards', 'fixed', 0, 0.30, 'USD', '2024-01-01', NULL,
   'eBay fixed fee $0.30 per order'),

  -- International fee: 1.65% for non-US buyers
  ('ebay', 'trading_cards', 'international', 0.0165, 0, 'USD', '2024-01-01', NULL,
   'eBay international fee 1.65% for non-US buyers');

COMMENT ON TABLE public.fee_rules IS 'Platform fee rules for net payout calculation. Read-only shared reference data.';
