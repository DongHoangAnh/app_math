import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseServiceKey);

if (!hasSupabaseConfig) {
    console.error("[Supabase Server] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — DB saves will fail");
}

const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseServiceKey) : null;

function getSupabaseClient() {
    if (!supabase) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    }
    return supabase;
}

const POINTS_WIN = 5;
const POINTS_LOSE = 3;

// ═══════════════════════════════════════════════════════════
// SAVE MATCH + UPDATE RANKING
// ═══════════════════════════════════════════════════════════

export type GameMatchData = {
    room_id: string;
    player1_id: string;
    player2_id: string;
    player1_display_name: string;
    player2_display_name: string;
    player1_score: number;
    player2_score: number;
    player1_correct: number;
    player2_correct: number;
    player1_total_time_ms: number;
    player2_total_time_ms: number;
    winner_id: string | null;
    questions_count: number;
};

async function insertGameMatch(data: GameMatchData): Promise<void> {
    const { error: matchError } = await getSupabaseClient().from("game_matches").insert({
        room_id: data.room_id,
        player1_id: data.player1_id,
        player2_id: data.player2_id,
        player1_display_name: data.player1_display_name,
        player2_display_name: data.player2_display_name,
        player1_score: data.player1_score,
        player2_score: data.player2_score,
        player1_correct: data.player1_correct,
        player2_correct: data.player2_correct,
        player1_total_time_ms: data.player1_total_time_ms,
        player2_total_time_ms: data.player2_total_time_ms,
        winner_id: data.winner_id,
        questions_count: data.questions_count,
    });
    if (matchError) {
        console.error("[Supabase] Insert game_matches error:", matchError.message);
        throw matchError;
    }
}

export async function saveMatchRecord(data: GameMatchData): Promise<void> {
    await insertGameMatch(data);
}

export async function saveGameMatch(data: GameMatchData): Promise<{ player1Delta: number; player2Delta: number }> {
    // 1. Save match record
    await insertGameMatch(data);

    // 2. Determine point deltas
    let p1Delta = 0;
    let p2Delta = 0;
    if (data.winner_id === data.player1_id) {
        p1Delta = POINTS_WIN;
        p2Delta = -POINTS_LOSE;
    } else if (data.winner_id === data.player2_id) {
        p1Delta = -POINTS_LOSE;
        p2Delta = POINTS_WIN;
    }
    // draw → both stay 0 delta

    // 3. Update ranking points atomically via RPC (floor at 0 enforced in DB)
    await Promise.all([
        p1Delta !== 0
            ? applyRankingDelta(data.player1_id, p1Delta, data.player1_display_name)
            : Promise.resolve(),
        p2Delta !== 0
            ? applyRankingDelta(data.player2_id, p2Delta, data.player2_display_name)
            : Promise.resolve(),
    ]);

    return { player1Delta: p1Delta, player2Delta: p2Delta };
}

// ═══════════════════════════════════════════════════════════
// DISCONNECT WIN — opponent left, winner gets +5
// ═══════════════════════════════════════════════════════════

export async function saveDisconnectWin(
    winnerId: string,
    winnerDisplayName: string
): Promise<number> {
    await applyRankingDelta(winnerId, POINTS_WIN, winnerDisplayName);
    return POINTS_WIN;
}

// ═══════════════════════════════════════════════════════════
// INTERNAL — atomic upsert via Supabase RPC
// ═══════════════════════════════════════════════════════════

export async function testSupabaseConnection(): Promise<void> {
    const url = process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_KEY ?? "";
    if (!url || !key) {
        console.error("[Supabase] ❌ ENV MISSING — SUPABASE_URL or SUPABASE_SERVICE_KEY not set");
        return;
    }
    console.log("[Supabase] ✅ ENV loaded — URL:", url);
    try {
        const client = getSupabaseClient();
        // Test 1: game_matches table exists?
        const { error: tableErr } = await client.from("game_matches").select("id").limit(1);
        if (tableErr) {
            console.error("[Supabase] ❌ game_matches table error:", tableErr.message);
        } else {
            console.log("[Supabase] ✅ game_matches table OK");
        }
        // Test 2: update_ranking_points RPC exists?
        const { error: rpcErr } = await client.rpc("update_ranking_points", {
            p_user_id: "00000000-0000-0000-0000-000000000000",
            p_delta: 0,
        });
        // FK violation is expected (fake UUID), but "function does not exist" is the error we care about
        if (rpcErr && rpcErr.message.includes("does not exist")) {
            console.error("[Supabase] ❌ update_ranking_points RPC missing:", rpcErr.message);
        } else {
            console.log("[Supabase] ✅ update_ranking_points RPC OK");
        }
    } catch (e: any) {
        console.error("[Supabase] ❌ Connection failed:", e.message);
    }
}

async function applyRankingDelta(userId: string, delta: number, displayName: string) {
    const { error } = await getSupabaseClient().rpc("update_ranking_points", {
        p_user_id: userId,
        p_delta: delta,
        p_display_name: displayName,
    });
    if (error) {
        console.error("[Supabase] update_ranking_points error:", error.message);
        throw error;
    }
}
