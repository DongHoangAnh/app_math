# React Native Implementation Guide

## 📱 Quick Setup - 15 Minutes

### Step 1: Create Project

```bash
# Option A: Expo (Recommended for beginners)
npx create-expo-app MathUpMobile
cd MathUpMobile

# Option B: React Native CLI
npx react-native@latest init MathUpMobile
cd MathUpMobile
```

### Step 2: Install Core Dependencies

```bash
npm install \
  @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context \
  @supabase/supabase-react-native @react-native-async-storage/async-storage \
  react-query axios
```

### Step 3: Copy Files From new-version-app

```bash
# Copy hooks
cp -r ../new-version-app/client/src/hooks/* ./src/hooks/

# Copy screens & components
cp -r ../new-version-app/client/src/screens/* ./src/screens/
cp -r ../new-version-app/client/src/components/* ./src/components/

# Copy services
cp -r ../new-version-app/client/src/services/* ./src/services/

# Copy shared types
cp ../new-version-app/shared/schema.ts ./src/types/schema.ts

# Copy context
cp ../new-version-app/client/src/contexts/* ./src/hooks/
```

### Step 4: Create .env File

```bash
# Create .env file
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
EXPO_PUBLIC_API_URL=https://api.your-domain.com
EXPO_PUBLIC_WS_URL=wss://api.your-domain.com/ws/gameshow
EOF
```

### Step 5: Update App.tsx

Copy provided `App.tsx` to `./src/App.tsx` or `./App.tsx`

### Step 6: Run!

```bash
# Expo
npm start

# React Native
npm run android
# or
npm run ios
```

---

## 📁 Project Structure

```
MathUpMobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── GameShowScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── StatisticsScreen.tsx
│   │
│   ├── components/
│   │   ├── GameQuestion.tsx
│   │   ├── GameResults.tsx
│   │   └── PlayerCard.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGameShowWS.ts
│   │   └── useGameStats.ts
│   │
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── api.ts
│   │   └── questionGenerator.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── App.tsx
│
├── app.json
├── package.json
├── .env
└── tsconfig.json
```

---

## 🎮 Key Features Implemented

### 1. **Authentication (Google OAuth)**
- User signs in with Google
- Session persisted in AsyncStorage
- Auto-login if session valid
- Sign out functionality

### 2. **GameShow (Multiplayer Quiz)**
- Join queue to find opponent
- 10-question matches
- Real-time opponent tracking
- Score calculation
- Results display

### 3. **Profile Management**
- View user stats
- Update profile info
- View achievements
- Sign out

### 4. **Statistics Dashboard**
- Win rate tracking
- Streak counter
- Level progression
- Achievement badges

### 5. **Real-time WebSocket**
- Automatic matchmaking
- Live game updates
- Opponent disconnection handling
- Auto-reconnect support

---

## 📖 Usage Examples

### Using useAuth Hook

```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <TouchableOpacity onPress={signInWithGoogle}>
        <Text>Login</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <Text>Welcome {user.user_metadata?.full_name}</Text>
      <TouchableOpacity onPress={signOut}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Using useGameShowWS Hook

```typescript
import { useGameShowWS } from './hooks/useGameShowWS';

function GameShow() {
  const { state, joinQueue, submitAnswer } = useGameShowWS(
    userId,
    playerName,
    grade,
    totalScore,
    winRate
  );

  const handleAnswer = (questionIndex, answer) => {
    submitAnswer(questionIndex, answer);
  };

  return (
    <View>
      {state.phase === 'idle' && (
        <Button title="Find Opponent" onPress={joinQueue} />
      )}
      
      {state.phase === 'playing' && (
        <GameQuestion
          question={state.questions[state.currentQuestionIndex]}
          onSelectAnswer={handleAnswer}
        />
      )}

      {state.phase === 'game_over' && (
        <GameResults
          playerScore={state.myScore}
          opponentScore={state.opponentScore}
          playerTime={state.myTotalTime}
          opponentTime={state.opponentTotalTime}
        />
      )}
    </View>
  );
}
```

### Using useGameStats Hook

```typescript
import { useGameStats } from './hooks/useGameStats';

function StatsScreen() {
  const { stats, loading, refetch } = useGameStats(userId);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView>
      <Text>Total Matches: {stats?.totalMatches}</Text>
      <Text>Win Rate: {stats?.winRate.toFixed(1)}%</Text>
      <Text>Best Streak: {stats?.bestStreak}</Text>
      
      <Button title="Refresh" onPress={refetch} />
    </ScrollView>
  );
}
```

---

## 🚀 Testing Before Production

### 1. Test Authentication
```bash
# Start login flow
- Tap "Login with Google"
- Authenticate with Google account
- Verify redirect to app
- Check user data in state
```

### 2. Test GameShow
```bash
# Start on 2 devices/emulators
- Both: Tap "Find Opponent"
- Wait ~5 seconds for match
- Both answer questions
- Verify results display
```

### 3. Test WebSocket Connection
```bash
# Check network tab
- WebSocket connects to wss://
- Messages sent/received
- Auto-reconnect on disconnect
```

### 4. Test Stats
```bash
# Check stats screen
- Stats load after game
- New points reflect
- Level updates correctly
```

---

## 📱 Device Testing

### iOS Simulator
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Physical Device (Expo)
```bash
npm start
# Scan QR code with Expo app
```

---

## 🐛 Common Issues

### "Cannot find module '@supabase/supabase-react-native'"
```bash
npm install @supabase/supabase-react-native
npm install @react-native-async-storage/async-storage
```

### "Environment variable not found"
- Check .env file exists
- Verify variable names (must start with `EXPO_PUBLIC_` for Expo)
- Restart dev server after changing .env

### "WebSocket connection failed"
- Check firewall allows 443 port
- Verify WSS URL is correct (wss://, not ws://)
- Check backend server is running

### "Google Sign-In not working"
- Verify Google OAuth credentials
- Check redirect URL in Supabase
- Deep link URL matches project

---

## 📦 Package.json Example

```json
{
  "name": "mathup-mobile",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "test": "jest"
  },
  "dependencies": {
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/native-stack": "^6.9.0",
    "react-native-screens": "^3.22.0",
    "react-native-safe-area-context": "^4.6.0",
    "@supabase/supabase-react-native": "^0.3.0",
    "@react-native-async-storage/async-storage": "^1.18.2",
    "react-query": "^3.39.0",
    "axios": "^1.6.0",
    "expo": "^49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.4"
  }
}
```

---

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Copy files from new-version-app
3. ✅ Configure .env
4. ✅ Test on simulator/device
5. ✅ Customize UI colors & styles
6. ✅ Add more features (achievements, notifications, etc)
7. ✅ Deploy to App Store / Play Store

---

## 📞 Support

For issues or questions:
- Check [React Native docs](https://reactnative.dev/)
- Check [Expo docs](https://docs.expo.dev/)
- Check [Supabase docs](https://supabase.com/docs)

---

**Last Updated**: May 1, 2026
