-- ================================================================
-- Migration 004: RLS for game_matches + fix user_daily_tasks policy
-- Run in Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. Fix user_daily_tasks ──────────────────────────────────────────────────
--
-- Migration 001 created a policy: FOR ALL USING (true) without a role
-- restriction. Because service_role bypasses RLS automatically, that policy
-- is unnecessary — and dangerous: it grants every authenticated user full
-- read/write access to ALL rows, not just their own.
-- Drop it, then tighten the SELECT policy to authenticated role only.

DROP POLICY IF EXISTS "service role full access daily tasks" ON user_daily_tasks;

DROP POLICY IF EXISTS "users read own daily tasks" ON user_daily_tasks;
CREATE POLICY "users read own daily tasks"
  ON user_daily_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 2. Enable RLS on game_matches ────────────────────────────────────────────
--
-- All writes come from the server via service_role (bypasses RLS).
-- Clients only ever read through the server API, but as defense-in-depth
-- we allow SELECT for a user's own matches only.

ALTER TABLE game_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own matches" ON game_matches;
CREATE POLICY "users read own matches"
  ON game_matches FOR SELECT
  TO authenticated
  USING (
    auth.uid() = player1_id
    OR auth.uid() = player2_id
  );

-- No INSERT/UPDATE/DELETE policies for authenticated → direct client writes blocked.
-- Service_role (server) bypasses RLS and can still write freely.
