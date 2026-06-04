# 🐛 Debugging Login Error: "Database error querying schema"

## Problem
Khi người dùng nhập email/mật khẩu và nhấn **Đăng Nhập**, app hiển thị lỗi "Database error querying schema"

## Root Causes

### 1️⃣ **Trigger Function Failing Silently**
Khi user sign up qua Supabase Auth, trigger `on_auth_user_created` chạy:
```
auth.users (created) → trigger → insert user_profiles
```

Nếu trigger fail, quá trình auth vẫn thành công nhưng app sau này crash khi query user_profiles.

### 2️⃣ **RLS Policies Blocking Trigger**
Trigger cần INSERT vào `user_profiles`, nhưng nếu RLS policy không cho phép, trigger sẽ fail.

### 3️⃣ **Missing Error Handling**
App không catch database errors, nên crash khi query user_profiles.

## Quick Fixes ✅

### Fix 1: Update Trigger (Handle Errors Gracefully)
Chạy trong Supabase SQL Editor:
```sql
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

**Điều này làm:**
- ✅ Trigger không fail khi error
- ✅ Lỗi được log vào Supabase logs
- ✅ User vẫn có thể đăng nhập

### Fix 2: Ensure RLS Policies Allow Trigger
```sql
-- The trigger runs as SECURITY DEFINER, so it needs explicit policy
DROP POLICY IF EXISTS "profiles_service_role" ON public.user_profiles;
CREATE POLICY "profiles_service_role" ON public.user_profiles
  FOR ALL USING (true);
```

### Fix 3: Code Updated ✅
Đã cập nhật các file:
- `auth-context.tsx` - Better error logging
- `HomeScreen.tsx` - Error handling
- `ProfileScreen.tsx` - Error handling
- `LeaderboardScreen.tsx` - Error handling

---

## How to Debug

### Step 1: Check if User Created Successfully
Sau khi login fail, check `auth.users` table trong Supabase:
```sql
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

**Kết quả:**
- ✅ Nếu thấy user → Auth thành công, lỗi ở database query
- ❌ Nếu không thấy → Login fail ở step auth

### Step 2: Check if Trigger Created Profile
```sql
SELECT id, display_name, ranking_points, created_at 
FROM public.user_profiles 
ORDER BY created_at DESC LIMIT 1;
```

**Kết quả:**
- ✅ Nếu thấy profile → Trigger thành công
- ❌ Nếu không → Trigger fail

### Step 3: Check Supabase Logs
Vào **Supabase Dashboard** → **Logs** → Filter theo user email để xem error messages

### Step 4: Test Query Permissions
```sql
-- Test if current user can query their own profile
SELECT * FROM public.user_profiles WHERE id = auth.uid();

-- Test if insert works
INSERT INTO public.user_profiles (id, display_name, ranking_points)
VALUES (auth.uid(), 'Test User', 0);
```

---

## Common Errors & Solutions

| Error | Nguyên nhân | Giải pháp |
|-------|-----------|----------|
| `new row violates row-level security policy` | RLS policy không allow INSERT | Add INSERT policy |
| `permission denied for schema public` | Trigger không có quyền | Add SECURITY DEFINER |
| `relation "user_profiles" does not exist` | Schema chưa chạy | Run supabase_schema.sql |
| `Database error querying schema` | Trigger fail, profile not created | Run Fix 1 trigger |

---

## Testing Flow

### ✅ Correct Flow:
```
1. User enters email/password
2. Click Đăng Nhập
3. Auth success → user created in auth.users
4. Trigger fires → creates user_profiles row
5. App navigates to HomeScreen
6. HomeScreen queries user_profiles → SUCCESS
```

### ❌ Current (Broken) Flow:
```
1. User enters email/password
2. Click Đăng Nhập
3. Auth success → user created in auth.users
4. Trigger fires BUT FAILS → no user_profiles row
5. App navigates to HomeScreen
6. HomeScreen queries user_profiles → ERROR
```

---

## After Applying Fixes

### 1. Run SQL in Supabase
```
Go to: Supabase Dashboard → SQL Editor
Paste: The Fix 1 trigger function above
Execute
```

### 2. Clear App Data
```
Expo Go: Swipe left on app → Delete
```

### 3. Rebuild and Test
```bash
npm start
# Or: npm run dev
```

### 4. Try Login
- Email: `admin@mathup.dev`
- Password: `admin123`

---

## What Each Table Does

| Table | Người quản lý | Dùng cho |
|-------|-----------|----------|
| `auth.users` | Supabase Auth | Authentication, sessions, passwords |
| `public.user_profiles` | App (via trigger) | Ranking points, display name, avatar |
| `public.users` | ❌ NOT USED | Deprecated - remove later |

**Key Point:** Your app uses `auth.users` + `user_profiles`, NOT the custom `public.users` table.

---

## RLS Policy Explained

```sql
-- Anyone can READ profiles (for leaderboard)
CREATE POLICY "profiles_select_all" ON public.user_profiles
  FOR SELECT USING (true);

-- Each user can UPDATE their own profile
CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Each user can INSERT their own profile
CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger can bypass RLS (runs as SECURITY DEFINER)
CREATE POLICY "profiles_service_role" ON public.user_profiles
  FOR ALL USING (true);
```

---

## Next Steps

1. ✅ Update trigger function (Fix 1)
2. ✅ Verify RLS policies (Fix 2)
3. ✅ Code already updated (Fix 3)
4. ✅ Clear app cache
5. ✅ Test login
6. ✅ Check Supabase logs if still failing

Still having issues? Enable debug mode in `.env`:
```
EXPO_PUBLIC_DEBUG=true
```

Then check console output for detailed error messages.
