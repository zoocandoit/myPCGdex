-- Add card_name column to acquisitions for tracking what card is being considered
ALTER TABLE public.acquisitions
  ADD COLUMN IF NOT EXISTS card_name text;

COMMENT ON COLUMN public.acquisitions.card_name IS '매입 대상 카드명 (예: 피카츄 ex, 리자몽 SAR)';
