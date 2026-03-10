-- Migration: Create sales table
-- Purpose: Record completed sales and settlement calculations
-- Phase B: Pivot to Trade Management

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,

  -- Sale amounts
  sold_price numeric(10,2) NOT NULL,
  shipping_charged numeric(10,2) NOT NULL DEFAULT 0, -- 구매자에게 받은 배송비
  shipping_cost numeric(10,2) NOT NULL DEFAULT 0,    -- 내가 실제 낸 배송비

  -- Fees (all in listing currency)
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  payment_fee numeric(10,2) NOT NULL DEFAULT 0,
  international_fee numeric(10,2) NOT NULL DEFAULT 0,
  tax_withheld numeric(10,2) NOT NULL DEFAULT 0,

  -- Computed net payout (stored for fast queries)
  -- net_payout = sold_price + shipping_charged - shipping_cost
  --              - platform_fee - payment_fee - international_fee - tax_withheld
  net_payout numeric(10,2),

  -- Settlement metadata
  sold_at timestamptz NOT NULL DEFAULT now(),
  buyer_region text
    CHECK (buyer_region IN ('domestic', 'us', 'jp', 'eu', 'other')),

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS sales_user_id_idx ON public.sales (user_id);
CREATE INDEX IF NOT EXISTS sales_listing_id_idx ON public.sales (listing_id);
CREATE INDEX IF NOT EXISTS sales_sold_at_idx ON public.sales (user_id, sold_at DESC);

-- RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sales"
  ON public.sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.sales IS 'Completed sale settlements with net payout calculation';
COMMENT ON COLUMN public.sales.net_payout IS 'sold_price + shipping_charged - shipping_cost - platform_fee - payment_fee - international_fee - tax_withheld';
