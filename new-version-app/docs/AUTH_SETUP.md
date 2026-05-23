# Authentication & Account Setup

## Overview

The authentication system uses **Supabase OAuth** with Google Sign-In, combined with custom user profiles stored in PostgreSQL.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React)                       │
│  ├─ AuthContext (manages auth state)               │
│  ├─ ProtectedRoute (checks authentication)         │
│  └─ useAuth() hook (provides user/session)         │
└─────────────┬───────────────────────────────────────┘
              │
              ↓ (OAuth flow)
┌─────────────────────────────────────────────────────┐
│           Supabase Auth Service                     │
│  ├─ Google OAuth provider                          │
│  ├─ Session management                             │
│  └─ Token refresh                                  │
└─────────────┬───────────────────────────────────────┘
              │
              ↓ (REST API calls)
┌─────────────────────────────────────────────────────┐
│              Backend (Express)                      │
│  ├─ /api/auth/register                             │
│  ├─ /api/auth/login                                │
│  ├─ /api/users/:id (GET/PATCH)                     │
│  └─ /api/gameshow/stats/:userId                    │
└─────────────┬───────────────────────────────────────┘
              │
              ↓ (Queries)
┌─────────────────────────────────────────────────────┐
│         PostgreSQL (via Supabase)                   │
│  └─ users table (credentials + profile)            │
└─────────────────────────────────────────────────────┘
```

---

## User Data Model

```typescript
interface User {
  id: UUID                    // Unique identifier
  username: string           // Login username
  password: string          // Hashed password (for local auth)
  fullName: string          // Display name
  role: "student" | "parent" | "teacher"
  grade?: string            // e.g., "10A1", "11B2"
  subject?: string          // Math, Physics, etc.
  
  // Gamification
  points: number            // Current points
  streak: number            // Days logged in
  level: number             // 1+
  totalXP: number          // Total experience
  achievements: JSON        // Unlocked badges
  
  createdAt: timestamp      // Account creation date
}
```

---

## Authentication Flows

### 1. Google OAuth Sign-In (Recommended for Mobile)

```typescript
import { useAuth } from '@/contexts/auth-context';

function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();
  
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // Browser/app will redirect to auth callback
      // User automatically logged in
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return (
    <button onClick={handleGoogleLogin} disabled={loading}>
      {loading ? 'Signing in...' : 'Login with Google'}
    </button>
  );
}
```

### 2. Username/Password Login (Local Database)

```typescript
// POST /api/auth/login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user@example.com',
    password: 'password123'
  })
});

const { user } = await response.json();
// Store user locally
localStorage.setItem('user', JSON.stringify(user));
```

### 3. User Registration

```typescript
// POST /api/auth/register
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'newuser',
    password: 'securePassword123',
    fullName: 'Nguyễn Văn A',
    role: 'student',
    grade: '10A1'
  })
});

const { user } = await response.json();
```

---

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request:**
```json
{
  "username": "string (unique)",
  "password": "string (hashed server-side)",
  "fullName": "string",
  "role": "student|parent|teacher",
  "grade": "string (optional)"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "fullName": "string",
    "role": "string",
    "grade": "string",
    "points": 0,
    "level": 1,
    "totalXP": 0,
    "createdAt": "timestamp"
  }
}
```

---

#### POST `/api/auth/login`
Authenticate with credentials.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "fullName": "string",
    "role": "string",
    "grade": "string",
    "points": 0,
    "level": 1,
    "totalXP": 0
  }
}
```

---

### User Profile

#### GET `/api/users/:id`
Get user profile information.

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "fullName": "string",
  "role": "string",
  "grade": "string",
  "points": 0,
  "level": 1,
  "streak": 0,
  "totalXP": 0,
  "achievements": "json",
  "createdAt": "timestamp"
}
```

---

#### PATCH `/api/users/:id`
Update user profile (points, level, streak, etc.).

**Request:**
```json
{
  "points": 100,
  "level": 2,
  "streak": 5,
  "totalXP": 150,
  "grade": "10A2"
}
```

**Response:**
```json
{
  /* Updated user object */
}
```

---

### GameShow Stats

#### GET `/api/gameshow/stats/:userId`
Get player's gameshow statistics.

**Response:**
```json
{
  "totalScore": 2500,
  "rank": 15,
  "matches": 45,
  "wins": 28,
  "winRate": 62.2
}
```

---

#### GET `/api/gameshow/leaderboard?limit=10`
Get top players on the leaderboard.

**Response:**
```json
[
  {
    "rank": 1,
    "userId": "uuid",
    "displayName": "Nguyễn Văn A",
    "totalScore": 5000,
    "avatar": "url"
  }
]
```

---

## Implementation in Mobile Apps

### React Native

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Google Sign-In
import * as WebBrowser from 'expo-web-browser';

const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'exp://192.168.1.1:19000'  // Deep link
    }
  });
};

// Get current user
const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user;
};

// Logout
const logout = async () => {
  const { error } = await supabase.auth.signOut();
};
```

### Flutter

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

// Initialize
await Supabase.initialize(
  url: supabaseUrl,
  anonKey: anonKey,
);

final client = Supabase.instance.client;

// Sign in with Google
await client.auth.signInWithOAuth(
  OAuthProvider.google,
  redirectTo: 'my.app://auth'
);

// Get user
final user = client.auth.currentUser;

// Sign out
await client.auth.signOut();
```

---

## Protected Routes

Wrap pages that require authentication with `ProtectedRoute`:

```typescript
import ProtectedRoute from '@/components/protected-route';
import GameShow from '@/pages/gameshow';

function App() {
  return (
    <Routes>
      <Route
        path="/gameshow"
        component={() => (
          <ProtectedRoute>
            <GameShow />
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
}
```

The `ProtectedRoute` component:
- Checks if user is logged in
- Redirects to `/login` if not authenticated
- Shows loading state while checking auth status

---

## Session Management

### LocalStorage (Web)

```typescript
// After login
const user = response.data.user;
localStorage.setItem('mathocean_user', JSON.stringify(user));

// On app start
const stored = localStorage.getItem('mathocean_user');
if (stored) {
  const user = JSON.parse(stored);
  setCurrentUser(user);
}

// On logout
localStorage.removeItem('mathocean_user');
```

### Mobile (Secure Storage)

For mobile apps, use platform-specific secure storage:

**React Native:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Save
await SecureStore.setItemAsync('user_token', token);

// Retrieve
const token = await SecureStore.getItemAsync('user_token');

// Delete
await SecureStore.deleteItemAsync('user_token');
```

**Flutter:**
```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();

// Save
await storage.write(key: 'user_token', value: token);

// Retrieve
String? token = await storage.read(key: 'user_token');

// Delete
await storage.delete(key: 'user_token');
```

---

## Security Best Practices

✅ **Use HTTPS** - All connections must be encrypted  
✅ **Store tokens securely** - Never in plain localStorage on mobile  
✅ **Validate on backend** - Never trust client-side validation alone  
✅ **Hash passwords** - Use bcrypt or Argon2  
✅ **Use secure cookies** - HttpOnly, Secure, SameSite flags  
✅ **Implement rate limiting** - Prevent brute force attacks  
✅ **Set session timeouts** - Log users out after inactivity  
✅ **Enable CORS properly** - Whitelist only trusted domains  

---

## Environment Configuration

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
VITE_API_URL=https://api.your-domain.com
```

---

## Troubleshooting

### "User not found"
- Check username/email spelling
- Ensure user was registered before login attempt
- Verify database connection

### "Invalid password"
- Password must match stored hash
- Check for leading/trailing spaces
- Verify password wasn't modified

### "OAuth redirect failed"
- Ensure redirect URL matches configured in Supabase
- For mobile: set deep link URL correctly
- Clear browser cache and cookies

### "Session expired"
- Implement automatic token refresh
- Re-authenticate user
- Redirect to login page

---

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Last Updated**: May 1, 2026
