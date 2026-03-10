-- Migration: Add graded card columns to collections table
-- Phase B: Pivot to Trade Management

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_graded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grading_company text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS cert_number text,
  ADD COLUMN IF NOT EXISTS slab_notes text,
  ADD COLUMN IF NOT EXISTS external_uid text;

-- Unique index for external identifiers (e.g. "psa:12345678")
-- Only enforced when external_uid is set (partial index)
CREATE UNIQUE INDEX IF NOT EXISTS collections_user_external_uid_unique
  ON public.collections (user_id, external_uid)
  WHERE external_uid IS NOT NULL;

COMMENT ON COLUMN public.collections.is_graded IS 'Whether this card is in a graded slab';
COMMENT ON COLUMN public.collections.grading_company IS 'Grading company: PSA, BGS, CGC, BRG, etc.';
COMMENT ON COLUMN public.collections.grade IS 'Grade value, e.g. "10", "9.5", "Gem Mint"';
COMMENT ON COLUMN public.collections.cert_number IS 'Certification/PSA cert number';
COMMENT ON COLUMN public.collections.slab_notes IS 'Additional notes about the slab condition';
COMMENT ON COLUMN public.collections.external_uid IS 'External identifier, e.g. "psa:12345678"';
