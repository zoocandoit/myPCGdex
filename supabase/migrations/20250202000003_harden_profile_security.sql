-- Phase 2 Security Hardening
-- This migration adds additional security measures for profiles table

-- ============================================================================
-- 1. Block direct INSERT to profiles table
-- ============================================================================
-- Profiles should only be created via the handle_new_user() trigger
-- This policy explicitly denies direct INSERT operations

CREATE POLICY "Block direct insert to profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (false);

-- Note: The trigger uses SECURITY DEFINER and bypasses RLS,
-- so this policy only blocks client-side INSERT attempts

-- ============================================================================
-- 2. Auto-update updated_at timestamp on UPDATE
-- ============================================================================

-- Generic function to set updated_at to current timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply trigger to profiles table
CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add documentation
COMMENT ON FUNCTION public.set_updated_at() IS 'Generic trigger function to auto-update updated_at column';

-- ============================================================================
-- 3. Verify handle_new_user() security settings
-- ============================================================================
-- The existing function already has:
-- - SECURITY DEFINER: Executes with owner privileges (bypasses RLS)
-- - SET search_path = public: Prevents search_path manipulation attacks
--
-- Re-create with explicit security settings for documentation
-- This is idempotent (CREATE OR REPLACE)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile record when a new user signs up. Uses SECURITY DEFINER to bypass RLS.';
