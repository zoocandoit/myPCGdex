-- Remove OpenAI API key column from profiles table
-- API keys are now managed server-side only

-- Drop the column if it exists
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS openai_api_key;
