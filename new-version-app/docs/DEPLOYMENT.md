# Mobile Deployment Guide

## Quick Start

This guide helps you deploy the GameShow & Auth modules to your mobile app.

---

## Files Included

```
new-version-app/
├── server/
│   └── gameshow-ws.ts              ← WebSocket server
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useGameShowWS.ts    ← React hook for WebSocket
│       ├── contexts/
│       │   └── auth-context.tsx    ← Auth state management
│       └── components/
│           ├── protected-route.tsx ← Route protection
│           └── game-results.tsx    ← Results display
├── shared/
│   └── schema.ts                   ← Database schemas
└── docs/
    ├── README.md                   ← Full overview
    ├── GAMESHOW_API.md            ← WebSocket protocol
    ├── AUTH_SETUP.md              ← Authentication guide
    └── DEPLOYMENT.md              ← This file
```

---

## Step 1: Backend Setup

### Install Dependencies

```bash
npm install ws express-session connect-pg-simple passport
```

### Set Up WebSocket Server

Copy `server/gameshow-ws.ts` and integrate into your Express server:

```typescript
import { createServer } from 'http';
import express from 'express';
import { setupGameShowWS } from './server/gameshow-ws';

const app = express();
const httpServer = createServer(app);

// ... middleware setup ...

// Setup GameShow WebSocket
setupGameShowWS(httpServer);

httpServer.listen(5000, () => {
  console.log('Server running on port 5000');
  console.log('WebSocket available at ws://localhost:5000/ws/gameshow');
});
```

### Database Setup

Copy `shared/schema.ts` and run migrations:

```bash
npm run db:push
```

This creates the required tables:
- `users` - User accounts and profiles
- `gameScores` - Game match results
- `questions` - Quiz questions
- `assessments` - Assessment results

---

## Step 2: Frontend Setup (React)

### Install Dependencies

```bash
npm install @supabase/supabase-js wouter
```

### Set Up Auth Context

Copy `client/src/contexts/auth-context.tsx` to your project:

```
src/contexts/auth-context.tsx
```

Wrap your app with AuthProvider:

```typescript
import { AuthProvider } from '@/contexts/auth-context';

function App() {
  return (
    <AuthProvider>
      {/* Your routes */}
    </AuthProvider>
  );
}
```

### Add WebSocket Hook

Copy `client/src/hooks/useGameShowWS.ts` to:

```
src/hooks/useGameShowWS.ts
```

### Add Components

Copy these components:

```
src/components/protected-route.tsx
src/components/game-results.tsx
```

---

## Step 3: Integrate GameShow

### Create GameShow Page

```typescript
import { useGameShowWS } from '@/hooks/useGameShowWS';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';

export default function GameShow() {
  const { user } = useAuth();
  const [myStats, setMyStats] = useState(null);
  
  const { state, joinQueue, leaveQueue, submitAnswer } = useGameShowWS(
    user?.id ?? null,
    user?.user_metadata?.full_name ?? 'Anonymous',
    user?.user_metadata?.grade,
    myStats?.totalScore ?? 0,
    myStats?.winRate ?? 0
  );
  
  useEffect(() => {
    // Fetch user stats from /api/gameshow/stats/:userId
  }, [user]);
  
  return (
    <div>
      {state.phase === 'idle' && (
        <button onClick={joinQueue}>
          Find Opponent
        </button>
      )}
      {/* ... render based on state.phase ... */}
    </div>
  );
}
```

---

## Step 4: Mobile App Integration

### React Native

```typescript
import { useGameShowWS } from '@/hooks/useGameShowWS';

export default function GameShowScreen() {
  const { state, joinQueue, submitAnswer } = useGameShowWS(userId, name);
  
  const handleJoin = () => {
    joinQueue();
  };
  
  const handleAnswer = (questionIndex, answer) => {
    submitAnswer(questionIndex, answer);
  };
  
  return (
    <View style={styles.container}>
      {state.phase === 'idle' && (
        <TouchableOpacity onPress={handleJoin}>
          <Text>Find Opponent</Text>
        </TouchableOpacity>
      )}
      {state.phase === 'playing' && (
        <GameQuestion 
          question={state.questions[state.currentQuestionIndex]}
          onAnswer={handleAnswer}
        />
      )}
    </View>
  );
}
```

### Flutter

```dart
// Use Supabase realtime or a WebSocket library
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';

class GameShowManager {
  late WebSocketChannel channel;
  
  void connect() {
    channel = WebSocketChannel.connect(
      Uri.parse('wss://your-domain.com/ws/gameshow'),
    );
    
    channel.stream.listen((message) {
      final data = jsonDecode(message);
      handleMessage(data);
    });
  }
  
  void joinQueue(String userId, String name) {
    channel.sink.add(jsonEncode({
      'type': 'JOIN_QUEUE',
      'userId': userId,
      'displayName': name,
    }));
  }
  
  void submitAnswer(String roomId, int index, String answer, int timeMs) {
    channel.sink.add(jsonEncode({
      'type': 'SUBMIT_ANSWER',
      'userId': userId,
      'roomId': roomId,
      'questionIndex': index,
      'answer': answer,
      'timeMs': timeMs,
    }));
  }
  
  void dispose() {
    channel.sink.close();
  }
}
```

---

## Step 5: Environment Configuration

### Create `.env.local`

```bash
# API Configuration
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Load Environment in App

```typescript
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
```

---

## Step 6: Testing

### Test WebSocket Connection

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test WebSocket
wscat -c ws://localhost:5000/ws/gameshow
```

Send messages:

```json
{"type": "JOIN_QUEUE", "userId": "test-1", "displayName": "Player 1"}
{"type": "PING"}
```

### Test Auth Flow

1. Navigate to `/login`
2. Click "Login with Google"
3. Authenticate with Google account
4. Verify redirect to callback URL
5. Check user data in localStorage

### Test GameShow

1. Log in with 2 accounts (browser + incognito)
2. Both click "Find Opponent"
3. Verify match found within 10 seconds
4. Answer questions
5. Verify results display correctly

---

## Deployment Checklist

- [ ] Database migrations applied (`npm run db:push`)
- [ ] Environment variables configured in production
- [ ] CORS headers configured for all domains
- [ ] WebSocket URL set to `wss://` (secure)
- [ ] HTTPS certificate installed
- [ ] Auth callback URL set in Supabase dashboard
- [ ] Deep link URL configured for mobile apps
- [ ] Rate limiting enabled on API endpoints
- [ ] Session timeout configured
- [ ] Error logging set up
- [ ] Monitoring/alerting enabled
- [ ] Backup strategy for database
- [ ] CDN configured for static assets

---

## Performance Optimization

### Client-Side

```typescript
// Lazy load GameShow component
const GameShow = lazy(() => import('@/pages/gameshow'));

// Memoize components to prevent unnecessary re-renders
const GameQuestion = memo(({ question, onAnswer }) => {
  return /* component */;
});

// Use React Query for data fetching
const { data: stats } = useQuery(['gameshow-stats', userId], 
  () => fetch(`/api/gameshow/stats/${userId}`).then(r => r.json())
);
```

### Server-Side

```typescript
// Connection pooling
const pool = new Pool({
  max: 20,  // max connections
  min: 5    // min connections
});

// Cache leaderboard (update every 5 minutes)
setInterval(updateLeaderboardCache, 5 * 60 * 1000);

// Compress responses
app.use(compression());
```

---

## Monitoring

### Logs

```typescript
// Server logs
console.log(`[GameShow WS] Player ${userId} joined queue`);
console.error(`[GameShow WS] Error:`, error);

// Client logs
console.error('WebSocket error:', error);
```

### Metrics

Track these metrics:

- Average match wait time
- Player disconnect rate
- Average game duration
- Questions answered per minute
- Win rate distribution

---

## Support & Troubleshooting

### Connection Issues

```
Error: "Cannot establish WebSocket connection"
→ Check firewall allows WebSocket (port 5000/443)
→ Verify domain name and certificate
→ Check /ws/gameshow path is correct
```

### Session Issues

```
Error: "User not authenticated"
→ Check AuthContext is wrapping component
→ Verify token is stored correctly
→ Check session timeout setting
```

### Database Issues

```
Error: "Connection refused"
→ Verify DATABASE_URL is correct
→ Check PostgreSQL server is running
→ Verify credentials in .env
→ Run: npm run db:push
```

---

## Next Steps

1. **Customization**: Modify UI components to match your brand
2. **Analytics**: Add event tracking for user behavior
3. **Notifications**: Implement push notifications for opponents
4. **Achievements**: Create badge/achievement system
5. **Friends**: Add friend list and private matches

---

## Resources

- [WebSocket Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Supabase Deployment](https://supabase.com/docs/guides/hosting)
- [React Native WebSocket](https://reactnative.dev/docs/network)
- [Flutter WebSocket](https://pub.dev/packages/web_socket_channel)

---

**Last Updated**: May 1, 2026

For additional support, contact your development team.
