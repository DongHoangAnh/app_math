-- MathUp schema
-- Run once in Supabase SQL Editor to set up the database.

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- User profiles (linked to Supabase Auth)
-- One row per auth user; created automatically by trigger on sign-up.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  avatar_url      text,
  ranking_points  integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1v1 match history
CREATE TABLE IF NOT EXISTS public.game_matches (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id               text        NOT NULL UNIQUE,
  player1_id            uuid        NOT NULL REFERENCES auth.users(id),
  player2_id            uuid        NOT NULL REFERENCES auth.users(id),
  player1_display_name  text,
  player2_display_name  text,
  player1_score         integer     NOT NULL DEFAULT 0,
  player2_score         integer     NOT NULL DEFAULT 0,
  player1_correct       integer     NOT NULL DEFAULT 0,
  player2_correct       integer     NOT NULL DEFAULT 0,
  player1_total_time_ms integer     NOT NULL DEFAULT 0,
  player2_total_time_ms integer     NOT NULL DEFAULT 0,
  winner_id             uuid        REFERENCES auth.users(id),
  questions_count       integer     NOT NULL DEFAULT 10,
  played_at             timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_profiles_ranking  ON public.user_profiles(ranking_points DESC);
CREATE INDEX IF NOT EXISTS idx_game_matches_player1   ON public.game_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_player2   ON public.game_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_played_at ON public.game_matches(played_at DESC);

-- ─── Trigger: auto-create profile on sign-up ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── RPC: update ranking points (atomic upsert) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.update_ranking_points(
  p_user_id    uuid,
  p_delta      integer,
  p_display_name text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points integer;
BEGIN
  INSERT INTO public.user_profiles (id, display_name, ranking_points, updated_at)
  VALUES (
    p_user_id,
    COALESCE(p_display_name, 'Player'),
    GREATEST(0, p_delta),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET ranking_points = GREATEST(0, user_profiles.ranking_points + p_delta),
        updated_at     = now()
  RETURNING ranking_points INTO new_points;
  RETURN new_points;
END;
$$;

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches  ENABLE ROW LEVEL SECURITY;

-- user_profiles
DROP POLICY IF EXISTS "profiles_select_all"    ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_insert_own"    ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_service_role"  ON public.user_profiles;

CREATE POLICY "profiles_select_all"   ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
-- Allows the trigger (SECURITY DEFINER) to insert profiles for new users
CREATE POLICY "profiles_service_role" ON public.user_profiles FOR ALL   USING (true);

-- game_matches
DROP POLICY IF EXISTS "matches_select_all"   ON public.game_matches;
DROP POLICY IF EXISTS "matches_insert_auth"  ON public.game_matches;
DROP POLICY IF EXISTS "matches_server_all"   ON public.game_matches;

CREATE POLICY "matches_select_all"  ON public.game_matches FOR SELECT USING (true);
CREATE POLICY "matches_insert_auth" ON public.game_matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
-- Allows server-side inserts via service role key (explicit bypass for safety)
CREATE POLICY "matches_server_all"  ON public.game_matches FOR ALL USING (true);

-- ─── Backfill: create profiles for users created before this schema ran ───────
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

INSERT INTO public.user_profiles (id, display_name)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
