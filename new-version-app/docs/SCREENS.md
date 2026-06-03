# Mô tả các màn hình — MathUp Mobile

Tài liệu mô tả đầy đủ tất cả các màn hình (screen) của ứng dụng **MathUp** — game thi đấu toán học 1v1 real-time. Tất cả màn hình nằm trong [client/src/screens/](../client/src/screens/), giao diện 100% tiếng Việt, theo bộ màu cam chủ đạo (`C.primary` = `#FF6B35`) định nghĩa trong [client/src/theme.ts](../client/src/theme.ts).

---

## Sơ đồ điều hướng

Điều hướng được khai báo trong [client/src/App.tsx](../client/src/App.tsx) với hai lớp:

```
RootNavigator (Native Stack — quyết định theo trạng thái đăng nhập)
│
├── CHƯA đăng nhập (user == null)
│   ├── Login            → LoginScreen
│   ├── Register         → RegisterScreen
│   └── ForgotPassword   → ForgotPasswordScreen
│
└── ĐÃ đăng nhập (user != null)
    ├── passwordRecovery == true  → ResetPassword (ResetPasswordScreen)
    └── ngược lại → MainApp (Bottom Tab Navigator)
        ├── HomeTab          🏡 Trang Chủ   → HomeScreen
        ├── GameShowTab      🎮 Đấu         → GameShowScreen
        ├── LeaderboardTab   🏆 Xếp Hạng    → LeaderboardScreen
        ├── StatsTab         📈 Thống Kê    → StatisticsScreen   (ẩn khỏi tab bar)
        ├── MatchHistoryTab  📜 Lịch Sử     → MatchHistoryScreen (ẩn khỏi tab bar)
        └── ProfileTab       😊 Hồ Sơ       → ProfileScreen
```

- **Tab bar** hiển thị 4 mục: Trang Chủ, Đấu, Xếp Hạng, Hồ Sơ. Hai màn `StatsTab` và `MatchHistoryTab` dùng `tabBarButton: () => null` nên **không hiện trên thanh tab** — chỉ truy cập được qua điều hướng nội bộ (từ Home hoặc màn Đấu).
- **NotFoundScreen** là màn fallback đơn giản ("Screen not found"), không gắn vào navigator chính.
- **Deep link** (`useDeepLinkHandler`) bắt URL `auth/callback` và `auth/reset-password` trên native để hoàn tất phiên OAuth / đặt lại mật khẩu (web do Supabase tự xử lý).

---

## Nhóm 1 — Xác thực (chưa đăng nhập)

### 1. LoginScreen — Đăng nhập
**File:** [client/src/screens/LoginScreen.tsx](../client/src/screens/LoginScreen.tsx)

Màn hình đăng nhập đầu tiên người dùng thấy khi chưa có phiên.

- **Hero**: logo mascot ✏️, tên app "MathUp", tagline "Thách đấu toán học 1v1 🔥".
- **Đăng nhập Google**: nút "Tiếp tục với Google" gọi `signInWithGoogle()` (OAuth qua Supabase), có loading riêng và animation scale khi nhấn.
- **Đăng nhập email/mật khẩu**: ô email + ô mật khẩu (nút 👁️ bật/tắt hiển thị), gọi `signInWithEmail()`.
- **Liên kết**: "Quên mật khẩu?" → `ForgotPassword`; footer "Đăng ký ngay 🎉" → `Register`.
- **Xử lý lỗi**: hàm `translateAuthError()` dịch lỗi Supabase sang tiếng Việt (sai mật khẩu, email chưa xác nhận, quá nhiều lần thử, không tìm thấy tài khoản...).
- Dùng `KeyboardAvoidingView` + `ScrollView` để không bị bàn phím che.

### 2. RegisterScreen — Đăng ký
**File:** [client/src/screens/RegisterScreen.tsx](../client/src/screens/RegisterScreen.tsx)

Tạo tài khoản mới.

- **Hero**: mascot 🌟, tiêu đề "Tạo Tài Khoản".
- **Đăng ký Google** hoặc **form**: Họ và tên, Email, Mật khẩu, Xác nhận mật khẩu.
- **Validation**:
  - Tên qua `validateDisplayName()` (báo lỗi real-time dưới ô nhập, tối đa 30 ký tự).
  - Mật khẩu tối thiểu 8 ký tự, xác nhận phải khớp (viền ô đổi xanh/đỏ theo trạng thái khớp).
- Gọi `signUp(email, password, fullName)`.
- **Trạng thái thành công**: thay form bằng hộp 🎉 "Đăng ký thành công!" + hướng dẫn kiểm tra email + nút "Đăng Nhập Ngay →".
- `translateRegisterError()` dịch lỗi (email đã đăng ký, email không hợp lệ, mật khẩu yếu, rate limit).

### 3. ForgotPasswordScreen — Quên mật khẩu
**File:** [client/src/screens/ForgotPasswordScreen.tsx](../client/src/screens/ForgotPasswordScreen.tsx)

Gửi email khôi phục mật khẩu.

- **Hero**: icon 🔐, tiêu đề "Quên mật khẩu?".
- Nhập email (validate định dạng bằng regex), gọi `sendPasswordResetEmail()`.
- **Bảo mật chống user enumeration**: dù email tồn tại hay không, luôn hiển thị màn thành công 📬 "Kiểm tra hộp thư!" (không tiết lộ email có trong hệ thống không).
- Có gợi ý kiểm tra Spam/Junk và nút "Gửi lại với email khác".
- Nút "← Quay lại" và footer "Đăng nhập ngay →".

---

## Nhóm 2 — Đặt lại mật khẩu (đã đăng nhập qua link email)

### 4. ResetPasswordScreen — Đặt mật khẩu mới
**File:** [client/src/screens/ResetPasswordScreen.tsx](../client/src/screens/ResetPasswordScreen.tsx)

Hiển thị khi `passwordRecovery == true` (người dùng vào app từ link đặt lại mật khẩu trong email).

- **Hero**: icon 🔑, tiêu đề "Đặt mật khẩu mới".
- Ô **Mật khẩu mới** + **Xác nhận mật khẩu** (mỗi ô có nút 👁️).
- **Thanh đo độ mạnh mật khẩu** (`getPasswordStrength`): 5 mức Rất yếu → Rất mạnh, đổi màu theo điểm (độ dài ≥8, ≥12, có chữ hoa, có số, có ký tự đặc biệt).
- **Checklist gợi ý** (PwdHint): tích ✓ từng tiêu chí khi đạt.
- Validate: tối thiểu 8 ký tự + hai ô khớp nhau. Gọi `confirmPasswordReset()`.
- **Trạng thái thành công**: màn 🎉 "Đặt lại thành công!".
- Nút "Huỷ — đăng xuất" gọi `signOut()`.

---

## Nhóm 3 — Ứng dụng chính (Bottom Tabs)

### 5. HomeScreen — Trang Chủ
**File:** [client/src/screens/HomeScreen.tsx](../client/src/screens/HomeScreen.tsx)

Màn hub trung tâm sau khi đăng nhập.

- **Header cam bo tròn**: avatar (chữ cái đầu tên), lời chào theo giờ trong ngày (sáng/chiều/tối), tên người dùng, pill 🏆 điểm xếp hạng.
- **Hàng 3 chỉ số**: ⭐ Điểm (ranking_points), 🔥 Streak, 🎯 Thắng — lấy từ bảng `user_profiles` (Supabase) và API `/api/gameshow/stats/:userId`.
- **Nút Đấu 1v1 lớn** (battle card đen, icon 🎮): điều hướng tới `GameShowTab`.
- **Rule chips**: 🏅 Thắng +5 · 💔 Thua −3 · 🤝 Hoà ±0.
- **Lưới Khám phá**: 3 thẻ điều hướng → Xếp Hạng, Thống Kê, Hồ Sơ.
- **Nhiệm vụ hôm nay** (Daily Tasks qua `useDailyTasks`):
  - Thanh tiến trình EXP (`getLevelProgress`) + `LevelBadge`.
  - Mỗi nhiệm vụ là `TaskRow`: tiêu đề, mô tả, thanh tiến độ progress/target, phần thưởng EXP. Nút "Nhận" khi hoàn thành (gọi `claimExp`, hiện Alert thưởng), badge ✓ khi đã nhận.
- **Tip banner** 💡 nhắc hoàn thành nhiệm vụ hằng ngày.

### 6. GameShowScreen — Đấu 1v1 (màn quan trọng nhất)
**File:** [client/src/screens/GameShowScreen.tsx](../client/src/screens/GameShowScreen.tsx)

Toàn bộ vòng đời trận đấu real-time qua hook `useGameShowWS()` (WebSocket). Màn render khác nhau theo `state.phase`:

| Phase | Giao diện |
|-------|-----------|
| **idle** | "⚔️ Chế Độ PK", chọn 1 trong 3 chế độ (Cộng/Trừ · Nhân/Chia · Hỗn hợp), hiện điểm xếp hạng, nút "Vào trận ngay ⚔️", nút "📜 Lịch sử đấu" → `MatchHistoryTab`. Báo nếu chưa đăng nhập. |
| **queued** | Màn "Đang tìm đối thủ..." với avatar VS, nút "Huỷ tìm" (`leaveQueue`). |
| **match_found** | Hiện 2 đấu thủ (🐱 mình vs 🐻 đối thủ) + đếm ngược 3-2-1-🚀. |
| **playing** | Màn chơi chính (xem dưới). |
| **you_finished** | "✅ Bạn đã hoàn thành!", chờ đối thủ, hiện điểm + **panel chat đầy đủ** (emoji + nhắn tin). |
| **game_over** | Render component [`GameResults`](../client/src/components/GameResults.tsx) — so điểm, thời gian, biến động điểm xếp hạng, nút chơi lại. |
| **opponent_disconnected** | "🏃 Đối thủ bỏ cuộc!" thắng mặc định, +điểm, nút "Chơi Trận Mới". |

**Chi tiết phase `playing`:**
- **Battle header**: điểm mình vs số câu đối thủ đã trả lời, thanh **timer** (10 giây/câu, đổi màu xanh→vàng→đỏ).
- **Thẻ câu hỏi**: số thứ tự "Câu X/10". Hỗ trợ 2 loại:
  - *arithmetic* → **bàn phím số** tự chế (0–9, ⌫, nút ✓ nhập), ô hiển thị số đang nhập.
  - *comparison* → 3 nút lớn `<` `=` `>` (highlight đúng/sai khi reveal).
- **Progress dots**: chấm tròn cho từng câu (xanh đúng / đỏ sai / cam câu hiện tại).
- **Hết giờ tự nộp**: timer về 0 sẽ tự nộp `__timeout__`.
- **Chat & emoji real-time**: thanh chat dưới cùng, 6 emoji nhanh (🔥😎👍😅💀🎉) bay lên kiểu Google Meet (`spawnFloatingEmoji`), ô nhắn tin có **lọc từ cấm tiếng Việt** phía client (`VI_CLIENT_BANNED`).

### 7. LeaderboardScreen — Bảng Xếp Hạng
**File:** [client/src/screens/LeaderboardScreen.tsx](../client/src/screens/LeaderboardScreen.tsx)

- **Header**: "🏆 Bảng Xếp Hạng", "Top 50 người chơi", rule pills (Thắng +5 / Thua −3 / Min 0).
- Tải top 50 từ `user_profiles` (Supabase) sắp theo `ranking_points` giảm dần.
- **Thẻ "Xếp hạng của bạn"**: hiện hạng (#) và điểm của user hiện tại (nếu có trong top 50).
- **Danh sách** (`FlatList`): mỗi dòng có hạng (🥇🥈🥉 cho top 3, số cho còn lại), avatar chữ cái, tên, điểm. Dòng của chính mình được tô viền cam + badge "BẠN".
- **Pull-to-refresh** + trạng thái loading / lỗi (nút "Thử lại") / rỗng.

### 8. StatisticsScreen — Thống Kê
**File:** [client/src/screens/StatisticsScreen.tsx](../client/src/screens/StatisticsScreen.tsx)
*(Truy cập từ Home → "Thống Kê"; ẩn khỏi tab bar.)*

- **Header**: "📈 Thống Kê".
- Lấy số liệu từ API `/api/gameshow/stats/:userId` + EXP/level từ `user_profiles`.
- **Lưới 2×2 chỉ số chính**: 🎮 Trận chơi · 🥇 Chiến thắng · 📈 Tỷ lệ thắng · ⭐ Tổng điểm.
- **Chuỗi thắng**: 🔥 hiện tại · ⚡ tốt nhất.
- **Cấp độ**: component `LevelCard` (level + tổng EXP).
- **Hiệu suất**: Điểm TB/trận, Tỷ lệ trả lời đúng, Trung bình thời gian/trận.
- **Thành tựu** (badges): 🌟 Bắt Đầu · 🔥 Nóng Lên · 🏅 Nhân Phẩm · 💎 Kim Cương.
- Có spinner khi đang tải.

### 9. MatchHistoryScreen — Lịch Sử Đấu
**File:** [client/src/screens/MatchHistoryScreen.tsx](../client/src/screens/MatchHistoryScreen.tsx)
*(Truy cập từ màn Đấu (phase idle) → "📜 Lịch sử đấu"; ẩn khỏi tab bar.)*

- **Header** có nút quay lại "‹" → `GameShowTab`, tiêu đề "📜 Lịch sử đấu".
- Tải từ API `/api/gameshow/matches/:userId` với **phân trang** (5 trận/lần, infinite scroll qua `onEndReached`).
- **Tự tải lại** mỗi khi màn được focus (`useFocusEffect`) để cập nhật trận mới nhất.
- Mỗi trận là một card: badge kết quả (🏆 Thắng / 💪 Thua / 🤝 Hòa), tên đối thủ, số câu đúng, ngày giờ (`fmtDate`), tỉ số, biến động điểm xếp hạng (màu theo +/−).
- Trạng thái: loading, lỗi (nút "Thử lại"), rỗng ("🗒️ Chưa có trận nào"), footer "— Hết —" khi tải hết.

### 10. ProfileScreen — Hồ Sơ
**File:** [client/src/screens/ProfileScreen.tsx](../client/src/screens/ProfileScreen.tsx)

- **Header cam**: avatar (ảnh từ `avatar_url` hoặc chữ cái đầu) với **badge ✏️** chỉnh sửa, tên, lớp (grade nếu có).
- **Hàng chỉ số header**: 🏆 Xếp Hạng · ⭐ Level · 🔥 Streak.
- **Lưới thống kê 2×2**: 🎮 Trận chơi · 🥇 Thắng · 📈 Tỷ lệ thắng · ⭐ Tổng điểm (từ API stats).
- **Menu Cài đặt**: 👤 Chỉnh sửa hồ sơ (mở `EditProfileModal`), 💬 Trợ Giúp, 📋 Điều Khoản.
- **Nút Đăng Xuất** 🚪 (gọi `signOut`).
- **EditProfileModal** ([component](../client/src/components/EditProfileModal.tsx)): chỉnh tên + avatar, gọi `onSaved` cập nhật lại màn.

---

## Nhóm 4 — Tiện ích

### 11. NotFoundScreen
**File:** [client/src/screens/NotFoundScreen.tsx](../client/src/screens/NotFoundScreen.tsx)

Màn fallback tối giản hiển thị "Screen not found". Không được gắn vào navigator chính (dự phòng cho route không hợp lệ).

---

## Nguồn dữ liệu chung

| Nguồn | Dùng ở | Nội dung |
|-------|--------|----------|
| Supabase `user_profiles` | Home, Profile, Statistics, Leaderboard, GameShow | ranking_points, exp, level, avatar_url, display_name |
| API `GET /api/gameshow/stats/:userId` | Home, Profile, Statistics | tổng trận, thắng, tỷ lệ, streak, độ chính xác... |
| API `GET /api/gameshow/matches/:userId` | MatchHistory | lịch sử trận (phân trang) |
| Hook `useGameShowWS` (WebSocket) | GameShow | trạng thái trận real-time, chat, emoji |
| Hook `useDailyTasks` | Home | nhiệm vụ hằng ngày + nhận EXP |
| Hook `useAuth` | tất cả | phiên đăng nhập, OAuth, đặt lại mật khẩu |
