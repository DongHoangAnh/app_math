import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { saveGameMatch, saveDisconnectWin, saveMatchRecord } from "./supabase-server";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface GameQuestion {
    id: string;
    level: number;
    question: string;
    options: string[];
    correctAnswer: string;
    difficulty: number;
}

interface Player {
    ws: WebSocket;
    userId: string;
    displayName: string;
    grade?: string;
    winRate?: number;
    totalScore?: number;
    roomId?: string;
}

interface PlayerProgress {
    // questionIndex → answer record
    answers: Record<number, { answer: string; isCorrect: boolean; timeMs: number }>;
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
    | { type: "JOIN_QUEUE"; userId: string; displayName: string; grade?: string; winRate?: number; totalScore?: number }
    | { type: "LEAVE_QUEUE"; userId: string }
    | { type: "SUBMIT_ANSWER"; userId: string; roomId: string; questionIndex: number; answer: string; timeMs: number }
    | { type: "PING" };

// ═══════════════════════════════════════════════════════════
// IN-MEMORY STATE
// ═══════════════════════════════════════════════════════════

const waitingQueue: Player[] = [];
const activeRooms = new Map<string, GameRoom>();
const playerToRoom = new Map<string, string>(); // userId → roomId

// ═══════════════════════════════════════════════════════════
// RANDOM QUESTION GENERATOR — lớp 1: +, -, ×, ÷ và so sánh
// ═══════════════════════════════════════════════════════════

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

function makeArithmeticQ(): GameQuestion {
    const op = shuffleArr(["+", "-", "×", "÷"])[0];
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

    return { id: nextQId(), level: 1, question: text, options: numericOptions(answer), correctAnswer: String(answer), difficulty: 1 };
}

function makeComparisonQ(): GameQuestion {
    const a = randInt(1, 9), b = randInt(1, 9);
    const correct = a > b ? ">" : a < b ? "<" : "=";
    return {
        id: nextQId(), level: 1,
        question: `${a}  □  ${b}`,
        options: shuffleArr([">", "<", "="]),
        correctAnswer: correct,
        difficulty: 1,
    };
}

function generateGrade1Questions(count: number): GameQuestion[] {
    return Array.from({ length: count }, (_, i) =>
        i % 3 === 2 ? makeComparisonQ() : makeArithmeticQ()
    );
}

// ═══════════════════════════════════════════════════════════
// LOAD QUESTIONS FROM data.json (fallback: random gen)
// ═══════════════════════════════════════════════════════════

function loadGameQuestions(count = 10): GameQuestion[] {
    try {
        const dataPath = path.join(process.cwd(), "data.json");
        const raw = fs.readFileSync(dataPath, "utf-8");
        const json = JSON.parse(raw);
        const allQuestions = json.questions as any[];

        const valid = allQuestions.filter(
            (q) =>
                Array.isArray(q.choices) &&
                q.choices.length === 4 &&
                typeof q.correct_answer === "number"
        );

        const shuffled = [...valid].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        return selected.map((q, i) => ({
            id: q.id,
            level: i + 1,
            question: q.content,
            options: q.choices,
            correctAnswer: q.choices[q.correct_answer],
            difficulty: q.difficulty === "N" ? 1 : q.difficulty === "T" ? 2 : q.difficulty === "V" ? 3 : 4,
        }));
    } catch {
        return generateGrade1Questions(count);
    }
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
    const questions = loadGameQuestions(10);

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

        ws.on("message", (raw) => {
            let msg: WSMessage;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                return;
            }

            switch (msg.type) {
                case "JOIN_QUEUE": {
                    if (currentPlayer) handleDisconnect(currentPlayer.userId);

                    currentPlayer = {
                        ws,
                        userId: msg.userId,
                        displayName: msg.displayName,
                        grade: msg.grade,
                        winRate: msg.winRate,
                        totalScore: msg.totalScore,
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
                    handleAnswer(msg.userId, msg.roomId, msg.questionIndex, msg.answer, msg.timeMs);
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
