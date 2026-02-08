-- ============================================
-- FIX REGISTRATION ERROR
-- ============================================
-- This fixes the "Database error saving new user" issue
-- caused by trigger conflicts during registration

-- Step 1: Drop the conflicting achievement trigger
DROP TRIGGER IF EXISTS trigger_auto_initialize_achievements ON public.profiles;

-- Step 2: Recreate the handle_new_user function with achievement initialization
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- First, insert the profile
    INSERT INTO public.profiles (id, email, name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Then, initialize achievements for this user (if the function exists)
    BEGIN
        -- Check if achievement system is set up
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'initialize_user_achievements') THEN
            PERFORM initialize_user_achievements(NEW.id);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If achievement initialization fails, log but don't block user creation
            RAISE WARNING 'Achievement initialization failed for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Fix any existing profiles that don't have achievements initialized
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Check if achievement system is set up
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'initialize_user_achievements') THEN
        -- Initialize achievements for all existing users who don't have them
        FOR user_record IN 
            SELECT DISTINCT p.id 
            FROM public.profiles p
            LEFT JOIN public.achievements a ON a.user_id = p.id
            WHERE a.id IS NULL
        LOOP
            BEGIN
                PERFORM initialize_user_achievements(user_record.id);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Could not initialize achievements for user %', user_record.id;
            END;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that the trigger exists
SELECT 
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- This should show the trigger as enabled ('O' = enabled)
