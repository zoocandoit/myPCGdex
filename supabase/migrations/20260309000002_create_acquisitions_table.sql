-- Migration: Create acquisitions table
-- Purpose: Track card purchases and purchase candidates (deal inbox)
-- Phase B: Pivot to Trade Management

CREATE TABLE IF NOT EXISTS public.acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,

  -- Status: candidate (링크만 등록) → bought (매입 확정) → canceled
  status text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'bought', 'canceled')),

  -- Source platform
  source_platform text
    CHECK (source_platform IN ('danggeun', 'bunjang', 'offline', 'friend', 'ebay', 'other')),
  source_url text,

  -- Pricing
  asking_price numeric(10,2),
  negotiated_price numeric(10,2),
  fees_cost numeric(10,2) DEFAULT 0, -- 택배비/수수료/그레이딩비 등 매입 부대비용

  -- Notes & attachments
  notes text,
  screenshot_path text, -- Supabase Storage path for screenshot

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS acquisitions_user_id_idx ON public.acquisitions (user_id);
CREATE INDEX IF NOT EXISTS acquisitions_status_idx ON public.acquisitions (user_id, status);
CREATE INDEX IF NOT EXISTS acquisitions_collection_id_idx ON public.acquisitions (collection_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_acquisitions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER acquisitions_updated_at_trigger
  BEFORE UPDATE ON public.acquisitions
  FOR EACH ROW EXECUTE FUNCTION public.update_acquisitions_updated_at();

-- RLS
ALTER TABLE public.acquisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acquisitions"
  ON public.acquisitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acquisitions"
  ON public.acquisitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own acquisitions"
  ON public.acquisitions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own acquisitions"
  ON public.acquisitions FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.acquisitions IS 'Card purchase records and purchase candidates (deal inbox)';
