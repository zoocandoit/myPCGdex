-- Create pending_cards table for queue system
-- Cards waiting for AI analysis when daily limit is exceeded

CREATE TABLE IF NOT EXISTS public.pending_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Images (required front, optional back)
  front_image_path TEXT NOT NULL,
  back_image_path TEXT,

  -- Queue metadata
  queued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on table
COMMENT ON TABLE public.pending_cards IS 'Cards waiting for AI analysis when daily limit exceeded';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pending_cards_user_id ON public.pending_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_cards_status ON public.pending_cards(status);
CREATE INDEX IF NOT EXISTS idx_pending_cards_queued_at ON public.pending_cards(queued_at ASC);

-- Enable Row Level Security
ALTER TABLE public.pending_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own pending cards
CREATE POLICY "Users can view own pending cards"
  ON public.pending_cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending cards"
  ON public.pending_cards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending cards"
  ON public.pending_cards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending cards"
  ON public.pending_cards FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
