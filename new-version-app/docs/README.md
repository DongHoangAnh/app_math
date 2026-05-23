# GameShow & Auth Files for Mobile Development

## 📦 Repository Structure

```
new-version-app/
├── server/
│   ├── gameshow-ws.ts          # WebSocket server for multiplayer gameshow
│   └── [routes.ts]             # (Copy separately - auth/user endpoints)
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useGameShowWS.ts        # React hook for WebSocket management
│       ├── contexts/
│       │   └── auth-context.tsx        # Auth state & Supabase integration
│       └── components/
│           └── protected-route.tsx     # Route protection HOC
├── shared/
│   └── schema.ts               # Database schemas (Drizzle ORM)
└── docs/
    ├── README.md               # Overview (this file)
    ├── GAMESHOW_API.md        # WebSocket message protocol
    ├── AUTH_SETUP.md          # Authentication setup guide
    └── DEPLOYMENT.md          # Mobile deployment instructions
```

---

## 🎮 GAMESHOW System

### Architecture
- **Backend**: Node.js + Express + WebSocket
- **Frontend**: React + TypeScript
- **Real-time Communication**: ws (WebSocket library)
- **Database**: PostgreSQL (Supabase)

### Key Features
✅ Multiplayer matchmaking (1v1)  
✅ 1v1 Ranking System (+5 for win, -3 for loss)
✅ 10-question matches  
✅ Independent scoring (players answer independently)  
✅ Real-time opponent progress tracking  
✅ Automatic leaderboard updates  
✅ Disconnection handling & recovery  

### Flow Diagram
```
Player A                 Server                   Player B
  │                        │                         │
  ├─ JOIN_QUEUE ──────────>│                         │
  │                        │<────── JOIN_QUEUE ──────┤
  │                        │                         │
  │  (Match Found)         │                         │
  │<──── MATCH_FOUND ──────┤                         │
  │                        ├────── MATCH_FOUND ────>│
  │                        │                         │
  │  (Both start playing)  │                         │
  │                        │                         │
  ├─ SUBMIT_ANSWER ──────>│                         │
  │                        ├──── OPPONENT_PROGRESS ─>│
  │                        │                         │
  │<──── OPPONENT_PROGRESS ┤                         │
  │                        │<──── SUBMIT_ANSWER ────┤
  │                        │                         │
  │ (Player B finishes)    │                         │
  │<─ OPPONENT_FINISHED ───┤                         │
  │                        ├── OPPONENT_FINISHED ──>│
  │ (Player A finishes)    │                         │
  │<─── YOU_FINISHED ──────┤                         │
  │                        ├────── YOU_FINISHED ───>│
  │                        │                         │
  │ (Both finished)        │                         │
  │<───── GAME_OVER ───────┤                         │
  │                        ├────── GAME_OVER ──────>│
  │                        │                         │
```

---

## 🔐 Authentication System

### Features
✅ Google OAuth via Supabase  
✅ Session management (localStorage)  
✅ User profile (fullName, grade, role)  
✅ Gamification stats (points, level, streak, totalXP)  
✅ Protected routes  

### Auth Flow
```
1. User clicks "Login with Google"
   ↓
2. Redirect to Supabase OAuth
   ↓
3. User authenticates with Google
   ↓
4. Redirect back to /auth/callback
   ↓
5. Store session in AuthContext + localStorage
   ↓
6. Access protected routes
```

### API Endpoints
```
POST /api/auth/register
  Body: { username, password, fullName, role, grade? }
  Response: { user }

POST /api/auth/login
  Body: { username, password }
  Response: { user }

GET /api/users/:id
  Response: { id, username, fullName, role, grade, points, level, streak, totalXP }

PATCH /api/users/:id
  Body: { points?, grade?, level?, streak? }
  Response: { updatedUser }

GET /api/gameshow/leaderboard?limit=10
  Response: [{ rank, displayName, totalScore, avatar }]

GET /api/gameshow/stats/:userId
  Response: { totalScore, rank, matches, wins }
```

---

## 📱 Using in Mobile App

### 1. WebSocket Connection

```typescript
// In React Native or Flutter with WebSocket support
const wsUrl = "wss://your-domain.com/ws/gameshow"; // use wss for HTTPS
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  // Send JOIN_QUEUE
  ws.send(JSON.stringify({
    type: "JOIN_QUEUE",
    userId: "user-123",
    displayName: "John Doe",
    grade: "10A1",
    totalScore: 1500,
    winRate: 65
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === "MATCH_FOUND") {
    // Opponent found! Start game
    console.log("Opponent:", msg.opponent);
    console.log("Questions:", msg.questions);
  }
  
  if (msg.type === "OPPONENT_PROGRESS") {
    // Update opponent progress UI
    console.log(`Opponent answered: ${msg.answeredCount}/10`);
  }
  
  if (msg.type === "GAME_OVER") {
    // Display results
    console.log("Winner:", msg.winnerId);
    console.log("Results:", msg.results);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

### 2. Sending Answers

```typescript
ws.send(JSON.stringify({
  type: "SUBMIT_ANSWER",
  userId: "user-123",
  roomId: "room_1234567_abcdef",
  questionIndex: 0,
  answer: "B",  // or full answer text
  timeMs: 5230    // time spent on this question
}));
```

### 3. Auth Integration (React Native)

```typescript
// Use Supabase SDK for React Native
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sign in with Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'myapp://auth/callback'  // Deep link for mobile
  }
});

// Get user
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;
```

---

## 🏆 Ranking System

The app features a competitive 1v1 ranking system. Points are updated automatically at the end of every match.

### Scoring Logic
| Result | Ranking Points | Description |
| :--- | :--- | :--- |
| **Win** | `+5` | Highest score, or fastest time if scores are tied. |
| **Loss** | `-3` | Lower score or slower time. |
| **Draw** | `±0` | Exactly equal score and time. |
| **Opponent Quit** | `+5` | Awarded if the opponent disconnects mid-match. |

*Note: Ranking points cannot drop below 0.*

### Leaderboard
The **Xếp Hạng** (Leaderboard) screen displays the top 50 players globally. 
- **Real-time**: Updates immediately after `GAME_OVER` via Supabase RPC.
- **Personal Status**: Highlights the current user's rank even if they aren't in the top 50.

---

## 📊 Database Schema

### Users Table
```sql
users {
  id: UUID (primary key)
  username: string (unique)
  password: string (hashed)
  fullName: string
  role: "student" | "parent" | "teacher"
  grade: string (optional) e.g., "10A1"
  subject: string (optional)
  points: integer
  streak: integer
  level: integer
  totalXP: integer
  achievements: JSON
  createdAt: timestamp
}
```

### Game Scores Table
```sql
gameScores {
  id: UUID (primary key)
  userId: UUID (foreign key → users)
  gameType: string
  score: integer
  questionsAnswered: integer
  completedAt: timestamp
}
```

### Questions Table
```sql
questions {
  id: UUID (primary key)
  subject: string
  topic: string
  difficulty: integer (1-5)
  question: string
  options: JSON array
  correctAnswer: string
  explanation: string (optional)
}
```

---

## 🚀 Key Implementation Notes

### For Mobile Developers

1. **WebSocket Reconnection**: If connection drops, automatically reconnect and send `JOIN_QUEUE` again. The server will restore the player to their active room if it exists.

2. **Timeout Handling**: Send `PING` every 25 seconds to keep connection alive (server responds with `PONG`).

3. **Answer Validation**: Client-side check answer against `question.correctAnswer` before submitting. Server validates on receiving.

4. **Progress UI**: Use `opponentAnsweredCount` to show opponent progress as a percentage (e.g., 5/10 = 50%).

5. **Result Persistence**: After `GAME_OVER`, fetch user stats from `GET /api/gameshow/stats/:userId` to get updated leaderboard rank.

6. **LocalStorage**: Store user data in secure device storage (not localStorage on mobile).

### Performance Tips
- Preload opponent info before showing game UI
- Cache questions locally if needed
- Use debouncing for frequent state updates
- Minimize re-renders of opponent progress component
- Compress WebSocket messages if bandwidth-constrained

---

## 🔧 Configuration

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@neon.tech/db
OPENAI_API_KEY=sk-...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Frontend
VITE_API_URL=https://your-api.com
```

### WebSocket URL
- **Local Dev**: `ws://localhost:5000/ws/gameshow`
- **Production**: `wss://your-domain.com/ws/gameshow` (note: use `wss:` for HTTPS)

---

## 📝 API Response Examples

### MATCH_FOUND
```json
{
  "type": "MATCH_FOUND",
  "roomId": "room_1714556400000_abc123",
  "questions": [
    {
      "id": "q1",
      "level": 1,
      "question": "Phép tính 5 + 3 có kết quả là:",
      "options": ["8", "7", "6", "9"],
      "correctAnswer": "8",
      "difficulty": 1
    }
  ],
  "opponent": {
    "userId": "user-456",
    "displayName": "Jane Doe",
    "grade": "10A2",
    "winRate": 70,
    "totalScore": 2000
  }
}
```

### GAME_OVER
```json
{
  "type": "GAME_OVER",
  "roomId": "room_1714556400000_abc123",
  "winnerId": "user-123",
  "results": {
    "user-123": {
      "correct": 8,
      "score": 800,
      "totalTimeMs": 45230,
      "displayName": "John Doe"
    },
    "user-456": {
      "correct": 6,
      "score": 600,
      "totalTimeMs": 48120,
      "displayName": "Jane Doe"
    }
  }
}
```

---

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Query Guide](https://tanstack.com/query/latest)
- [Drizzle ORM Docs](https://orm.drizzle.team/)

---

**Last Updated**: May 1, 2026

For issues or questions, contact the development team.
