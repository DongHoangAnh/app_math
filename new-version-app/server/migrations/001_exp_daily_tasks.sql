-- ================================================================
-- Migration: EXP system + Daily Tasks
-- Run this in Supabase SQL Editor
-- ================================================================

-- 1. Add EXP & level columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS exp   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1;

-- 2. Daily task progress table
CREATE TABLE IF NOT EXISTS user_daily_tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key     TEXT        NOT NULL,
  task_date    DATE        NOT NULL,
  progress     INT         NOT NULL DEFAULT 0,
  target       INT         NOT NULL,
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  exp_claimed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_key, task_date)
);

-- 3. RLS policies for user_daily_tasks
ALTER TABLE user_daily_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tasks (client reads directly)
DROP POLICY IF EXISTS "users read own daily tasks"  ON user_daily_tasks;
CREATE POLICY "users read own daily tasks"
  ON user_daily_tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles all writes (server-side only)
DROP POLICY IF EXISTS "service role full access daily tasks" ON user_daily_tasks;
CREATE POLICY "service role full access daily tasks"
  ON user_daily_tasks FOR ALL
  USING (true);

-- 4. RPC: add EXP to a user and recalculate level
--    Returns new exp and new level
CREATE OR REPLACE FUNCTION add_user_exp(
  p_user_id     UUID,
  p_exp         INT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS TABLE (new_exp INT, new_level INT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_exp          INT;
  v_level        INT;
  v_exp_per_level CONSTANT INT := 300;
BEGIN
  -- Upsert: add EXP, create profile row if missing
  INSERT INTO user_profiles (id, display_name, exp, level)
  VALUES (p_user_id, COALESCE(p_display_name, 'Player'), p_exp, 1)
  ON CONFLICT (id) DO UPDATE
    SET exp        = user_profiles.exp + p_exp,
        updated_at = NOW()
  RETURNING user_profiles.exp INTO v_exp;

  -- Recalculate level (level 1 starts at 0 EXP)
  v_level := FLOOR(v_exp::FLOAT / v_exp_per_level) + 1;

  UPDATE user_profiles
  SET level = v_level
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_exp, v_level;
END;
$$;

-- 5. Index for fast daily-task lookups
CREATE INDEX IF NOT EXISTS idx_user_daily_tasks_user_date
  ON user_daily_tasks (user_id, task_date);
