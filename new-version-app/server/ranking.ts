// ═══════════════════════════════════════════════════════════
// RANKING — pure point math, no DB. Easily unit-testable.
// ═══════════════════════════════════════════════════════════

export const POINTS_WIN = 5;
export const POINTS_LOSE = 3;

export type RankingOutcome = "win" | "lose" | "draw";

/** Ranking points delta for a single player given their match outcome. */
export function outcomeDelta(outcome: RankingOutcome): number {
    if (outcome === "win") return POINTS_WIN;
    if (outcome === "lose") return -POINTS_LOSE;
    return 0; // draw
}

/**
 * Both players' ranking deltas from the winner id.
 * null winner = draw → both 0.
 */
export function computeRankingDeltas(
    winnerId: string | null,
    player1Id: string,
    player2Id: string,
): { player1Delta: number; player2Delta: number } {
    if (winnerId === player1Id) return { player1Delta: POINTS_WIN, player2Delta: -POINTS_LOSE };
    if (winnerId === player2Id) return { player1Delta: -POINTS_LOSE, player2Delta: POINTS_WIN };
    return { player1Delta: 0, player2Delta: 0 };
}
