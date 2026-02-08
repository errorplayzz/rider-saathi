-- Backup of original ADD_BIKE_COLUMNS_AND_POLICY.sql
-- (This is a backup copy moved from repository root)

-- Add bike detail columns (safe: IF NOT EXISTS)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bike_model TEXT,
  ADD COLUMN IF NOT EXISTS bike_year INTEGER,
  ADD COLUMN IF NOT EXISTS bike_color TEXT;

-- Enable RLS if not enabled (this is idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to update their own profile
-- (adjust schema name if your profiles table lives in another schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'profiles' AND p.policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own
      ON public.profiles
      FOR UPDATE
      -- Note: `profiles.id` is a UUID in this project; `auth.uid()` returns text, so cast to UUID
      USING (auth.uid()::uuid = id)
      WITH CHECK (auth.uid()::uuid = id);
  END IF;
END$$;

-- Policy: allow authenticated users to insert their own profile (if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'profiles' AND p.policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own
      ON public.profiles
      FOR INSERT
      -- cast auth.uid() to UUID to match `profiles.id` type
      WITH CHECK (auth.uid()::uuid = id);
  END IF;
END$$;

-- Grant usage on sequences if needed (rare for UUID PKs)
-- If your `id` is UUID handled by auth, nothing more is needed.

-- Quick verification query you can run after applying the SQL:
-- SELECT id, name, bike_model, bike_year, bike_color FROM public.profiles WHERE id = auth.uid();

-- NOTE: This project stores bike information under the `bike_details` JSONB column in
-- `supabase/schema.sql`. Adding separate columns `bike_model`, `bike_year`, and
-- `bike_color` is still supported (above), but you may prefer to use `bike_details`
-- instead to keep the schema single-sourced. To check whether the new columns exist
-- run:
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name IN ('bike_model','bike_year','bike_color');
