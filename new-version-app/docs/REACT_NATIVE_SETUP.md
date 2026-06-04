# React Native Setup - MathUp Mobile

## 🚀 Nhanh Chóng Bắt Đầu

### 1. Tạo Project

```bash
# Chọn một (nên dùng Expo cho nhanh)
npx create-expo-app MathUpMobile
# hoặc
npx react-native@latest init MathUpMobile
```

### 2. Cài Đặt Dependencies

```bash
cd MathUpMobile

# Supabase & Auth
npm install @supabase/supabase-js @supabase/supabase-react-native

# WebSocket
npm install ws

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# State Management
npm install react-query zustand

# UI Components
npm install react-native-vector-icons react-native-toast-message

# Utilities
npm install date-fns lodash
```

### 3. Cấu Trúc Project

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
│   │   ├── PlayerCard.tsx
│   │   ├── GameResults.tsx
│   │   └── StatCard.tsx
│   │
│   ├── hooks/
│   │   ├── useGameShowWS.ts (copy from new-version-app)
│   │   ├── useAuth.ts
│   │   └── useGameStats.ts
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx (copy from new-version-app)
│   │   └── GameContext.tsx
│   │
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── questionGenerator.ts
│   │   └── api.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   └── game.ts
│   │
│   ├── App.tsx
│   └── index.ts
│
├── app.json
├── package.json
├── tsconfig.json
└── .env
```

---

## 📁 Cách Copy Files

```bash
# Copy from new-version-app
cp ../new-version-app/client/src/hooks/useGameShowWS.ts src/hooks/
cp ../new-version-app/client/src/contexts/auth-context.tsx src/contexts/AuthContext.tsx
cp ../new-version-app/shared/schema.ts src/types/
```

---

## 🔧 Cấu Hình Supabase

Tạo file `src/services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 🌍 Biến Môi Trường (.env)

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
EXPO_PUBLIC_API_URL=https://api.your-domain.com
EXPO_PUBLIC_WS_URL=wss://api.your-domain.com/ws/gameshow
```

---

## ✅ Các Bước Tiếp Theo

Xem các file React Native tại:
- `GameShowScreen.tsx` - Màn hình chơi game
- `ProfileScreen.tsx` - Quản lý tài khoản
- `StatisticsScreen.tsx` - Xem thống kê

