import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { saveGameMatch, saveDisconnectWin, saveMatchRecord, updateTasksAfterMatch, verifyToken } from "./supabase-server";
import type { GameQuestion, GameMode, AnswerRecord } from "../shared/types";
import {
    QUESTIONS_PER_MATCH,
    EMOJIS,
    EMOJI_MAX, EMOJI_WIN_MS,
    CHAT_MAX, CHAT_WIN_MS, CHAT_MAX_LEN,
    VI_BANNED, EN_BANNED,
} from "../shared/constants";

// ═══════════════════════════════════════════════════════════
// SERVER-ONLY TYPES (hold live socket refs — not shareable)
// ═══════════════════════════════════════════════════════════

interface Player {
    ws: WebSocket;
    userId: string;
    displayName: string;
    grade?: string;
    winRate?: number;
    totalScore?: number;
    mode?: string;
    roomId?: string;
}

interface PlayerProgress {
    // questionIndex → answer record
    answers: Record<number, AnswerRecord>;
    finished: boolean; // true when answered all questions
    finishedAt?: number;
}

interface GameRoom {
    roomId: string;
    player1: Player;
    player2: Player;
    questions: GameQuestion[];
    progress: Record<string, PlayerProgress>; // userId → progress
    startedAt: number;
    finished: boolean;
}

type WSMessage =
    | { type: "JOIN_QUEUE"; userId: string; token: string; displayName: string; grade?: string; winRate?: number; totalScore?: number; mode?: string }
    | { type: "LEAVE_QUEUE"; userId: string }
    | { type: "SUBMIT_ANSWER"; userId: string; roomId: string; questionIndex: number; answer: string; timeMs: number }
    | { type: "SEND_EMOJI"; roomId: string; emoji: string }
    | { type: "SEND_CHAT"; roomId: string; text: string }
    | { type: "PING" };

// ═══════════════════════════════════════════════════════════
// IN-MEMORY STATE
// ═══════════════════════════════════════════════════════════

const waitingQueue: Player[] = [];
const activeRooms = new Map<string, GameRoom>();
const playerToRoom = new Map<string, string>(); // userId → roomId

// ═══════════════════════════════════════════════════════════
// CHAT / EMOJI — rate limiting + profanity filter
// ═══════════════════════════════════════════════════════════

interface ChatRateLimit {
    emojiTs: number[];
    chatTs: number[];
}
const chatRateLimits = new Map<string, ChatRateLimit>();

const ALLOWED_EMOJIS = new Set<string>(EMOJIS);

function getRateLimit(userId: string): ChatRateLimit {
    if (!chatRateLimits.has(userId)) chatRateLimits.set(userId, { emojiTs: [], chatTs: [] });
    return chatRateLimits.get(userId)!;
}

function canSendEmoji(userId: string): boolean {
    const rl = getRateLimit(userId);
    const now = Date.now();
    rl.emojiTs = rl.emojiTs.filter(t => now - t < EMOJI_WIN_MS);
    if (rl.emojiTs.length >= EMOJI_MAX) return false;
    rl.emojiTs.push(now);
    return true;
}

function canSendChat(userId: string): boolean {
    const rl = getRateLimit(userId);
    const now = Date.now();
    rl.chatTs = rl.chatTs.filter(t => now - t < CHAT_WIN_MS);
    if (rl.chatTs.length >= CHAT_MAX) return false;
    rl.chatTs.push(now);
    return true;
}

// Vietnamese + English profanity — substring match for VI, word-boundary for EN.
// Word lists live in shared/constants.ts.
function hasProfanity(text: string): boolean {
    const norm = text.toLowerCase().replace(/1/g, "i").replace(/@/g, "a").replace(/0/g, "o");
    for (const w of VI_BANNED) if (norm.includes(w)) return true;
    for (const w of EN_BANNED) if (new RegExp(`\\b${w}\\b`).test(norm)) return true;
    return false;
}

// ═══════════════════════════════════════════════════════════
// RANDOM QUESTION GENERATOR — lớp 1: +, -, ×, ÷ và so sánh <, >, =
// ═══════════════════════════════════════════════════════════

// Chế độ chơi quyết định phép tính của câu số học. Câu so sánh (<, >, =)
// luôn xuất hiện ở mọi chế độ (cứ 3 câu thì có 1 câu so sánh).
function normalizeMode(m?: string): GameMode {
    return m === "add_sub" || m === "mul_div" || m === "mixed" ? m : "mixed";
}

let _qCounter = 0;
function nextQId() { return `q_${++_qCounter}`; }

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArr<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function numericOptions(correct: number): string[] {
    const pool = new Set<number>([correct]);
    for (const d of shuffleArr([1, 2, 3, -1, -2, 4, 5, -3, 10, -4])) {
        if (pool.size >= 4) break;
        const w = correct + d;
        if (w >= 0) pool.add(w);
    }
    let fill = correct + pool.size + 1;
    while (pool.size < 4) { pool.add(fill); fill++; }
    return shuffleArr([...pool].slice(0, 4).map(String));
}

// Các phép tính được phép theo từng chế độ
function opsForMode(mode: GameMode): string[] {
    if (mode === "add_sub") return ["+", "-"];
    if (mode === "mul_div") return ["×", "÷"];
    return ["+", "-", "×", "÷"];
}

function makeArithmeticQ(mode: GameMode): GameQuestion {
    const op = shuffleArr(opsForMode(mode))[0];
    let a: number, b: number, answer: number, text: string;

    if (op === "+") {
        a = randInt(1, 9); b = randInt(1, 9);
        answer = a + b;
        text = `${a} + ${b} = ?`;
    } else if (op === "-") {
        a = randInt(1, 9); b = randInt(1, a);
        answer = a - b;
        text = `${a} - ${b} = ?`;
    } else if (op === "×") {
        a = randInt(1, 5); b = randInt(1, 5);
        answer = a * b;
        text = `${a} × ${b} = ?`;
    } else {
        b = randInt(2, 5); answer = randInt(1, 4);
        a = b * answer;
        text = `${a} ÷ ${b} = ?`;
    }

    return {
        id: nextQId(), level: 1, question: text,
        options: numericOptions(answer), correctAnswer: String(answer),
        difficulty: 1, type: "arithmetic",
    };
}

function makeComparisonQ(): GameQuestion {
    const a = randInt(1, 9), b = randInt(1, 9);
    const correct = a > b ? ">" : a < b ? "<" : "=";
    return {
        id: nextQId(), level: 1,
        question: `${a}  ?  ${b}`,
        options: ["<", "=", ">"],
        correctAnswer: correct,
        difficulty: 1,
        type: "comparison",
    };
}

// Tạo bộ câu hỏi: cứ mỗi 3 câu thì có 1 câu so sánh, còn lại là số học theo mode
function generateQuestions(count: number, mode: GameMode): GameQuestion[] {
    return Array.from({ length: count }, (_, i) =>
        i % 3 === 2 ? makeComparisonQ() : makeArithmeticQ(mode)
    );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function sendToPlayer(player: Player, data: object) {
    if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(data));
    }
}

function generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getOpponent(room: GameRoom, userId: string): Player {
    return room.player1.userId === userId ? room.player2 : room.player1;
}

function calcPlayerStats(prog?: PlayerProgress) {
    if (!prog) return { correct: 0, score: 0, totalTimeMs: 0 };
    let correct = 0;
    let totalTime = 0;
    for (const ans of Object.values(prog.answers)) {
        if (ans.isCorrect) correct++;
        totalTime += ans.timeMs;
    }
    return { correct, score: correct * 100, totalTimeMs: totalTime };
}

// ═══════════════════════════════════════════════════════════
// MATCHMAKING
// ═══════════════════════════════════════════════════════════

function tryMatch() {
    if (waitingQueue.length < 2) return;

    const p1 = waitingQueue.shift()!;
    const p2 = waitingQueue.shift()!;

    const roomId = generateRoomId();
    // Dùng chế độ của người vào hàng đợi trước (p1) để cả hai cùng một bộ câu hỏi
    const mode = normalizeMode(p1.mode);
    const questions = generateQuestions(QUESTIONS_PER_MATCH, mode);

    const makeProgress = (): PlayerProgress => ({ answers: {}, finished: false });

    const room: GameRoom = {
        roomId,
        player1: { ...p1, roomId },
        player2: { ...p2, roomId },
        questions,
        progress: {
            [p1.userId]: makeProgress(),
            [p2.userId]: makeProgress(),
        },
        startedAt: Date.now(),
        finished: false,
    };

    activeRooms.set(roomId, room);
    playerToRoom.set(p1.userId, roomId);
    playerToRoom.set(p2.userId, roomId);

    // Notify both with opponent info
    sendToPlayer(p1, {
        type: "MATCH_FOUND",
        roomId,
        questions,
        opponent: { userId: p2.userId, displayName: p2.displayName, grade: p2.grade, winRate: p2.winRate, totalScore: p2.totalScore },
    });
    sendToPlayer(p2, {
        type: "MATCH_FOUND",
        roomId,
        questions,
        opponent: { userId: p1.userId, displayName: p1.displayName, grade: p1.grade, winRate: p1.winRate, totalScore: p1.totalScore },
    });

    // Room created — keep server-side only if needed for debugging
}

// ═══════════════════════════════════════════════════════════
// ANSWER HANDLER — each player independent, no shared turn
// ═══════════════════════════════════════════════════════════

function handleAnswer(userId: string, roomId: string, questionIndex: number, answer: string, timeMs: number) {
    const room = activeRooms.get(roomId);
    if (!room || room.finished) return;

    const question = room.questions[questionIndex];
    if (!question) return;

    const prog = room.progress[userId];
    if (!prog) return;

    // Ignore duplicate answers for same question
    if (prog.answers[questionIndex]) return;

    const isCorrect = answer === question.correctAnswer;
    prog.answers[questionIndex] = { answer, isCorrect, timeMs };

    const opponent = getOpponent(room, userId);
    const selfPlayer = room.player1.userId === userId ? room.player1 : room.player2;

    // Notify OPPONENT about this player's progress (count answered so far)
    const answeredCount = Object.keys(prog.answers).length;
    sendToPlayer(opponent, {
        type: "OPPONENT_PROGRESS",
        userId,
        questionIndex,
        isCorrect,
        answeredCount, // how many questions they've completed
    });

    // Check if this player finished all questions
    if (answeredCount >= room.questions.length) {
        prog.finished = true;
        prog.finishedAt = Date.now();

        // Notify self: wait for opponent
        sendToPlayer(selfPlayer, { type: "YOU_FINISHED", waitingFor: opponent.displayName });

        // Notify opponent: this player finished
        sendToPlayer(opponent, {
            type: "OPPONENT_FINISHED",
            userId,
            displayName: selfPlayer.displayName,
            answeredCount,
        });

        // Player finished all questions

        // Check if BOTH finished → game over
        const p1Prog = room.progress[room.player1.userId];
        const p2Prog = room.progress[room.player2.userId];
        if (p1Prog?.finished && p2Prog?.finished) {
            finishGame(room);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// GAME FINISH
// ═══════════════════════════════════════════════════════════

function finishGame(room: GameRoom) {
    if (room.finished) return;
    room.finished = true;
    const p1Stats = calcPlayerStats(room.progress[room.player1.userId]);
    const p2Stats = calcPlayerStats(room.progress[room.player2.userId]);

    // Determine winner (by score; tiebreak by time)
    let winnerId: string | null = null;
    if (p1Stats.score > p2Stats.score) {
        winnerId = room.player1.userId;
    } else if (p2Stats.score > p1Stats.score) {
        winnerId = room.player2.userId;
    } else if (p1Stats.totalTimeMs < p2Stats.totalTimeMs) {
        // Same score — faster player wins
        winnerId = room.player1.userId;
    } else if (p2Stats.totalTimeMs < p1Stats.totalTimeMs) {
        winnerId = room.player2.userId;
    }
    // null = draw

    // 💾 Save to Supabase + get ranking deltas — send GAME_OVER only after save
    (async () => {
        let p1Delta = 0;
        let p2Delta = 0;
        try {
            const deltas = await saveGameMatch({
                room_id: room.roomId,
                player1_id: room.player1.userId,
                player2_id: room.player2.userId,
                player1_display_name: room.player1.displayName,
                player2_display_name: room.player2.displayName,
                player1_score: p1Stats.score,
                player2_score: p2Stats.score,
                player1_correct: p1Stats.correct,
                player2_correct: p2Stats.correct,
                player1_total_time_ms: p1Stats.totalTimeMs,
                player2_total_time_ms: p2Stats.totalTimeMs,
                winner_id: winnerId,
                questions_count: room.questions.length,
            });
            p1Delta = deltas.player1Delta;
            p2Delta = deltas.player2Delta;

            // Update daily task progress for both players (fire-and-forget)
            updateTasksAfterMatch({
                userId: room.player1.userId,
                displayName: room.player1.displayName,
                won: winnerId === room.player1.userId,
                correctCount: p1Stats.correct,
                totalQuestions: room.questions.length,
            }).catch((e) => console.error("[GameShow WS] daily task p1 error:", e));
            updateTasksAfterMatch({
                userId: room.player2.userId,
                displayName: room.player2.displayName,
                won: winnerId === room.player2.userId,
                correctCount: p2Stats.correct,
                totalQuestions: room.questions.length,
            }).catch((e) => console.error("[GameShow WS] daily task p2 error:", e));
        } catch (err) {
            console.error("[GameShow WS] Supabase save error:", err);
        }

        const gameOverPayload = {
            type: "GAME_OVER",
            roomId: room.roomId,
            winnerId,
            results: {
                [room.player1.userId]: { ...p1Stats, displayName: room.player1.displayName, rankingDelta: p1Delta },
                [room.player2.userId]: { ...p2Stats, displayName: room.player2.displayName, rankingDelta: p2Delta },
            },
        };

        sendToPlayer(room.player1, gameOverPayload);
        sendToPlayer(room.player2, gameOverPayload);
    })();

    console.log(
        `[GameShow WS] 🏆 ${room.player1.displayName}(${p1Stats.score}) vs ${room.player2.displayName}(${p2Stats.score}) — winner: ${winnerId ?? 'draw'}`
    );

    // Cleanup
    setTimeout(() => {
        activeRooms.delete(room.roomId);
        playerToRoom.delete(room.player1.userId);
        playerToRoom.delete(room.player2.userId);
    }, 30000);
}

// ═══════════════════════════════════════════════════════════
// DISCONNECT HANDLER
// ═══════════════════════════════════════════════════════════

function handleDisconnect(userId: string) {
    chatRateLimits.delete(userId);

    // Remove from queue
    const queueIdx = waitingQueue.findIndex((p) => p.userId === userId);
    if (queueIdx !== -1) {
        waitingQueue.splice(queueIdx, 1);
        // Player left queue
        return;
    }

    // Remove from active room
    const roomId = playerToRoom.get(userId);
    if (roomId) {
        const room = activeRooms.get(roomId);
        if (room && !room.finished) {
            room.finished = true;
            const opponent = getOpponent(room, userId);
            const p1Stats = calcPlayerStats(room.progress[room.player1.userId]);
            const p2Stats = calcPlayerStats(room.progress[room.player2.userId]);

            // Save match record + award ranking points (fire-and-forget)
            (async () => {
                const matchRecord = {
                    room_id: room.roomId,
                    player1_id: room.player1.userId,
                    player2_id: room.player2.userId,
                    player1_display_name: room.player1.displayName,
                    player2_display_name: room.player2.displayName,
                    player1_score: p1Stats.score,
                    player2_score: p2Stats.score,
                    player1_correct: p1Stats.correct,
                    player2_correct: p2Stats.correct,
                    player1_total_time_ms: p1Stats.totalTimeMs,
                    player2_total_time_ms: p2Stats.totalTimeMs,
                    winner_id: opponent.userId,
                    questions_count: room.questions.length,
                };

                const saveMatch = saveMatchRecord(matchRecord).catch((err) =>
                    console.error("[GameShow WS] saveMatchRecord error:", err)
                );
                const saveRanking = saveDisconnectWin(opponent.userId, opponent.displayName).catch((err) =>
                    console.error("[GameShow WS] saveDisconnectWin error:", err)
                );
                await Promise.all([saveMatch, saveRanking]);
            })();
            sendToPlayer(opponent, {
                type: "OPPONENT_DISCONNECTED",
                message: "Đối thủ đã ngắt kết nối. Bạn thắng mặc định!",
                rankingDelta: 5,
            });
        }
        playerToRoom.delete(userId);
        if (roomId) activeRooms.delete(roomId);
    }
}

// ═══════════════════════════════════════════════════════════
// SETUP — mount WS server on existing HTTP server
// ═══════════════════════════════════════════════════════════

export function setupGameShowWS(httpServer: Server) {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws/gameshow" });
    console.log("[GameShow WS] WebSocket server ready at /ws/gameshow");

    wss.on("connection", (ws) => {
        let currentPlayer: Player | null = null;

        ws.on("message", async (raw) => {
            let msg: WSMessage;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                return;
            }

            switch (msg.type) {
                case "JOIN_QUEUE": {
                    // Verify the JWT token and ensure it belongs to the claimed userId
                    const authed = await verifyToken(msg.token ?? "");
                    if (!authed || authed.id !== msg.userId) {
                        ws.close(4001, "Unauthorized");
                        return;
                    }

                    if (currentPlayer) handleDisconnect(currentPlayer.userId);

                    currentPlayer = {
                        ws,
                        userId: authed.id, // use verified id — never trust client claim
                        displayName: msg.displayName,
                        grade: msg.grade,
                        winRate: msg.winRate,
                        totalScore: msg.totalScore,
                        mode: msg.mode,
                    };

                    // Reconnect to active room if exists
                    const existingRoomId = playerToRoom.get(msg.userId);
                    if (existingRoomId) {
                        const room = activeRooms.get(existingRoomId);
                        if (room && !room.finished) {
                            const isP1 = room.player1.userId === msg.userId;
                            if (isP1) room.player1.ws = ws;
                            else room.player2.ws = ws;
                            const prog = room.progress[msg.userId];
                            sendToPlayer(currentPlayer, {
                                type: "RECONNECTED",
                                roomId: existingRoomId,
                                questions: room.questions,
                                myAnswers: prog?.answers ?? {},
                                myFinished: prog?.finished ?? false,
                            });
                            return;
                        }
                    }

                    waitingQueue.push(currentPlayer);
                    sendToPlayer(currentPlayer, { type: "QUEUED", position: waitingQueue.length });
                    // Player joined matchmaking queue

                    tryMatch();
                    break;
                }

                case "LEAVE_QUEUE": {
                    if (currentPlayer) {
                        handleDisconnect(currentPlayer.userId);
                        currentPlayer = null;
                    }
                    break;
                }

                case "SUBMIT_ANSWER": {
                    if (!currentPlayer) return;
                    // Validate types to prevent prototype pollution / unexpected values
                    const qIdx = Number(msg.questionIndex);
                    const tMs  = Math.max(0, Number(msg.timeMs));
                    if (
                        typeof msg.roomId !== "string" ||
                        !Number.isInteger(qIdx) || qIdx < 0 || qIdx > 99 ||
                        typeof msg.answer !== "string" || msg.answer.length > 200
                    ) return;
                    // Always use the authenticated player's id — never the client-supplied userId
                    handleAnswer(currentPlayer.userId, msg.roomId, qIdx, msg.answer, tMs);
                    break;
                }

                case "SEND_EMOJI": {
                    if (!currentPlayer) return;
                    const emojiRoom = typeof msg.roomId === "string" ? activeRooms.get(msg.roomId) : null;
                    if (!emojiRoom || emojiRoom.finished) return;
                    const inRoom = emojiRoom.player1.userId === currentPlayer.userId || emojiRoom.player2.userId === currentPlayer.userId;
                    if (!inRoom || !ALLOWED_EMOJIS.has(msg.emoji)) return;
                    if (!canSendEmoji(currentPlayer.userId)) return; // silently drop spam
                    const emojiPayload = {
                        type: "EMOJI_RECEIVED",
                        fromUserId: currentPlayer.userId,
                        fromName: currentPlayer.displayName,
                        emoji: msg.emoji,
                        timestamp: Date.now(),
                    };
                    sendToPlayer(emojiRoom.player1, emojiPayload);
                    sendToPlayer(emojiRoom.player2, emojiPayload);
                    break;
                }

                case "SEND_CHAT": {
                    if (!currentPlayer) return;
                    const chatRoom = typeof msg.roomId === "string" ? activeRooms.get(msg.roomId) : null;
                    if (!chatRoom || chatRoom.finished) return;
                    const inChatRoom = chatRoom.player1.userId === currentPlayer.userId || chatRoom.player2.userId === currentPlayer.userId;
                    if (!inChatRoom) return;
                    const text = typeof msg.text === "string" ? msg.text.trim().slice(0, CHAT_MAX_LEN) : "";
                    if (!text) return;
                    if (!canSendChat(currentPlayer.userId)) {
                        sendToPlayer(currentPlayer, { type: "CHAT_RATE_LIMITED" });
                        return;
                    }
                    if (hasProfanity(text)) {
                        sendToPlayer(currentPlayer, { type: "CHAT_MODERATED" });
                        return;
                    }
                    const chatPayload = {
                        type: "CHAT_RECEIVED",
                        fromUserId: currentPlayer.userId,
                        fromName: currentPlayer.displayName,
                        text,
                        timestamp: Date.now(),
                    };
                    sendToPlayer(chatRoom.player1, chatPayload);
                    sendToPlayer(chatRoom.player2, chatPayload);
                    break;
                }

                case "PING": {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "PONG" }));
                    }
                    break;
                }
            }
        });

        ws.on("close", () => {
            if (currentPlayer) handleDisconnect(currentPlayer.userId);
        });

        ws.on("error", (err) => {
            console.error("[GameShow WS] Error:", err.message);
        });
    });

    return wss;
}
