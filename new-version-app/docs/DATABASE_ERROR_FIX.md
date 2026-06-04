# 🔧 Fix for "Database Error Querying Schema" During Login

## Problem
When logging in via Expo Go, you see: `Database error querying schema`

This happens because:
1. **RLS (Row-Level Security) policies are incomplete** - the app queries `user_profiles` table but policies don't allow the INSERT/UPDATE operations needed when the trigger tries to create a user profile
2. **No error handling** - the app crashes on database errors instead of gracefully handling them

## Solution

### Step 1: Update RLS Policies in Supabase
Go to your **Supabase Dashboard** → **SQL Editor** and run this script to add proper RLS policies:

```sql
-- UPDATE existing RLS policies to allow user operations

-- Allow all SELECT (read) on profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.user_profiles;
CREATE POLICY "profiles_select_all" ON public.user_profiles
  FOR SELECT USING (true);

-- Allow users to UPDATE their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.user_profiles;
CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to INSERT their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.user_profiles;
CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Match insert/select policies
DROP POLICY IF EXISTS "matches_insert_auth" ON public.game_matches;
CREATE POLICY "matches_insert_auth" ON public.game_matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
```

### Step 2: Already Done ✅
The app code has been updated to handle errors gracefully:
- ✅ HomeScreen - catches ranking points errors
- ✅ ProfileScreen - catches ranking points errors  
- ✅ LeaderboardScreen - catches leaderboard load errors

### Step 3: Test the Fix
1. Clear app data: In Expo Go, swipe left on your app and delete
2. Re-run the app: `npm start`
3. Try logging in again
4. Check Metro bundler console for any remaining errors

## Troubleshooting

### Still seeing "Database error querying schema"?

**Option 1: Check RLS Policies**
```sql
-- Verify policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('user_profiles', 'game_matches');
```

**Option 2: Temporarily Disable RLS (Development Only)**
⚠️ **Warning:** Only for development/testing!
```sql
-- Temporarily disable RLS to test if that's the issue
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;
```

**Option 3: Check Trigger Logs**
```sql
-- Verify the trigger function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check if trigger is active
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'auth.users';
```

## What Each Change Does

### RLS Policies
- **`profiles_select_all`**: Anyone can read profiles (for leaderboard)
- **`profiles_insert_own`**: Users can create their own profile (triggered on sign up)
- **`profiles_update_own`**: Users can update their own profile (points, name)
- **`matches_insert_auth`**: Only players in the match can create match records

### Error Handling
- Catches database errors instead of crashing
- Logs errors to console for debugging
- Falls back to default values (0 points, etc.)
- Allows app to continue functioning

## Files Modified
- ✅ `supabase_schema.sql` - Updated RLS policies
- ✅ `client/src/screens/HomeScreen.tsx` - Added error handling
- ✅ `client/src/screens/ProfileScreen.tsx` - Added error handling
- ✅ `client/src/screens/LeaderboardScreen.tsx` - Added error handling

## Next Steps
After login works, test these features:
1. ✅ Home screen loads ranking points
2. ✅ Profile screen shows stats
3. ✅ Leaderboard screen shows top players
4. ✅ Can submit game results (updates ranking)

## Production Considerations
- Keep RLS enabled in production (security)
- Use Row Level Security policies (not disabled)
- Monitor logs for permission errors
- Test all user roles (student, teacher, admin)
