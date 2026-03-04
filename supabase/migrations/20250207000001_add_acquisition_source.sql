-- Add acquisition_source column to collections table
-- This field stores how/where the card was acquired (e.g., "마켓", "교환", "팩 개봉", etc.)

ALTER TABLE public.collections
ADD COLUMN acquisition_source TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.collections.acquisition_source IS 'User-entered source/method of acquisition (e.g., market, trade, pack opening)';
