-- ================================================================
-- Migration 009: Practice mode (single-player, unranked)
-- Run in Supabase SQL Editor AFTER migration 008
--
-- Two tables:
--   practice_sessions  — one row per finished session (history + records)
--   practice_op_stats  — rolling per-user×op aggregate (weak-spot + accuracy)
-- Plus bump_practice_op_stats() for atomic increment-or-insert.
-- Server uses the service-role key (bypasses RLS); RLS is enabled with no
-- policies so no anon/auth client can read or write these tables directly.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind             text NOT NULL,                       -- 'fixed' | 'endless' | 'timed'
  difficulty_start integer NOT NULL DEFAULT 1,
  ramp_enabled     boolean NOT NULL DEFAULT false,
  ops              jsonb NOT NULL DEFAULT '[]'::jsonb,
  total            integer NOT NULL DEFAULT 0,
  correct          integer NOT NULL DEFAULT 0,
  total_time_ms    integer NOT NULL DEFAULT 0,
  best_streak      integer NOT NULL DEFAULT 0,
  ended_reason     text NOT NULL DEFAULT 'completed',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_sessions_user_idx
  ON public.practice_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.practice_op_stats (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  op        text NOT NULL,                              -- 'add'|'sub'|'mul'|'div'|'compare'
  attempted integer NOT NULL DEFAULT 0,
  correct   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, op)
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_op_stats ENABLE ROW LEVEL SECURITY;

-- Atomic increment-or-insert of one op's tallies.
CREATE OR REPLACE FUNCTION public.bump_practice_op_stats(
  p_user_id   uuid,
  p_op        text,
  p_attempted integer,
  p_correct   integer
) RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.practice_op_stats (user_id, op, attempted, correct)
  VALUES (p_user_id, p_op, p_attempted, p_correct)
  ON CONFLICT (user_id, op) DO UPDATE
    SET attempted = public.practice_op_stats.attempted + EXCLUDED.attempted,
        correct   = public.practice_op_stats.correct   + EXCLUDED.correct;
$$;
