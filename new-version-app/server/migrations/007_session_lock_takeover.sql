-- ================================================================
-- Migration 007: Single-device lock — "new device wins" takeover
-- Run in Supabase SQL Editor AFTER migration 006
--
-- Changes the lock policy from "old device wins" to "new device wins":
-- a fresh login (force=true) claims the lock even while another device
-- still holds a warm one, evicting the old device. The old device's next
-- heartbeat then returns false and it signs itself out.
--
-- The heartbeat re-acquire path keeps calling with force=false (the default),
-- so an already-evicted device CANNOT steal the lock back — this is what
-- prevents two live devices from ping-ponging the lock between them.
-- ================================================================

-- Replaces the function from migration 006, adding p_force.
-- Grants when: force, no row, same device, or the previous owner went stale.
CREATE OR REPLACE FUNCTION public.acquire_session_lock(
  p_user_id      uuid,
  p_device_id    text,
  p_ttl_seconds  integer,
  p_force        boolean DEFAULT false
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

  IF p_force
     OR v_owner IS NULL
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
