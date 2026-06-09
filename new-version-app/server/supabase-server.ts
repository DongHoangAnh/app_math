import { createClient } from "@supabase/supabase-js";
import { POINTS_WIN, computeRankingDeltas, outcomeDelta } from "./ranking";
import { multiplierForDifficulty } from "../shared/constants";

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
    difficulty: number;
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
        difficulty: data.difficulty,
    });
    if (matchError) {
        console.error("[Supabase] Insert game_matches error:", matchError.message);
        throw matchError;
    }
}

export async function saveMatchRecord(data: GameMatchData): Promise<void> {
    await insertGameMatch(data);
}

export async function saveGameMatch(data: GameMatchData, multiplier = 1): Promise<{ player1Delta: number; player2Delta: number }> {
    // 1. Save match record
    await insertGameMatch(data);

    // 2. Determine point deltas (pure math in ./ranking), scaled by difficulty
    const { player1Delta: p1Delta, player2Delta: p2Delta } =
        computeRankingDeltas(data.winner_id, data.player1_id, data.player2_id, multiplier);

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
    winnerDisplayName: string,
    multiplier = 1,
): Promise<number> {
    const delta = Math.round(POINTS_WIN * multiplier);
    await applyRankingDelta(winnerId, delta, winnerDisplayName);
    return delta;
}

// ═══════════════════════════════════════════════════════════
// INTERNAL — atomic upsert via Supabase RPC
// ═══════════════════════════════════════════════════════════

export async function verifyToken(token: string): Promise<{ id: string } | null> {
    if (!supabase || !token) return null;
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        return { id: user.id };
    } catch {
        return null;
    }
}

export async function testSupabaseConnection(): Promise<void> {
    const url = process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_KEY ?? "";
    if (!url || !key) {
        console.error("[Supabase] ❌ ENV MISSING — SUPABASE_URL or SUPABASE_SERVICE_KEY not set");
        return;
    }
    console.log("[Supabase] ✅ ENV loaded — URL:", url.replace(/^(https?:\/\/[^.]+).*/, "$1…"));
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

// ═══════════════════════════════════════════════════════════
// SINGLE-DEVICE SESSION LOCK
// ═══════════════════════════════════════════════════════════

/** Claim/refresh the lock. Returns true if this device now owns it.
 *  `force` (login takeover) claims even when another device holds a warm lock. */
export async function acquireSessionLock(
    userId: string,
    deviceId: string,
    ttlSeconds: number,
    force = false
): Promise<boolean> {
    const { data, error } = await getSupabaseClient().rpc("acquire_session_lock", {
        p_user_id: userId,
        p_device_id: deviceId,
        p_ttl_seconds: ttlSeconds,
        p_force: force,
    });
    if (error) {
        console.error("[Supabase] acquire_session_lock error:", error.message);
        throw error;
    }
    return data === true;
}

/** Refresh the lock if the caller still owns it. Returns false if taken over. */
export async function heartbeatSessionLock(
    userId: string,
    deviceId: string
): Promise<boolean> {
    const { data, error } = await getSupabaseClient().rpc("heartbeat_session_lock", {
        p_user_id: userId,
        p_device_id: deviceId,
    });
    if (error) {
        console.error("[Supabase] heartbeat_session_lock error:", error.message);
        throw error;
    }
    return data === true;
}

/** Release the lock if the caller owns it. Idempotent. */
export async function releaseSessionLock(
    userId: string,
    deviceId: string
): Promise<void> {
    const { error } = await getSupabaseClient().rpc("release_session_lock", {
        p_user_id: userId,
        p_device_id: deviceId,
    });
    if (error) {
        console.error("[Supabase] release_session_lock error:", error.message);
        throw error;
    }
}

/** Current owning device id for a user, or null if no active lock. */
export async function getLockOwnerDeviceId(userId: string): Promise<string | null> {
    const { data, error } = await getSupabaseClient()
        .from("user_session_locks")
        .select("device_id")
        .eq("user_id", userId)
        .maybeSingle();
    // DELIBERATE fail-open: return null so the WS layer allows the connection.
    // Do NOT change this to throw — transient DB blips must not boot players from gameplay.
    if (error) {
        console.error("[Supabase] getLockOwnerDeviceId error:", error.message);
        return null;
    }
    return data?.device_id ?? null;
}

// ═══════════════════════════════════════════════════════════
// DAILY TASKS
// ═══════════════════════════════════════════════════════════

export type DailyTask = {
    task_key: string;
    title: string;
    description: string;
    exp_reward: number;
    progress: number;
    target: number;
    completed: boolean;
    exp_claimed: boolean;
};

// Vietnam UTC+7 local date as YYYY-MM-DD
function getVnDate(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

const TASK_DEFINITIONS = [
    { task_key: "play_1",       title: "Khởi động",            description: "Tham gia 1 trận đấu",           exp_reward: 50,  target: 1 },
    { task_key: "play_3",       title: "Kiên trì",             description: "Tham gia 3 trận đấu",           exp_reward: 80,  target: 3 },
    { task_key: "win_1",        title: "Chiến thắng đầu tiên", description: "Thắng 1 trận đấu",              exp_reward: 100, target: 1 },
    { task_key: "correct_20",   title: "Tập trung",            description: "Trả lời đúng 20 câu hỏi",       exp_reward: 75,  target: 20 },
    { task_key: "accuracy_70",  title: "Chính xác",            description: "Đạt ≥70% độ chính xác 1 trận", exp_reward: 60,  target: 1 },
] as const;

export async function getDailyTasks(userId: string): Promise<DailyTask[]> {
    const db = getSupabaseClient();
    const today = getVnDate();

    // Ensure all 5 tasks exist for today (upsert rows that are missing)
    const upserts = TASK_DEFINITIONS.map((t) => ({
        user_id: userId,
        task_key: t.task_key,
        task_date: today,
        progress: 0,
        target: t.target,
        completed: false,
        exp_claimed: false,
    }));

    await db
        .from("user_daily_tasks")
        .upsert(upserts, { onConflict: "user_id,task_key,task_date", ignoreDuplicates: true });

    const { data, error } = await db
        .from("user_daily_tasks")
        .select("task_key,progress,target,completed,exp_claimed")
        .eq("user_id", userId)
        .eq("task_date", today);

    if (error || !data) return [];

    return TASK_DEFINITIONS.map((def) => {
        const row = data.find((r) => r.task_key === def.task_key);
        return {
            task_key:    def.task_key,
            title:       def.title,
            description: def.description,
            exp_reward:  def.exp_reward,
            progress:    row?.progress    ?? 0,
            target:      row?.target      ?? def.target,
            completed:   row?.completed   ?? false,
            exp_claimed: row?.exp_claimed ?? false,
        };
    });
}

export type MatchResultForTasks = {
    userId: string;
    displayName: string;
    won: boolean;
    correctCount: number;
    totalQuestions: number;
};

export async function updateTasksAfterMatch(result: MatchResultForTasks): Promise<void> {
    const db = getSupabaseClient();
    const today = getVnDate();
    const { userId, won, correctCount, totalQuestions } = result;

    // Ensure rows exist first
    await getDailyTasks(userId);

    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

    // For each task, calculate the increment and whether it's now complete
    const updates: { task_key: string; increment: number; clampTarget: boolean }[] = [
        { task_key: "play_1",      increment: 1,            clampTarget: true },
        { task_key: "play_3",      increment: 1,            clampTarget: true },
        { task_key: "win_1",       increment: won ? 1 : 0,  clampTarget: true },
        { task_key: "correct_20",  increment: correctCount, clampTarget: true },
        { task_key: "accuracy_70", increment: accuracy >= 0.7 ? 1 : 0, clampTarget: true },
    ];

    for (const u of updates) {
        if (u.increment === 0) continue;

        // Atomic increment + mark completed if progress reaches target
        const { data: row } = await db
            .from("user_daily_tasks")
            .select("progress,target,completed")
            .eq("user_id", userId)
            .eq("task_key", u.task_key)
            .eq("task_date", today)
            .single();

        if (!row || row.completed) continue;

        const newProgress = u.clampTarget
            ? Math.min(row.progress + u.increment, row.target)
            : row.progress + u.increment;
        const nowCompleted = newProgress >= row.target;

        await db
            .from("user_daily_tasks")
            .update({ progress: newProgress, completed: nowCompleted })
            .eq("user_id", userId)
            .eq("task_key", u.task_key)
            .eq("task_date", today);
    }
}

export async function claimTaskExp(
    userId: string,
    taskKey: string,
    displayName: string
): Promise<{ exp: number; level: number } | null> {
    const db = getSupabaseClient();
    const today = getVnDate();

    // Verify task is completed but not yet claimed
    const { data: row } = await db
        .from("user_daily_tasks")
        .select("completed,exp_claimed,task_key")
        .eq("user_id", userId)
        .eq("task_key", taskKey)
        .eq("task_date", today)
        .single();

    if (!row || !row.completed || row.exp_claimed) return null;

    const def = TASK_DEFINITIONS.find((t) => t.task_key === taskKey);
    if (!def) return null;

    // Mark claimed
    await db
        .from("user_daily_tasks")
        .update({ exp_claimed: true })
        .eq("user_id", userId)
        .eq("task_key", taskKey)
        .eq("task_date", today);

    // Add EXP via RPC
    const { data, error } = await db.rpc("add_user_exp", {
        p_user_id: userId,
        p_exp: def.exp_reward,
        p_display_name: displayName,
    });

    if (error || !data?.[0]) {
        console.error("[Supabase] add_user_exp error:", error?.message);
        return null;
    }

    return { exp: data[0].new_exp, level: data[0].new_level };
}

// ═══════════════════════════════════════════════════════════
// MATCH HISTORY — paginated, newest → oldest, per-user perspective
// ═══════════════════════════════════════════════════════════

export type MatchHistoryItem = {
    id: string;
    roomId: string;
    playedAt: string;
    opponentId: string;
    opponentName: string;
    opponentAvatarUrl: string | null;
    myScore: number;
    opponentScore: number;
    myCorrect: number;
    opponentCorrect: number;
    outcome: "win" | "lose" | "draw";
    rankingDelta: number;
    questionsCount: number;
    difficulty: number;
};

export async function getMatchHistory(
    userId: string,
    limit: number,
    offset: number
): Promise<MatchHistoryItem[]> {
    const { data, error } = await getSupabaseClient()
        .from("game_matches")
        .select("id,room_id,played_at,player1_id,player2_id,player1_display_name,player2_display_name,player1_score,player2_score,player1_correct,player2_correct,winner_id,questions_count,difficulty")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order("played_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error || !data) return [];

    const items = data.map((m) => {
        const isP1 = m.player1_id === userId;
        const outcome: "win" | "lose" | "draw" =
            m.winner_id == null ? "draw" : m.winner_id === userId ? "win" : "lose";
        const difficulty = m.difficulty ?? 1;
        // Điểm xếp hạng tính theo hệ số của độ khó trận đó (đồng bộ với lúc kết thúc trận)
        const rankingDelta = outcomeDelta(outcome, multiplierForDifficulty(difficulty));
        return {
            id: String(m.id),
            roomId: m.room_id,
            playedAt: m.played_at,
            opponentId: (isP1 ? m.player2_id : m.player1_id) ?? "",
            opponentName: (isP1 ? m.player2_display_name : m.player1_display_name) ?? "Đối thủ",
            opponentAvatarUrl: null as string | null,
            myScore: (isP1 ? m.player1_score : m.player2_score) ?? 0,
            opponentScore: (isP1 ? m.player2_score : m.player1_score) ?? 0,
            myCorrect: (isP1 ? m.player1_correct : m.player2_correct) ?? 0,
            opponentCorrect: (isP1 ? m.player2_correct : m.player1_correct) ?? 0,
            outcome,
            rankingDelta,
            questionsCount: m.questions_count ?? 10,
            difficulty,
        };
    });

    // Gắn avatar đối thủ bằng MỘT truy vấn gộp (tránh N+1)
    const opponentIds = [...new Set(items.map((it) => it.opponentId).filter((id): id is string => !!id))];
    if (opponentIds.length > 0) {
        const { data: profiles } = await getSupabaseClient()
            .from("user_profiles")
            .select("id,avatar_url")
            .in("id", opponentIds);
        if (profiles) {
            const avatarById = new Map(profiles.map((p) => [p.id, p.avatar_url as string | null]));
            for (const it of items) {
                if (it.opponentId) it.opponentAvatarUrl = avatarById.get(it.opponentId) ?? null;
            }
        }
    }

    return items;
}

// ═══════════════════════════════════════════════════════════
// PLAYER STATS — aggregated from game_matches
// ═══════════════════════════════════════════════════════════

export type PlayerStats = {
    totalMatches: number;
    totalWins: number;
    winRate: number;
    totalScore: number;
    averageScore: number;
    bestStreak: number;
    currentStreak: number;
    level: number;
    nextLevelProgress: number;
    accuracyRate: number;
    avgTimePerMatch: number;
};

export async function getPlayerStats(userId: string): Promise<PlayerStats> {
    const fallback: PlayerStats = {
        totalMatches: 0, totalWins: 0, winRate: 0,
        totalScore: 0, averageScore: 0, bestStreak: 0,
        currentStreak: 0, level: 1, nextLevelProgress: 0,
        accuracyRate: 0, avgTimePerMatch: 0,
    };

    const { data, error } = await getSupabaseClient()
        .from("game_matches")
        .select("player1_id,player2_id,player1_correct,player2_correct,player1_score,player2_score,player1_total_time_ms,player2_total_time_ms,winner_id,questions_count")
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order("played_at", { ascending: true });

    if (error || !data || data.length === 0) return fallback;

    let totalScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    let totalTimeMs = 0;
    let totalWins = 0;

    // outcome per match ordered oldest→newest: true=win, false=loss/draw
    const outcomes: boolean[] = [];

    for (const m of data) {
        const isP1 = m.player1_id === userId;
        const correct = isP1 ? m.player1_correct : m.player2_correct;
        const score   = isP1 ? m.player1_score   : m.player2_score;
        const timeMs  = isP1 ? m.player1_total_time_ms : m.player2_total_time_ms;
        const qCount  = m.questions_count ?? 10;
        const won     = m.winner_id === userId;

        totalScore     += score ?? 0;
        totalCorrect   += correct ?? 0;
        totalQuestions += qCount;
        totalTimeMs    += timeMs ?? 0;
        if (won) totalWins++;
        outcomes.push(won);
    }

    const totalMatches = data.length;
    const winRate      = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
    const averageScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0;
    const accuracyRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const avgTimePerMatch = totalMatches > 0 ? totalTimeMs / totalMatches / 1000 : 0;

    // streak: scan from most recent match backwards
    let currentStreak = 0;
    for (let i = outcomes.length - 1; i >= 0; i--) {
        if (outcomes[i]) currentStreak++;
        else break;
    }

    // best streak: scan entire history
    let bestStreak = 0;
    let run = 0;
    for (const won of outcomes) {
        run = won ? run + 1 : 0;
        if (run > bestStreak) bestStreak = run;
    }

    const SCORE_PER_LEVEL = 500;
    const level            = Math.floor(totalScore / SCORE_PER_LEVEL) + 1;
    const nextLevelProgress = Math.round((totalScore % SCORE_PER_LEVEL) / SCORE_PER_LEVEL * 100);

    return {
        totalMatches,
        totalWins,
        winRate:         Math.round(winRate * 10) / 10,
        totalScore,
        averageScore,
        bestStreak,
        currentStreak,
        level,
        nextLevelProgress,
        accuracyRate:    Math.round(accuracyRate * 10) / 10,
        avgTimePerMatch: Math.round(avgTimePerMatch * 10) / 10,
    };
}

// ═══════════════════════════════════════════════════════════
// PUBLIC PROFILE — for viewing another player (privacy-aware)
// ═══════════════════════════════════════════════════════════

export type PublicProfile = {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    rankingPoints: number;
    allowViewingInfo: boolean;
    // Full stats only when the target allows it, or the viewer is the owner
    stats: PlayerStats | null;
};

export async function getPublicProfile(
    viewerId: string,
    targetId: string
): Promise<PublicProfile | null> {
    const { data, error } = await getSupabaseClient()
        .from("user_profiles")
        .select("display_name,avatar_url,level,ranking_points,allow_viewing_info")
        .eq("id", targetId)
        .single();

    if (error || !data) return null;

    // Cột mới có thể chưa tồn tại nếu migration chưa chạy → mặc định cho phép xem
    const allowViewingInfo = data.allow_viewing_info !== false;
    const canSeeStats = allowViewingInfo || viewerId === targetId;

    return {
        userId: targetId,
        displayName: data.display_name ?? "Đối thủ",
        avatarUrl: data.avatar_url ?? null,
        level: data.level ?? 1,
        rankingPoints: data.ranking_points ?? 0,
        allowViewingInfo,
        stats: canSeeStats ? await getPlayerStats(targetId) : null,
    };
}
