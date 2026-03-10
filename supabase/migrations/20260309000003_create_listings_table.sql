-- Migration: Create listings table
-- Purpose: Track sale listings on eBay, Bunjang, etc.
-- Phase B: Pivot to Trade Management

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE RESTRICT,

  -- Status lifecycle: draft → active → (ended | sold | canceled)
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'ended', 'sold', 'canceled')),

  -- Platform info
  platform text NOT NULL
    CHECK (platform IN ('ebay', 'bunjang', 'danggeun', 'other')),
  listing_url text,
  title text,

  -- Pricing
  listed_price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'KRW'
    CHECK (currency IN ('KRW', 'USD', 'JPY')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Timing
  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS listings_user_id_idx ON public.listings (user_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings (user_id, status);
CREATE INDEX IF NOT EXISTS listings_collection_id_idx ON public.listings (collection_id);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON public.listings (user_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_listings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_updated_at_trigger
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_listings_updated_at();

-- RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.listings IS 'Sale listings on eBay, Bunjang, etc.';
