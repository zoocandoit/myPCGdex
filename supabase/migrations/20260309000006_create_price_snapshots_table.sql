-- Migration: Create price_snapshots table
-- Purpose: Track market price history per card for unrealized PnL and graphs
-- Phase B: Pivot to Trade Management

CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  market_price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'KRW'
    CHECK (currency IN ('KRW', 'USD', 'JPY')),

  -- Source of price data
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('tcg_api', 'ebay_comps', 'manual')),

  captured_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS price_snapshots_collection_id_idx
  ON public.price_snapshots (collection_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS price_snapshots_user_id_idx
  ON public.price_snapshots (user_id, captured_at DESC);

-- RLS
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price snapshots"
  ON public.price_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price snapshots"
  ON public.price_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price snapshots"
  ON public.price_snapshots FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.price_snapshots IS 'Historical market price snapshots per card for unrealized PnL and trend graphs';
