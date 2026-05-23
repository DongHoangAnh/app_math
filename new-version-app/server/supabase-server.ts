import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[Supabase Server] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — DB saves disabled");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const POINTS_WIN = 5;
const POINTS_LOSE = 3;

// ═══════════════════════════════════════════════════════════
// SAVE MATCH + UPDATE RANKING
// ═══════════════════════════════════════════════════════════

export async function saveGameMatch(data: {
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
}): Promise<{ player1Delta: number; player2Delta: number }> {
    // 1. Save match record
    const { error: matchError } = await supabase.from("game_matches").insert({
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

async function applyRankingDelta(userId: string, delta: number, displayName: string) {
    const { error } = await supabase.rpc("update_ranking_points", {
        p_user_id: userId,
        p_delta: delta,
        p_display_name: displayName,
    });
    if (error) {
        console.error("[Supabase] update_ranking_points error:", error.message);
        throw error;
    }
}
