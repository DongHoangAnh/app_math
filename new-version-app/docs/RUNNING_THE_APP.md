# Running MathUp Mobile - Complete Guide

## 🚀 Fastest Way (3 Commands)

### On Windows (PowerShell)
```powershell
cd d:\personalizedmath\new-version-app
npm install
npm start
```

### On Mac/Linux
```bash
cd new-version-app
npm install
npm start
```

---

## 🔧 Prerequisites

- **Node.js** v16+ (https://nodejs.org)
- **npm** or **yarn**
- **Expo CLI** (optional, auto-installed)

---

## 📋 Installation Steps

### 1. Install Node.js
- Go to: https://nodejs.org
- Download LTS version
- Run installer and follow prompts
- Verify: Open terminal and type `node --version`

### 2. Navigate to Project
```bash
cd d:\personalizedmath\new-version-app
```

### 3. Install Dependencies
```bash
npm install
```
This will download ~500MB of packages (takes 2-5 minutes)

### 4. Create Environment File
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### 5. Configure .env
Edit `.env` and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_WS_URL=ws://localhost:5000/ws/gameshow
```

### 6. Start Development Server
```bash
npm start
```

---

## 🎮 Running the App

After running `npm start`, you'll see:

```
expo@49.0.0 start
[project-dir]

> Local:  exp://192.168.1.100:19000
> LAN:    exp://[your-ip]:19000

Scan the QR code above with Expo Go! ▲ Hold Cmd|Ctrl and press D anytime to debug.

Press i: Run on iOS Simulator
Press a: Run on Android Emulator
Press w: Open in web browser
Press r: Reload app
Press m: Toggle menu
```

### Option 1: Expo Go (Easiest)
1. Install Expo Go app on your phone
2. Scan the QR code shown in terminal
3. App opens instantly

### Option 2: Android Emulator
```bash
npm run android
# or press 'a' in the Expo menu
```
Requires Android Studio installed

### Option 3: iOS Simulator (Mac Only)
```bash
npm run ios
# or press 'i' in the Expo menu
```

### Option 4: Web Browser
```bash
npm run web
# or press 'w' in the Expo menu
```

---

## 🎯 Testing the App

### Test Login
1. Tap "Đăng Nhập Với Google" button
2. Sign in with any Google account
3. App redirects to home screen

### Test GameShow
1. From home, tap GameShow icon (🎮)
2. Tap "Tìm Đối Thủ" button
3. (Without backend server, this will show UI but no real opponent)

### Test Profile
1. Tap Profile icon (👤)
2. See user information
3. View stats (will be empty initially)

### Test Statistics
1. Tap Stats icon (📊)
2. View detailed metrics

---

## 🐛 Common Issues & Fixes

### "Module not found" Error
```bash
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install
```

### "EADDRINUSE: Port 19000 already in use"
```bash
# Use different port
npm start -- --port 19001
```

### "Cannot find Supabase URL"
- Verify `.env` file exists
- Check for typos in variable names
- No quotes needed in .env values
- Restart server after editing .env

### "Expo not responding"
```bash
# Kill existing process and restart
npm start
# or press Ctrl+C and run again
```

### "Blank white screen"
- Wait 10-15 seconds for bundle to compile
- Check browser console for errors (press 'D' or 'Cmd+D')
- Reload app (press 'R' in terminal)

### "Cannot connect to Supabase"
- Check internet connection
- Verify Supabase URL format
- Make sure Expo Public keys are correct

---

## 📱 Platform-Specific Setup

### Android
```bash
# Requirements:
# 1. Android Studio installed
# 2. Android SDK (API 21+)
# 3. AVD (Android Virtual Device) created

npm run android
```

### iOS (Mac Only)
```bash
# Requirements:
# 1. Xcode installed
# 2. CocoaPods
# 3. iOS 12+

npm run ios
```

### Web
```bash
npm run web
# Opens in your default browser
```

---

## 🔌 Backend Server

For full functionality including actual GameShow matches:

```bash
# In separate terminal, in project root:
npm run dev

# Or navigate to server folder:
cd server
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`
WebSocket on: `ws://localhost:5000/ws/gameshow`

---

## 🛠️ Development Commands

```bash
# Start dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Clear cache
npm start -- --clear

# Eject from Expo (⚠️ irreversible)
npm run eject
```

---

## 🔍 Debugging

### In Terminal
```
Press 'd' or 'Cmd+D' (iOS) or 'Ctrl+D' (Android)
```

### React DevTools
```
Press 'j' for Chrome DevTools
```

### Network Activity
Check network tab in DevTools to see API calls

### Console Logs
Open DevTools console to see `console.log()` output

---

## 📊 Performance Tips

1. **Use Physical Device** - Better performance than emulator
2. **Close Other Apps** - Free up RAM
3. **Enable USB Debugging** (Android) - Faster than WiFi
4. **Clear Cache** - `npm start -- --clear`
5. **Minimize Animations** - Better performance on older devices

---

## 🚀 Deployment

### Export App
```bash
# Create standalone build
eas build -p android   # Build APK/AAB
eas build -p ios      # Build IPA
```

### Run EAS CLI First
```bash
npm install -g eas-cli
eas login
eas build -p android
```

---

## 📚 Useful Shortcuts

| Key | Action |
|-----|--------|
| `r` | Reload app |
| `i` | Run iOS simulator |
| `a` | Run Android emulator |
| `w` | Open web browser |
| `m` | Toggle menu |
| `j` | Open DevTools |
| `d` | Show QR code |
| `Ctrl+C` | Stop server |

---

## ✅ Success Checklist

- [x] Node.js installed
- [x] Project folder navigated
- [x] Dependencies installed (`npm install`)
- [x] .env file created
- [x] Supabase credentials added
- [x] `npm start` executed
- [x] App running on device/emulator
- [x] Can navigate between screens
- [x] Can test login
- [x] Ready for development!

---

## 🎓 Next Steps

1. **Customize** - Edit colors, fonts, text
2. **Add Features** - Implement new features
3. **Test** - Thoroughly test all functions
4. **Optimize** - Improve performance
5. **Deploy** - Build and release to stores

---

## 📞 Getting Help

If you get stuck:

1. Check `RUN.md` in project folder
2. Read error messages carefully
3. Google the error + "React Native"
4. Check [Expo Docs](https://docs.expo.dev)
5. Check [React Native Docs](https://reactnative.dev)
6. Open issue on GitHub

---

**Ready?** Let's go! 🚀

```bash
npm start
```

---

*Last updated: May 1, 2026*
