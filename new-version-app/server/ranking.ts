// ═══════════════════════════════════════════════════════════
// RANKING — pure point math, no DB. Easily unit-testable.
// ═══════════════════════════════════════════════════════════

export const POINTS_WIN = 5;
export const POINTS_LOSE = 3;

export type RankingOutcome = "win" | "lose" | "draw";

/** Ranking points delta for a single player given their match outcome. */
export function outcomeDelta(outcome: RankingOutcome, multiplier = 1): number {
    if (outcome === "win") return Math.round(POINTS_WIN * multiplier);
    if (outcome === "lose") return -Math.round(POINTS_LOSE * multiplier);
    return 0; // draw
}

/**
 * Both players' ranking deltas from the winner id, scaled by the match multiplier.
 * null winner = draw → both 0.
 */
export function computeRankingDeltas(
    winnerId: string | null,
    player1Id: string,
    player2Id: string,
    multiplier = 1,
): { player1Delta: number; player2Delta: number } {
    if (winnerId === player1Id) {
        return { player1Delta: outcomeDelta("win", multiplier), player2Delta: outcomeDelta("lose", multiplier) };
    }
    if (winnerId === player2Id) {
        return { player1Delta: outcomeDelta("lose", multiplier), player2Delta: outcomeDelta("win", multiplier) };
    }
    return { player1Delta: 0, player2Delta: 0 };
}
