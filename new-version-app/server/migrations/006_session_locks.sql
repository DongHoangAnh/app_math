-- ================================================================
-- Migration 006: Single-device login lock
-- Run in Supabase SQL Editor AFTER migration 005
--
-- One row per user records which device currently "owns" the active
-- session. A client heartbeat refreshes last_seen; if last_seen falls
-- older than the TTL the lock is stale and another device may claim it
-- ("old device wins" while it stays warm). All mutation goes through the
-- SECURITY DEFINER RPCs below — the anon client cannot write the table
-- directly (RLS denies it).
-- ================================================================

CREATE TABLE IF NOT EXISTS public.user_session_locks (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  device_id  text        NOT NULL,
  last_seen  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_session_locks ENABLE ROW LEVEL SECURITY;
-- No policies => anon/auth clients cannot read or write. Service role
-- (used by the Node server) bypasses RLS, and the RPCs are SECURITY DEFINER.

-- Atomically claim/refresh the lock. Grants when: no row, same device, or
-- the previous owner went stale (last_seen older than p_ttl_seconds).
CREATE OR REPLACE FUNCTION public.acquire_session_lock(
  p_user_id      uuid,
  p_device_id    text,
  p_ttl_seconds  integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner    text;
  v_last_seen timestamptz;
BEGIN
  SELECT device_id, last_seen INTO v_owner, v_last_seen
  FROM public.user_session_locks
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_owner IS NULL
     OR v_owner = p_device_id
     OR v_last_seen < now() - make_interval(secs => p_ttl_seconds) THEN
    INSERT INTO public.user_session_locks (user_id, device_id, last_seen, updated_at)
    VALUES (p_user_id, p_device_id, now(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET device_id = EXCLUDED.device_id,
          last_seen = now(),
          updated_at = now();
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Refresh the lock if (and only if) the caller still owns it.
CREATE OR REPLACE FUNCTION public.heartbeat_session_lock(
  p_user_id   uuid,
  p_device_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.user_session_locks
  SET last_seen = now(), updated_at = now()
  WHERE user_id = p_user_id AND device_id = p_device_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Release the lock only if the caller owns it. Idempotent.
CREATE OR REPLACE FUNCTION public.release_session_lock(
  p_user_id   uuid,
  p_device_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_session_locks
  WHERE user_id = p_user_id AND device_id = p_device_id;
END;
$$;
