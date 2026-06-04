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
 * Resolve the GameShow WebSocket endpoint.
 * Prefer an explicit EXPO_PUBLIC_WS_URL; otherwise derive it from the
 * API URL (http→ws, https→wss) and append the gameshow path.
 */
export function resolveWsUrl(): string {
    if (WS_URL) return WS_URL;
    const wsBase = API_URL.replace(/^http/, 'ws').replace(/^https/, 'wss');
    return `${wsBase}/ws/gameshow`;
}
