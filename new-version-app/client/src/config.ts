/**
 * Centralized runtime config — single place that reads env vars.
 *
 * NOTE: Expo/Metro inlines `process.env.EXPO_PUBLIC_*` at the literal
 * reference site during bundling. So these vars MUST be referenced here
 * as full static expressions (never computed by key name) for inlining
 * to work. Other modules import the resolved values from this file.
 */

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL;
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/**
 * Public URLs to the hosted legal documents (open in browser from the
 * consent screen). Override per-environment via env; the defaults point at
 * the static files shipped in this repo's root once they're hosted.
 */
export const PRIVACY_POLICY_URL =
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://donghoanganh.github.io/mathup-legal/#privacy';
export const TERMS_OF_SERVICE_URL =
    process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://donghoanganh.github.io/mathup-legal/#terms';

/**
 * Current legal version the user must consent to. Bump this when the terms
 * or privacy policy change materially — users who accepted an older version
 * are re-prompted on their next launch (see useAuth `termsAccepted`).
 */
export const TERMS_VERSION = '1.0';

/**
 * Resolve the GameShow WebSocket endpoint.
 * Prefer an explicit EXPO_PUBLIC_WS_URL; otherwise derive it from the
 * API URL (http→ws, https→wss) and append the gameshow path.
 */
export function resolveWsUrl(): string {
    if (WS_URL) return WS_URL;
    const wsBase = API_URL.replace(/^http/, 'ws').replace(/^https/, 'wss');
    return `${wsBase}/ws/gameshow`;
}
