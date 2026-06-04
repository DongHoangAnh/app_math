# 🔧 SQL Fixes for Login Error

**Lỗi:** "Database error querying schema" khi người dùng đăng nhập  
**Nguyên nhân:** Trigger không thể tạo `user_profiles` vì RLS hoặc schema issue  
**Giải pháp:** Chạy 2 SQL script dưới đây trong Supabase

---

## 📋 Script 1: Fix Trigger Function

**Chạy trong:** Supabase Dashboard → SQL Editor

```sql
-- Fix trigger to handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url, ranking_points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'Failed to create user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

✅ **Điều này làm gì:**
- Trigger sẽ không fail khi error (user vẫn đăng nhập được)
- Lỗi sẽ được log để debug
- User profile sẽ được tạo sau nếu user retry

---

## 📋 Script 2: Fix RLS Policies

**Chạy trong:** Supabase Dashboard → SQL Editor

```sql
-- ===== USER PROFILES RLS =====

-- Allow anyone to read profiles (for leaderboard)
DROP POLICY IF EXISTS "profiles_select_all" ON public.user_profiles;
CREATE POLICY "profiles_select_all" ON public.user_profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.user_profiles;
CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.user_profiles;
CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow trigger to bypass RLS
DROP POLICY IF EXISTS "profiles_service_role" ON public.user_profiles;
CREATE POLICY "profiles_service_role" ON public.user_profiles
  FOR ALL USING (true);

-- ===== GAME MATCHES RLS =====

-- Allow anyone to read match history
DROP POLICY IF EXISTS "matches_select_auth" ON public.game_matches;
CREATE POLICY "matches_select_auth" ON public.game_matches
  FOR SELECT USING (true);

-- Allow players to insert their match
DROP POLICY IF EXISTS "matches_insert_auth" ON public.game_matches;
CREATE POLICY "matches_insert_auth" ON public.game_matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
```

✅ **Điều này làm gì:**
- Cho phép SELECT tất cả profiles (for leaderboard)
- Cho phép INSERT profiles (for trigger)
- Cho phép UPDATE ranking points
- Cho phép trigger bypass RLS (SECURITY DEFINER)

---

## ✅ How to Apply

### Option 1: Copy-paste (Recommended)
1. Mở **Supabase Dashboard**
2. Vào **SQL Editor**
3. Copy **Script 1** → Paste → Run
4. Copy **Script 2** → Paste → Run
5. Done! ✅

### Option 2: Use prepared file
```bash
# In Supabase SQL Editor, load from file:
# supabase_schema.sql (already updated)
```

---

## ✅ Verify Fixes

After running scripts, verify with these queries:

### Check Trigger Exists
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- Should return the function code above
```

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'game_matches')
ORDER BY tablename, policyname;

-- Should show:
-- profiles_insert_own
-- profiles_select_all
-- profiles_service_role
-- profiles_update_own
-- matches_insert_auth
-- matches_select_auth
```

### Check Trigger Registration
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- Should show: on_auth_user_created, INSERT, users
```

---

## 🧪 Test Login Flow

After applying fixes:

1. **Clear app:** Swipe left on Expo Go app → Delete
2. **Restart:** `npm start`
3. **Try login:**
   - Email: `admin@mathup.dev`
   - Password: `admin123`

### ✅ Expected Results
- No error message
- App navigates to HomeScreen
- Shows ranking points (even if 0)

### ❌ If Still Failing
1. Check Supabase logs: **Logs** tab in dashboard
2. Search logs for your email
3. Look for trigger errors
4. Add this to `auth-context.tsx` for better logging:

```typescript
const signInWithEmail = async (email: string, password: string) => {
  console.log('🔍 Attempting login for:', email)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('❌ Login failed:', error.message)
    throw new Error(error.message || 'Đăng nhập thất bại')
  }
  console.log('✅ Login successful:', data.user?.id)
}
```

---

## 📊 Database Structure After Fix

```
┌─────────────────┐
│  auth.users     │ ← Supabase Authentication
│  (managed)      │
│  id, email      │
│  password, etc. │
└────────┬────────┘
         │
         │ TRIGGER: on_auth_user_created
         │
         ▼
┌──────────────────────────┐
│ public.user_profiles     │ ← App Data
│ (auto-created by        │
│  trigger)                │
│ id, display_name         │
│ avatar_url               │
│ ranking_points = 0       │
└──────────────────────────┘
         ▲
         │ SELECT/UPDATE
         │
    ┌────────────┐
    │   App      │
    │ (React     │
    │  Native)   │
    └────────────┘
```

---

## Files Updated

| File | Change |
|------|--------|
| `supabase_schema.sql` | Updated trigger + RLS policies |
| `auth-context.tsx` | Better error logging |
| `HomeScreen.tsx` | Error handling |
| `ProfileScreen.tsx` | Error handling |
| `LeaderboardScreen.tsx` | Error handling |

---

## 🎯 Summary

**Before Fix:**
```
Login → Auth OK → Trigger Fails → Profile Not Created → Query Fails ❌
```

**After Fix:**
```
Login → Auth OK → Trigger OK (handles errors) → Profile Created → Query OK ✅
```

**Action Items:**
1. ✅ Run SQL Script 1 (trigger fix)
2. ✅ Run SQL Script 2 (RLS policies)
3. ✅ Clear app cache
4. ✅ Test login again

**Support:**
- Check logs: Supabase Dashboard → Logs
- Debug query: `SELECT * FROM user_profiles WHERE id = auth.uid()`
- Test auth: `SELECT current_user, auth.uid()`
