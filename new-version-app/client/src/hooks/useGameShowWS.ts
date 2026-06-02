import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface GameQuestion {
    id: string;
    level: number;
    question: string;
    options: string[];
    correctAnswer: string;
    difficulty: number;
}

export interface OpponentInfo {
    userId: string;
    displayName: string;
    grade?: string;
    winRate?: number;
    totalScore?: number;
}

export interface GameResult {
    correct: number;
    score: number;
    totalTimeMs: number;
    displayName: string;
    rankingDelta?: number;
}

export type MatchPhase =
    | "idle"
    | "queued"
    | "match_found"   // brief "found" screen
    | "playing"       // answering questions (independent per player)
    | "you_finished"  // I'm done, waiting for opponent
    | "game_over"
    | "opponent_disconnected";

export interface GameShowState {
    phase: MatchPhase;
    roomId: string | null;
    questions: GameQuestion[];
    // My local progress
    currentQuestionIndex: number;
    myAnswers: Record<number, { answer: string; isCorrect: boolean; timeMs: number }>;
    // Opponent's progress (number of questions completed, from server events)
    opponentAnsweredCount: number;
    opponentFinished: boolean;
    // Final
    opponent: OpponentInfo | null;
    finalResults: Record<string, GameResult> | null;
    winnerId?: string | null;
    myRankingDelta: number | null;
    connected: boolean;
    error: string | null;
}

// ═══════════════════════════════════════════════════════════
// WS URL
// ═══════════════════════════════════════════════════════════

function buildWSUrl() {
    // EXPO_PUBLIC_WS_URL is the full WS endpoint; use it directly.
    // Fall back to API URL (HTTP) and derive the WS path.
    if (process.env.EXPO_PUBLIC_WS_URL) {
        return process.env.EXPO_PUBLIC_WS_URL;
    }
    const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const url = base.replace(/^http/, 'ws').replace(/^https/, 'wss');
    return `${url}/ws/gameshow`;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useGameShowWS(
    userId: string | null,
    displayName: string,
    grade?: string,
    totalScore?: number,
    winRate?: number
) {
    const wsRef = useRef<WebSocket | null>(null);
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const userIdRef = useRef(userId);
    useEffect(() => { userIdRef.current = userId; }, [userId]);
    // Track start time for each question
    const questionStartRef = useRef<number>(Date.now());

    const [state, setState] = useState<GameShowState>({
        phase: "idle",
        roomId: null,
        questions: [],
        currentQuestionIndex: 0,
        myAnswers: {},
        opponentAnsweredCount: 0,
        opponentFinished: false,
        opponent: null,
        finalResults: null,
        myRankingDelta: null,
        connected: false,
        error: null,
    });

    // ─── Send raw JSON ──────────────────────────────────────
    const send = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    // ─── Connect ────────────────────────────────────────────
    const connect = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

        const ws = new WebSocket(buildWSUrl());
        wsRef.current = ws;

        ws.onopen = () => {
            setState((s) => ({ ...s, connected: true, error: null }));
            pingRef.current = setInterval(() => send({ type: "PING" }), 25000);
        };

        ws.onclose = () => {
            setState((s) => ({ ...s, connected: false }));
            if (pingRef.current) clearInterval(pingRef.current);
        };

        ws.onerror = () => {
            setState((s) => ({ ...s, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." }));
        };

        ws.onmessage = (event) => {
            let msg: any;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }

            switch (msg.type) {
                case "QUEUED":
                    setState((s) => ({ ...s, phase: "queued", error: null }));
                    break;

                case "MATCH_FOUND":
                    // Reset per-question timer
                    questionStartRef.current = Date.now();
                    setState((s) => ({
                        ...s,
                        phase: "match_found",
                        roomId: msg.roomId,
                        questions: msg.questions,
                        currentQuestionIndex: 0,
                        myAnswers: {},
                        opponentAnsweredCount: 0,
                        opponentFinished: false,
                        opponent: msg.opponent,
                        finalResults: null,
                        myRankingDelta: null,
                        error: null,
                    }));
                    break;

                case "OPPONENT_PROGRESS":
                    // Server tells us opponent answered questionIndex (isCorrect) and their total answered count
                    setState((s) => ({
                        ...s,
                        opponentAnsweredCount: msg.answeredCount,
                    }));
                    break;

                case "OPPONENT_FINISHED":
                    setState((s) => ({
                        ...s,
                        opponentFinished: true,
                        opponentAnsweredCount: msg.answeredCount,
                    }));
                    break;

                case "YOU_FINISHED":
                    setState((s) => ({ ...s, phase: "you_finished" }));
                    break;

                case "GAME_OVER": {
                    const myResult = userIdRef.current && msg.results
                        ? (msg.results as Record<string, GameResult>)[userIdRef.current]
                        : null;
                    setState((s) => ({
                        ...s,
                        phase: "game_over",
                        finalResults: msg.results,
                        winnerId: msg.winnerId,
                        myRankingDelta: myResult?.rankingDelta ?? null,
                    }));
                    break;
                }

                case "OPPONENT_DISCONNECTED":
                    setState((s) => ({
                        ...s,
                        phase: "opponent_disconnected",
                        error: msg.message,
                        myRankingDelta: msg.rankingDelta ?? null,
                    }));
                    break;

                case "RECONNECTED":
                    questionStartRef.current = Date.now();
                    setState((s) => ({
                        ...s,
                        phase: msg.myFinished ? "you_finished" : "playing",
                        roomId: msg.roomId,
                        questions: msg.questions,
                        myAnswers: msg.myAnswers ?? {},
                        currentQuestionIndex: Object.keys(msg.myAnswers ?? {}).length,
                        connected: true,
                    }));
                    break;

                // PONG: no-op
                default:
                    break;
            }
        };
    }, [send]);

    // ─── Disconnect ─────────────────────────────────────────
    const disconnect = useCallback(() => {
        if (pingRef.current) clearInterval(pingRef.current);
        wsRef.current?.close();
        wsRef.current = null;
        setState((s) => ({ ...s, connected: false, phase: "idle" }));
    }, []);

    // ─── Join queue ─────────────────────────────────────────
    const joinQueue = useCallback(async () => {
        if (!userId) return;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? "";
        if (!token) return; // refuse to join without a valid session
        connect();
        const tryJoin = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                send({ type: "JOIN_QUEUE", userId, token, displayName, grade, winRate, totalScore });
            } else {
                setTimeout(tryJoin, 200);
            }
        };
        tryJoin();
    }, [userId, displayName, grade, winRate, totalScore, connect, send]);

    // ─── Leave queue ────────────────────────────────────────
    const leaveQueue = useCallback(() => {
        if (userId) send({ type: "LEAVE_QUEUE", userId });
        setState((s) => ({ ...s, phase: "idle" }));
    }, [userId, send]);

    // ─── Submit answer — client moves to next question immediately ──
    const submitAnswer = useCallback(
        (questionIndex: number, answer: string) => {
            if (!userId || !state.roomId) return;

            const timeMs = Date.now() - questionStartRef.current;
            const question = state.questions[questionIndex];
            const isCorrect = question ? answer === question.correctAnswer : false;

            // Reset timer for next question right away
            questionStartRef.current = Date.now();

            const newAnswers = {
                ...state.myAnswers,
                [questionIndex]: { answer, isCorrect, timeMs },
            };
            const nextIndex = questionIndex + 1;
            const isLast = nextIndex >= state.questions.length;

            // Update local state immediately (optimistic)
            setState((s) => ({
                ...s,
                myAnswers: newAnswers,
                currentQuestionIndex: isLast ? questionIndex : nextIndex,
                // phase "you_finished" will come from server YOU_FINISHED event
            }));

            // Send to server
            send({
                type: "SUBMIT_ANSWER",
                userId,
                roomId: state.roomId,
                questionIndex,
                answer,
                timeMs,
            });
        },
        [userId, state.roomId, state.questions, state.myAnswers, send]
    );

    // ─── Auto-transition match_found → playing after 3s ────
    useEffect(() => {
        if (state.phase === "match_found") {
            const t = setTimeout(() => {
                questionStartRef.current = Date.now();
                setState((s) => ({ ...s, phase: "playing" }));
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [state.phase]);

    // ─── Reset ──────────────────────────────────────────────
    const resetGame = useCallback(() => {
        setState({
            phase: "idle",
            roomId: null,
            questions: [],
            currentQuestionIndex: 0,
            myAnswers: {},
            opponentAnsweredCount: 0,
            opponentFinished: false,
            opponent: null,
            finalResults: null,
            myRankingDelta: null,
            connected: state.connected,
            error: null,
        });
    }, [state.connected]);

    // ─── Cleanup on unmount ─────────────────────────────────
    useEffect(() => {
        return () => { disconnect(); };
    }, [disconnect]);

    return { state, joinQueue, leaveQueue, submitAnswer, resetGame, connect, disconnect };
}
