-- ================================================================
-- Migration 002: QQ-style progressive level system
-- Run in Supabase SQL Editor AFTER migration 001
--
-- EXP required per level (4 tiers like QQ's star/moon/sun/crown):
--   Star tier  (levels 1-4):  200 EXP each  → total 800  EXP to first moon
--   Moon tier  (levels 5-16): 400 EXP each  → total 5600 EXP to first sun
--   Sun tier  (levels 17-64): 1000 EXP each → total 53600 EXP to first crown
--   Crown tier (level 65+):   2500 EXP each
--
-- Visual display formula (level N, 1-indexed):
--   adj    = N - 1
--   crowns = floor(adj / 64)
--   suns   = floor((adj % 64) / 16)
--   moons  = floor(((adj % 64) % 16) / 4)
--   stars  = ((adj % 64) % 16) % 4
-- ================================================================

CREATE OR REPLACE FUNCTION add_user_exp(
  p_user_id     UUID,
  p_exp         INT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS TABLE (new_exp INT, new_level INT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_exp   INT;
  v_level INT;
BEGIN
  INSERT INTO user_profiles (id, display_name, exp, level)
  VALUES (p_user_id, COALESCE(p_display_name, 'Player'), p_exp, 1)
  ON CONFLICT (id) DO UPDATE
    SET exp        = user_profiles.exp + p_exp,
        updated_at = NOW()
  RETURNING user_profiles.exp INTO v_exp;

  -- Progressive level formula matching QQ tiers
  v_level := CASE
    WHEN v_exp < 800   THEN FLOOR(v_exp::FLOAT / 200) + 1
    WHEN v_exp < 5600  THEN 4  + FLOOR((v_exp - 800)::FLOAT   / 400)  + 1
    WHEN v_exp < 53600 THEN 16 + FLOOR((v_exp - 5600)::FLOAT  / 1000) + 1
    ELSE                    64 + FLOOR((v_exp - 53600)::FLOAT / 2500) + 1
  END;

  UPDATE user_profiles SET level = v_level WHERE id = p_user_id;

  RETURN QUERY SELECT v_exp, v_level;
END;
$$;
