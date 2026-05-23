-- Supabase schema generated from shared/schema.ts
-- Run in Supabase SQL editor or with psql using your project connection string.

-- enable UUID generator (pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  grade text,
  subject text,
  points integer DEFAULT 0,
  streak integer DEFAULT 0,
  level integer DEFAULT 1,
  total_xp integer DEFAULT 0,
  achievements jsonb,
  created_at timestamptz DEFAULT now()
);

-- Assessments
CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  knowledge_map jsonb NOT NULL,
  responses jsonb,
  completed_at timestamptz DEFAULT now()
);

-- Learning paths
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text,
  subject text NOT NULL,
  duration integer NOT NULL,
  topics jsonb NOT NULL,
  priority text,
  progress integer DEFAULT 0,
  estimated_duration text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Game scores
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type text,
  score integer NOT NULL,
  questions_answered integer,
  completed_at timestamptz DEFAULT now()
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  topic text NOT NULL,
  difficulty integer NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON public.learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON public.game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON public.questions(subject, topic);

-- Optional: lightweight search index for users.username
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users(LOWER(username));

-- End of schema

-- ═══════════════════════════════════════════════════════════════════
-- RANKING SYSTEM
-- Run this section in the Supabase SQL editor after the base schema.
-- ═══════════════════════════════════════════════════════════════════

-- User profiles linked to Supabase Auth (id = auth.users.id)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  ranking_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-create profile when a user signs up via Supabase Auth
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
  -- Log error but don't fail the trigger - user creation is already complete
  RAISE WARNING 'Failed to create user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atomic ranking points update.
-- Uses upsert so new users are handled automatically.
-- GREATEST(0, ...) ensures points never go below 0.
CREATE OR REPLACE FUNCTION public.update_ranking_points(
  p_user_id uuid,
  p_delta integer,
  p_display_name text DEFAULT NULL
)
RETURNS integer AS $$
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
$$ LANGUAGE plpgsql;

-- Game match history (1v1)
CREATE TABLE IF NOT EXISTS public.game_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL UNIQUE,
  player1_id uuid NOT NULL,
  player2_id uuid NOT NULL,
  player1_display_name text,
  player2_display_name text,
  player1_score integer NOT NULL DEFAULT 0,
  player2_score integer NOT NULL DEFAULT 0,
  player1_correct integer NOT NULL DEFAULT 0,
  player2_correct integer NOT NULL DEFAULT 0,
  player1_total_time_ms integer NOT NULL DEFAULT 0,
  player2_total_time_ms integer NOT NULL DEFAULT 0,
  winner_id uuid,
  questions_count integer NOT NULL DEFAULT 10,
  played_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_ranking
  ON public.user_profiles(ranking_points DESC);

CREATE INDEX IF NOT EXISTS idx_game_matches_player1
  ON public.game_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_player2
  ON public.game_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_played_at
  ON public.game_matches(played_at DESC);

-- RLS: anyone can read leaderboard; only service role can write
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches  ENABLE ROW LEVEL SECURITY;

-- Allow all SELECT (read) on profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.user_profiles;
CREATE POLICY "profiles_select_all" ON public.user_profiles
  FOR SELECT USING (true);

-- Allow users to UPDATE/INSERT their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.user_profiles;
CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.user_profiles;
CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role bypass (for triggers)
DROP POLICY IF EXISTS "profiles_service_role" ON public.user_profiles;
CREATE POLICY "profiles_service_role" ON public.user_profiles
  FOR ALL USING (true);

-- Match queries
DROP POLICY IF EXISTS "matches_select_auth" ON public.game_matches;
CREATE POLICY "matches_select_auth" ON public.game_matches
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "matches_insert_auth" ON public.game_matches;
CREATE POLICY "matches_insert_auth" ON public.game_matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
