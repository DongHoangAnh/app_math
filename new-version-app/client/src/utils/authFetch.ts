import { supabase } from '../services/supabase';

/**
 * fetch() wrapper that automatically attaches the current Supabase session
 * token as an Authorization: Bearer header. Use for all calls to the
 * backend REST API that require authentication.
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  let { data: { session } } = await supabase.auth.getSession();

  // On a cold start `getSession()` can hand back a persisted-but-expired token
  // before the background refresh lands, which makes the first authed call 401.
  // Proactively refresh when the token is expired or within 30s of expiry.
  const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : 0;
  if (session && expiresAtMs && expiresAtMs < Date.now() + 30_000) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) session = data.session;
  }

  return globalThis.fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  });
}
