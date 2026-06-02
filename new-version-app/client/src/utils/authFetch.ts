import { supabase } from '../services/supabase';

/**
 * fetch() wrapper that automatically attaches the current Supabase session
 * token as an Authorization: Bearer header. Use for all calls to the
 * backend REST API that require authentication.
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
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
