# WebSocket Message Protocol

## GameShow WebSocket API Reference

### Connection URL
```
Development: ws://localhost:5000/ws/gameshow
Production:  wss://your-domain.com/ws/gameshow
```

---

## Client → Server Messages

### JOIN_QUEUE
Joins the matchmaking queue to find an opponent.

**Message:**
```json
{
  "type": "JOIN_QUEUE",
  "userId": "string (required)",
  "displayName": "string (required)",
  "grade": "string (optional)",
  "winRate": "number (optional, 0-100)",
  "totalScore": "number (optional)",
  "mode": "string (optional: 'add_sub' | 'mul_div' | 'mixed', default 'mixed')"
}
```

> **`mode`** chọn loại phép tính cho câu số học: `add_sub` (+, −), `mul_div` (×, ÷),
> `mixed` (cả bốn). Mọi chế độ đều xen kẽ câu so sánh (`<`, `>`, `=`) — cứ 3 câu có 1 câu
> so sánh. Cả phòng dùng `mode` của người vào hàng đợi trước để hai bên nhận cùng bộ câu hỏi.
> Mỗi câu hỏi trong `MATCH_FOUND` có thêm trường `type: "arithmetic" | "comparison"` để client
> chọn dạng nhập (bàn phím số cho số học, ba nút `< = >` cho so sánh).

**Example:**
```json
{
  "type": "JOIN_QUEUE",
  "userId": "user-123",
  "displayName": "Nguyễn Văn A",
  "grade": "10A1",
  "winRate": 65,
  "totalScore": 2500
}
```

---

### LEAVE_QUEUE
Leaves the matchmaking queue.

**Message:**
```json
{
  "type": "LEAVE_QUEUE",
  "userId": "string (required)"
}
```

---

### SUBMIT_ANSWER
Submits an answer to a question. Call this for each question answered.

**Message:**
```json
{
  "type": "SUBMIT_ANSWER",
  "userId": "string (required)",
  "roomId": "string (required)",
  "questionIndex": "number (0-9)",
  "answer": "string (exact answer text)",
  "timeMs": "number (milliseconds spent on this question)"
}
```

**Example:**
```json
{
  "type": "SUBMIT_ANSWER",
  "userId": "user-123",
  "roomId": "room_1714556400000_abc123",
  "questionIndex": 0,
  "answer": "8",
  "timeMs": 5230
}
```

---

### PING
Keep-alive message. Server responds with PONG.

**Message:**
```json
{
  "type": "PING"
}
```

---

## Server → Client Messages

### QUEUED
Confirms player has joined the queue. Sent immediately after JOIN_QUEUE.

```json
{
  "type": "QUEUED",
  "position": "number (player's position in queue)"
}
```

---

### MATCH_FOUND
Sent when a match is found with another player. Game is about to start.

```json
{
  "type": "MATCH_FOUND",
  "roomId": "string",
  "questions": [
    {
      "id": "string",
      "level": "number (1-10)",
      "question": "string",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "string (not sent to client initially - for validation only)",
      "difficulty": "number (1-5)"
    }
  ],
  "opponent": {
    "userId": "string",
    "displayName": "string",
    "grade": "string",
    "winRate": "number",
    "totalScore": "number"
  }
}
```

---

### OPPONENT_PROGRESS
Sent when opponent submits an answer. Updates player on opponent's progress.

```json
{
  "type": "OPPONENT_PROGRESS",
  "userId": "string (opponent's userId)",
  "questionIndex": "number",
  "isCorrect": "boolean",
  "answeredCount": "number (total questions answered by opponent so far)"
}
```

---

### OPPONENT_FINISHED
Sent when the opponent has answered all questions and is waiting.

```json
{
  "type": "OPPONENT_FINISHED",
  "userId": "string (opponent's userId)",
  "displayName": "string",
  "answeredCount": "number"
}
```

---

### YOU_FINISHED
Sent when the current player has answered all questions. Indicates waiting for opponent.

```json
{
  "type": "YOU_FINISHED",
  "waitingFor": "string (opponent's displayName)"
}
```

---

### GAME_OVER
Sent when both players have finished. Contains final results.

```json
{
  "type": "GAME_OVER",
  "roomId": "string",
  "winnerId": "string (null if draw)",
  "results": {
    "user-123": {
      "correct": "number (0-10)",
      "score": "number (correct * 100)",
      "totalTimeMs": "number",
      "displayName": "string"
    },
    "user-456": {
      "correct": "number",
      "score": "number",
      "totalTimeMs": "number",
      "displayName": "string"
    }
  }
}
```

---

### OPPONENT_DISCONNECTED
Sent if the opponent disconnects during the game.

```json
{
  "type": "OPPONENT_DISCONNECTED",
  "message": "string (reason message)"
}
```

---

### RECONNECTED
Sent when player reconnects to an active game room after disconnection.

```json
{
  "type": "RECONNECTED",
  "roomId": "string",
  "questions": [
    { /* question objects */ }
  ],
  "myAnswers": {
    "0": { "answer": "8", "isCorrect": true, "timeMs": 5230 },
    "1": { "answer": "3", "isCorrect": true, "timeMs": 4120 }
  },
  "myFinished": "boolean (whether current player finished all questions)"
}
```

---

### PONG
Keep-alive response. Sent in response to PING.

```json
{
  "type": "PONG"
}
```

---

## State Transitions

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    idle (initial)                         │
│                         │                                 │
│                         ↓                                 │
│                    [JOIN_QUEUE sent]                      │
│                         │                                 │
│                         ↓                                 │
│   ┌─────────────────→ queued ←─────────────────┐          │
│   │                   │                        │          │
│   │                   ↓                        │          │
│   │            [MATCH_FOUND received]         │          │
│   │                   │                        │          │
│   │                   ↓                        │          │
│   │            match_found (3s pause)         │          │
│   │                   │                        │          │
│   │                   ↓                        │          │
│   │              playing                       │          │
│   │                   │                        │          │
│   │       ┌───────────┼───────────┐           │          │
│   │       │ (answering questions) │           │          │
│   │       └───────────┼───────────┘           │          │
│   │                   ↓                        │          │
│   │         [YOU_FINISHED received]           │          │
│   │                   ↓                        │          │
│   │          you_finished (waiting)           │          │
│   │                   │                        │          │
│   │                   ↓                        │          │
│   │         [GAME_OVER received]              │          │
│   │                   ↓                        │          │
│   │             game_over (results)           │          │
│   │                   │                        │          │
│   │      ┌────────────┴────────────┐           │          │
│   │      │ [player clicks button]  │           │          │
│   │      └────────────┬────────────┘           │          │
│   │                   ↓                        │          │
│   └─────────────── idle (reset) ────────────────┘          │
│                                                            │
│   Alternative paths:                                      │
│   • opponent_disconnected (if opponent leaves)            │
│   • Can reconnect from any state if connection drops      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Scoring System

- Each correct answer = 100 points
- Winner determined by:
  1. **Highest score** (correct * 100)
  2. **Fastest time** (if scores are equal)
  3. **Draw** (if both score and time are equal)

---

## Error Handling

### Disconnection Scenarios

1. **During Queue**: Player is removed from queue
2. **During Game**: Opponent receives `OPPONENT_DISCONNECTED` and wins by default
3. **Reconnection**: If player reconnects within the game timeout (typically 30s), they restore to their room state

### Client-Side Validation

- Check `answer` against `question.correctAnswer` before submitting
- Track `timeMs` from when question is displayed to when answer is submitted
- Validate `roomId` and `userId` before each submission

---

## Best Practices

✅ Send PING every 25 seconds to keep connection alive  
✅ Handle OPPONENT_DISCONNECTED gracefully (show results)  
✅ Track question timer locally for `timeMs` calculation  
✅ Validate user answers client-side before sending  
✅ Implement auto-reconnect with exponential backoff  
✅ Show opponent progress in real-time via `answeredCount`  

---

**Last Updated**: May 1, 2026
