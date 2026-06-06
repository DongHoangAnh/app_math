import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { saveGameMatch, saveDisconnectWin, saveMatchRecord, updateTasksAfterMatch, verifyToken, getLockOwnerDeviceId } from "./supabase-server";
import type { GameQuestion, AnswerRecord } from "../shared/types";
import { QUESTIONS_PER_MATCH, CHAT_MAX_LEN } from "../shared/constants";
import { generateQuestions, normalizeMode } from "./questions";
import { canSendEmoji, canSendChat, hasProfanity, isAllowedEmoji, clearRateLimit } from "./rateLimiter";

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
    queuedAt?: number; // when the player entered the waiting queue (for fallback matching)
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
    | { type: "JOIN_QUEUE"; userId: string; token: string; displayName: string; grade?: string; winRate?: number; totalScore?: number; mode?: string; deviceId?: string }
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

// ─── Server-only tunables ───────────────────────────────────
// How often to ping clients + how long a queued player waits for a same-mode
// opponent before we match them with anyone available.
const HEARTBEAT_MS = 30_000;       // ping sweep interval (must be > client app-PING of 25s)
const MATCHMAKING_SWEEP_MS = 2_000; // re-run matchmaking even when nobody new joins
const MATCH_FALLBACK_MS = 12_000;   // after this wait, ignore mode and match anyone

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

function createRoom(p1: Player, p2: Player) {
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

function tryMatch() {
    if (waitingQueue.length < 2) return;

    // Pass 1 — prefer pairing players who picked the SAME mode (best UX:
    // both get the questions they chose). Earliest-waiting player first.
    for (let i = 0; i < waitingQueue.length; i++) {
        const mode1 = normalizeMode(waitingQueue[i].mode);
        for (let j = i + 1; j < waitingQueue.length; j++) {
            if (normalizeMode(waitingQueue[j].mode) === mode1) {
                const [p1] = waitingQueue.splice(i, 1);
                const [p2] = waitingQueue.splice(j - 1, 1); // j shifted left after removing i
                createRoom(p1, p2);
                return tryMatch(); // keep pairing while pairs remain
            }
        }
    }

    // Pass 2 — fallback: if the longest-waiting player has been queued past the
    // threshold, match them with anyone so nobody is stuck waiting forever for a
    // mode nobody else picked. p1 (longest wait) decides the question mode.
    const head = waitingQueue[0];
    if (head && Date.now() - (head.queuedAt ?? 0) >= MATCH_FALLBACK_MS) {
        const p1 = waitingQueue.shift()!;
        const p2 = waitingQueue.shift()!;
        createRoom(p1, p2);
        return tryMatch();
    }
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
    clearRateLimit(userId);

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

type LiveSocket = WebSocket & { isAlive?: boolean };

export function setupGameShowWS(httpServer: Server) {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws/gameshow" });
    console.log("[GameShow WS] WebSocket server ready at /ws/gameshow");

    // Heartbeat — terminate sockets that stop responding (half-open mobile
    // connections that never fire 'close', which would otherwise linger as
    // "ghost" players in the queue/room). Each socket is marked alive on any
    // pong or inbound message; the sweep kills any that missed the last ping.
    const heartbeat = setInterval(() => {
        for (const client of wss.clients) {
            const sock = client as LiveSocket;
            if (sock.isAlive === false) {
                sock.terminate(); // forces a 'close' event → handleDisconnect runs
                continue;
            }
            sock.isAlive = false;
            try { sock.ping(); } catch { /* socket already gone */ }
        }
    }, HEARTBEAT_MS);

    // Matchmaking sweep — re-run matching on a timer so the fallback (match
    // anyone after a long wait) fires even when nobody new joins the queue.
    const matchSweep = setInterval(tryMatch, MATCHMAKING_SWEEP_MS);

    // Don't let these intervals keep the process alive on shutdown.
    heartbeat.unref?.();
    matchSweep.unref?.();

    wss.on("close", () => {
        clearInterval(heartbeat);
        clearInterval(matchSweep);
    });

    wss.on("connection", (ws) => {
        let currentPlayer: Player | null = null;
        const sock = ws as LiveSocket;
        sock.isAlive = true;
        ws.on("pong", () => { sock.isAlive = true; });

        ws.on("message", async (raw) => {
            sock.isAlive = true; // any inbound traffic proves the socket is live
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

                    // Single-device lock: refuse if another device owns this
                    // account's session. A null owner (no lock yet) is allowed
                    // so the very first connection isn't blocked.
                    const lockOwner = await getLockOwnerDeviceId(authed.id);
                    // A client that omits deviceId is intentionally allowed for backward-compat:
                    // the auth token is already verified above (primary security gate), so there
                    // is no data-integrity risk. This WS check is a secondary gate — the REST
                    // acquire endpoint is the primary one.
                    if (lockOwner && msg.deviceId && lockOwner !== msg.deviceId) {
                        ws.close(4002, "Session active on another device");
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

                    currentPlayer.queuedAt = Date.now();
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
                    if (!inRoom || !isAllowedEmoji(msg.emoji)) return;
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
