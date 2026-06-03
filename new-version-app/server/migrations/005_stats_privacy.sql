-- ================================================================
-- Migration 005: Stats privacy flag on user_profiles
-- Run in Supabase Dashboard → SQL Editor
-- ================================================================
--
-- Adds an opt-out privacy switch. When stats_public = false, other players
-- viewing this user's profile (e.g. from Match History → opponent profile)
-- only see avatar + display name + level; the aggregated stats are hidden.
--
-- Default true = public, so existing users keep showing stats unless they
-- turn it off in the Statistics screen.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stats_public boolean NOT NULL DEFAULT true;

-- Note: no RLS changes needed.
--   • Reads for the public-profile endpoint go through the server (service_role,
--     bypasses RLS).
--   • The Statistics screen toggles this column on the user's OWN row, which is
--     already permitted by the existing "profiles_update_own" policy
--     (FOR UPDATE USING auth.uid() = id).
