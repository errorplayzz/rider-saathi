# 🔧 FIX REGISTRATION ERROR - Quick Guide

## Problem
Registration fails with error: **"Database error saving new user"**

## Solution (2 minutes)

### Step 1: Open Supabase
1. Go to your Supabase Dashboard
2. Click on "SQL Editor"

### Step 2: Run the Fix
1. Copy **ALL** contents from: `sql_backups/COMPLETE_REGISTRATION_FIX.sql`
2. Paste into Supabase SQL Editor
3. Click **Run**
4. Wait for completion message

### Step 3: Test Registration
1. Open your app
2. Try registering a new user
3. Should work now! ✅

---

## What This Fixes

✅ **Trigger Conflicts** - Removes conflicting achievement triggers  
✅ **Profile Creation** - Ensures profiles are created correctly  
✅ **Error Handling** - Adds fallback logic to prevent registration blocks  
✅ **RLS Policies** - Updates security policies  
✅ **Missing Columns** - Adds any missing profile columns  

---

## Verification

After running the SQL, you should see:
```
✅ Registration trigger is active
✅ Profiles table has X users
✅ REGISTRATION FIX COMPLETE
```

---

## Still Having Issues?

### Check Supabase Logs:
1. Dashboard → Database → Logs
2. Look for errors during registration

### Check Browser Console:
1. Open DevTools (F12)
2. Try registering
3. Look for error messages

### Common Issues:

**Issue:** Email already exists  
**Fix:** Use a different email or delete existing user

**Issue:** 406 Error  
**Fix:** This is usually a different issue (headers/CORS). The 500 error should be fixed.

**Issue:** Still getting 500 error  
**Fix:** 
1. Check Supabase logs for specific error
2. Verify `auth.users` table exists
3. Verify `public.profiles` table exists

---

## Alternative: Manual Profile Creation

If automated trigger doesn't work, you can manually create profiles:

```sql
-- After user registers, manually create their profile
INSERT INTO public.profiles (id, email, name, created_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

---

## Test Registration

Try registering with:
- **Phone:** 9876543210
- **Name:** Test User
- **Password:** test123456

Should work without errors! 🎉
