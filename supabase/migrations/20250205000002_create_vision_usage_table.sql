-- Vision API daily usage tracking table
-- Tracks how many times a user has used Vision AI per day (limit: 5/day)

CREATE TABLE public.vision_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one row per user per day
  CONSTRAINT vision_usage_user_date_unique UNIQUE (user_id, usage_date)
);

-- Create index for fast lookups
CREATE INDEX idx_vision_usage_user_date ON public.vision_usage(user_id, usage_date);

-- Enable RLS
ALTER TABLE public.vision_usage ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage
CREATE POLICY "Users can view own vision usage"
  ON public.vision_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own usage (for upsert)
CREATE POLICY "Users can insert own vision usage"
  ON public.vision_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update own vision usage"
  ON public.vision_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_vision_usage_updated_at
  BEFORE UPDATE ON public.vision_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE public.vision_usage IS 'Tracks daily Vision AI usage per user (limit: 5/day)';
COMMENT ON COLUMN public.vision_usage.usage_count IS 'Number of Vision API calls made on this date';
