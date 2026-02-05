-- Collections table for storing user's Pokemon card collection
-- Supports both Vision AI and manual entry

-- Card condition enum
CREATE TYPE card_condition AS ENUM ('mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played');

-- Card language enum
CREATE TYPE card_language AS ENUM ('ko', 'ja', 'en');

-- Input method enum
CREATE TYPE input_method AS ENUM ('vision', 'manual');

CREATE TABLE public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic card info (required, manual/auto)
  pokemon_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  set_id TEXT,
  language card_language NOT NULL DEFAULT 'ko',
  rarity TEXT,

  -- TCG API info (auto only via Vision)
  tcg_card_id TEXT,
  set_name TEXT,
  tcg_image_url TEXT,
  market_price DECIMAL(10, 2),
  artist TEXT,

  -- Collection info (manual only)
  purchase_price DECIMAL(10, 2),
  condition card_condition DEFAULT 'near_mint',
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,

  -- User uploaded images (from scan)
  front_image_path TEXT,
  back_image_path TEXT,

  -- Meta
  input_method input_method NOT NULL DEFAULT 'manual',
  collected_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_pokemon_name ON public.collections(pokemon_name);
CREATE INDEX idx_collections_set_id ON public.collections(set_id);
CREATE INDEX idx_collections_collected_at ON public.collections(collected_at DESC);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own collection
CREATE POLICY "Users can view own collection"
  ON public.collections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert into their own collection
CREATE POLICY "Users can insert own collection"
  ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own collection
CREATE POLICY "Users can update own collection"
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete from their own collection
CREATE POLICY "Users can delete own collection"
  ON public.collections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.collections IS 'User Pokemon card collection with support for Vision AI and manual entry';
COMMENT ON COLUMN public.collections.input_method IS 'How the card was added: vision (AI scan) or manual (user input)';
COMMENT ON COLUMN public.collections.market_price IS 'Market price from TCG API (only set via Vision AI)';
COMMENT ON COLUMN public.collections.purchase_price IS 'User-entered purchase price';
