# Bản thiết kế — Gói "Vui & gây nghiện" (Juicy Feedback)

- **Ngày**: 2026-06-05
- **Phạm vi**: Lớp phản hồi cảm xúc cho game đấu 1v1 (âm thanh + rung + hiệu ứng hình ảnh).
- **Không đụng tới**: logic game, WebSocket, tính điểm xếp hạng, DB.
- **Đối tượng**: giữ nguyên teen — chỉ làm app vui & thân thiện hơn, không pivot.

---

## 1. Mục tiêu & bối cảnh

App đấu toán 1v1 hiện tại **không có** âm thanh, rung, hay hiệu ứng ăn mừng nào
(`expo-av`, `expo-haptics`, confetti, lottie đều chưa cài). Phản hồi hiện chỉ là:
chấm tròn xanh/đỏ theo đúng/sai và thanh giờ đổi màu.

Gói này thêm một **lớp phản hồi "đã mắt"** ở mức **vừa phải**: tập trung màn thắng
(confetti + số điểm nhảy) và phản hồi đúng/sai nhẹ (màu + âm thanh + rung). **Không**
làm combo/streak-milestone trong đợt này.

### Quyết định đã chốt (qua brainstorm)
- **Âm thanh + rung**: có. Kèm công tắc Tắt tiếng / Tắt rung, tôn trọng chế độ im lặng iOS.
- **Phạm vi**: vừa phải (màn thắng + đúng/sai nhẹ; bỏ combo).
- **Cách làm**: nhẹ ký — tận dụng RN `Animated` có sẵn + `react-native-confetti-cannon`
  + `expo-audio` + `expo-haptics`. Không dùng Lottie (dep nặng, web kém).

---

## 2. Kiến trúc — một "đầu mối" phản hồi duy nhất

Theo nếp code của repo (single source — xem CLAUDE.md "Code Patterns"): mọi âm thanh/
rung/đánh dấu đi qua **một** đầu mối, không rải `expo-audio`/`expo-haptics` khắp màn hình.

### 2.1 `client/src/services/feedback.ts`
Module thuần (không React) lo việc phát hiệu ứng nền (âm thanh + rung).

- Nạp sẵn (preload) 4 file SFX khi app khởi động.
- API:
  - `playCorrect()` — "ting" + rung nhẹ
  - `playWrong()` — "bụp" + rung trung bình
  - `playWin()` — fanfare + rung success
  - `playLose()` — nốt trầm (không rung)
- Mỗi hàm **tự kiểm tra cài đặt** (`soundEnabled`, `hapticsEnabled`) trước khi phát.
- Haptics bọc `Platform.OS !== 'web'` (web no-op).
- Gọi `setAudioModeAsync({ playsInSilentMode: false, ... })` để **tôn trọng nút im lặng iOS**.
- **Fail-safe**: lỗi nạp/phát âm thanh chỉ `console.warn`, KHÔNG ném lỗi làm sập game.
- Đọc cài đặt qua một biến module được cập nhật bởi `useSettings` (tránh phụ thuộc React
  trong module thuần) — ví dụ `feedback.setPrefs({ soundEnabled, hapticsEnabled })`.

### 2.2 `client/src/hooks/useSettings.ts` (+ `SettingsContext`)
- State: `{ soundEnabled: boolean, hapticsEnabled: boolean }`, **mặc định cả hai = true**.
- Lưu/đọc qua **AsyncStorage** (đã có sẵn trong repo — dùng ở `services/supabase.ts`).
  Key: `@mathup/settings`.
- Khi đổi giá trị → ghi AsyncStorage + gọi `feedback.setPrefs(...)` để đồng bộ.
- Provider đặt ở gốc app (`client/src/App.tsx`) cạnh `AuthContext`.

### 2.3 `client/src/hooks/useFeedback.ts` (tuỳ chọn, tiện dùng)
Hook mỏng trả về các hàm `{ correct, wrong, win, lose }` map thẳng sang `feedback.ts`.
Màn hình gọi `useFeedback()` thay vì import service trực tiếp (đồng nhất kiểu hook của repo).

### Phụ thuộc thêm (3, đều nhẹ, chạy web)
- `expo-audio` (thay cho `expo-av` đã ngừng phát triển)
- `expo-haptics`
- `react-native-confetti-cannon`

---

## 3. Các khoảnh khắc & hiệu ứng

| Khi nào | Vị trí code | Hình ảnh | Âm thanh | Rung |
|---|---|---|---|---|
| **Trả lời đúng** | `GameShowScreen.handleAnswer` (`:180`) khi `isCorrect` | số điểm "Tôi" pulse phóng to nhẹ (Animated) + chấm xanh (đã có) | `correct.mp3` | light |
| **Trả lời sai** | cùng chỗ, khi sai | thẻ câu hỏi lắc ngang (shake, Animated) + chấm đỏ | `wrong.mp3` | medium |
| **Thắng** | `GameResults.tsx` khi `outcome === 'win'` | **confetti** (confetti-cannon) + số điểm **đếm tăng dần** + cúp nảy vào | `win.mp3` | success |
| **Thua / Hoà** | `GameResults.tsx` | số điểm count-up (không confetti) | `lose.mp3` | — |

- Toàn bộ animation dùng **RN `Animated`** (đã dùng ở `screens/GameShow/FloatingEmojiLayer.tsx`).
- Confetti dùng `react-native-confetti-cannon` (chạy cả web qua Animated).
- **Không sửa** logic game/WS — chỉ chèn lời gọi `feedback.*()` và lớp Animated.
- `GameShowScreen` cần biết `isCorrect` ở `handleAnswer` (đã có dữ kiện qua `revealState` /
  câu trả lời đúng của câu hiện tại) để chọn `playCorrect`/`playWrong`.

---

## 4. Cài đặt (tắt tiếng / tắt rung)

Thêm mục **"Âm thanh & Rung"** trong `ProfileScreen` (khu cài đặt):
- 2 công tắc (`Switch` RN): *Âm thanh* và *Rung*.
- Bind vào `useSettings`. Đổi → lưu AsyncStorage + đồng bộ `feedback.setPrefs`.
- Văn bản tiếng Việt; dùng bộ icon vector (xem Lộ trình) cho icon loa/rung nếu có.

---

## 5. Tài nguyên âm thanh

4 file SFX ngắn, nhẹ, **CC0 (miễn phí bản quyền)** đặt ở `assets/sfx/` (thư mục assets
nằm ở gốc `new-version-app/assets/`, cùng chỗ `icon.png`/`splash.png`):

| File | Dùng | Độ dài | Kích thước mục tiêu |
|---|---|---|---|
| `correct.mp3` | đúng — "ting" trong trẻo | ~0.3s | < 50KB |
| `wrong.mp3` | sai — "bụp" trầm, không gắt | ~0.3s | < 50KB |
| `win.mp3` | thắng — fanfare vui | ~1.5s | < 50KB |
| `lose.mp3` | thua/hoà — nốt trầm nhẹ | ~1s | < 50KB |

- **Nguồn gợi ý (đều CC0/miễn phí thương mại)**:
  - Kenney.nl — "Interface Sounds" / "Casino Audio" (CC0).
  - Mixkit — Free Sound Effects (license cho phép dùng thương mại, không cần ghi nguồn).
  - Freesound.org — lọc bộ lọc **Creative Commons 0**.
- **Bắt buộc**: ghi nguồn + giấy phép từng file vào `assets/sfx/CREDITS.md`.
- Định dạng `.mp3` (nhẹ, `expo-audio` chạy tốt mọi nền tảng).

---

## 6. Đa nền tảng & kiểm thử

- **Web** (e2e Playwright chạy bản web):
  - `expo-haptics` → bọc `Platform.OS !== 'web'`.
  - `expo-audio` chạy web nhưng trình duyệt chặn autoplay; ta luôn phát **ngay sau thao tác
    bấm của người dùng** nên không vướng.
- **Tôn trọng người dùng**: mặc định bật, tắt được; tôn trọng im lặng iOS qua `setAudioModeAsync`.
- **Không vỡ test cũ**: lớp hiệu ứng tách rời, không đổi luồng game/WS → e2e hiện tại không ảnh hưởng.
- **Test mới**:
  - 1 spec e2e nhẹ: công tắc Âm thanh/Rung lưu qua AsyncStorage (bật → tắt → mở lại vẫn nhớ).
    Đặt tên theo nếp repo: vì là cài đặt trong Hồ sơ → `profile.spec.ts` (bổ sung case),
    không tạo file lạc.
  - Confetti/âm thanh khó test tự động → **checklist kiểm thủ công**:
    - [ ] Đúng: nghe "ting" + rung nhẹ + điểm pulse.
    - [ ] Sai: nghe "bụp" + rung + thẻ lắc.
    - [ ] Thắng: confetti + fanfare + điểm count-up.
    - [ ] Thua/Hoà: nốt trầm + count-up, không confetti.
    - [ ] Tắt Âm thanh → im; Tắt Rung → không rung; mở lại app vẫn nhớ.
    - [ ] iOS bật nút im lặng → không có tiếng.

---

## 7. Đơn vị code & ranh giới (để dễ test/đọc)

| Đơn vị | Nhiệm vụ | Phụ thuộc |
|---|---|---|
| `services/feedback.ts` | phát âm thanh + rung, theo cài đặt; fail-safe | expo-audio, expo-haptics, Platform |
| `hooks/useSettings.ts` | nguồn sự thật cài đặt; lưu AsyncStorage | AsyncStorage, feedback.setPrefs |
| `hooks/useFeedback.ts` | hook tiện dùng map sang feedback.ts | feedback.ts |
| `GameShowScreen` (glue) | gọi correct/wrong + Animated pulse/shake | useFeedback |
| `GameResults.tsx` | confetti + count-up + win/lose sound | useFeedback, confetti-cannon |
| `ProfileScreen` (mục mới) | 2 công tắc cài đặt | useSettings |

---

## 8. Ngoài phạm vi (KHÔNG làm đợt này)
- Combo / mốc chuỗi trả lời đúng liên tiếp.
- Nhạc nền.
- Linh vật ăn mừng dạng Lottie.
- Hiệu ứng cho các màn ngoài game (Home, Leaderboard…).

---

## 9. Lộ trình tiếp theo (đã quyết, để spec riêng)

Các quyết định/ý tưởng khác từ buổi brainstorm — **không** thuộc spec này, sẽ làm spec riêng:

1. **Giao diện thân thiện (nền tảng)**:
   - **Font**: dùng **Baloo 2** cho tiêu đề + con số + nút (thay `Plus Jakarta Sans`);
     **giữ Be Vietnam Pro** cho thân chữ (dấu tiếng Việt). Cập nhật `client/src/theme.ts` (`F`)
     + nạp font ở `App.tsx`.
   - **Icon**: chuyển từ emoji rải rác (~50+ chỗ) sang **một bộ icon vector đồng bộ**
     (**Ionicons** qua `@expo/vector-icons`, có sẵn với Expo) — nét tròn, đổi màu theo brand.
   - Chữ/nút to hơn, vùng chạm rộng, tương phản tốt.
2. **Người mới & dễ chơi**: Luyện tập solo + đối thủ Bot + hướng dẫn lần đầu.
3. **Xã hội**: đấu với bạn qua mã phòng + thành tích/huy hiệu.
