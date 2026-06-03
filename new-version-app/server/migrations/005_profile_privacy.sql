-- ================================================================
-- Migration 005: Profile privacy flag
-- Run in Supabase SQL Editor AFTER migration 004
--
-- Adds `allow_viewing_info` to user_profiles. When FALSE, other
-- players viewing this user's profile (from match history) see only
-- avatar, name and level — detailed statistics are withheld by the
-- server (see getPublicProfile in server/supabase-server.ts).
-- The owner always sees their own full stats.
-- ================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS allow_viewing_info boolean NOT NULL DEFAULT true;
