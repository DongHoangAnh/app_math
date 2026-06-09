-- ================================================================
-- Migration 008: Match difficulty
-- Run in Supabase SQL Editor AFTER migration 007
--
-- Records which difficulty (1=easy/2=medium/3=hard) a match was played
-- at. Drives the ranking-point multiplier (×1 / ×1.5 / ×2) and is shown
-- in match history. Existing rows default to 1 (easy).
-- ================================================================

ALTER TABLE public.game_matches
  ADD COLUMN IF NOT EXISTS difficulty integer NOT NULL DEFAULT 1;
