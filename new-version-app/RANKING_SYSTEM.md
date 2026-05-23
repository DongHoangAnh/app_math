# Hệ Thống Xếp Hạng 1v1

## Luật điểm
| Kết quả | Thay đổi điểm |
|---------|--------------|
| Thắng   | +5           |
| Thua    | -3           |
| Hoà     | ±0           |
| Bắt đầu | 0            |
| Tối thiểu | 0 (không âm) |

---

## Cài đặt DB (Supabase SQL Editor)

Chạy phần **"RANKING SYSTEM"** ở cuối file `supabase_schema.sql`. Nó tạo:
- Bảng `user_profiles` — lưu `ranking_points` cho mỗi auth user
- Bảng `game_matches` — lịch sử trận đấu
- Hàm `update_ranking_points()` — cập nhật điểm atomic, floor tại 0
- Trigger tự tạo profile khi user đăng ký mới

## Biến môi trường server

Thêm vào file `.env` (hoặc server environment):
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>   # Lấy từ Supabase → Settings → API
```

---

## Các file đã thay đổi

| File | Mô tả |
|------|-------|
| `server/supabase-server.ts` | **Mới** — client Supabase server-side, `saveGameMatch()` (lưu trận + cập nhật điểm), `saveDisconnectWin()` |
| `server/gameshow-ws.ts` | `GAME_OVER` payload kèm `rankingDelta` cho từng người; ngắt kết nối cũng cộng +5 cho người còn lại |
| `supabase_schema.sql` | Thêm tables + RPC ở cuối file |
| `client/src/hooks/useGameShowWS.ts` | `GameResult` có `rankingDelta`; state có `myRankingDelta` |
| `client/src/components/GameResults.tsx` | Badge **+5 / -3 điểm xếp hạng** hiện sau trận |
| `client/src/screens/GameShowScreen.tsx` | Truyền `myRankingDelta` xuống `GameResults`; màn disconnect hiện +5 |
| `client/src/screens/LeaderboardScreen.tsx` | **Mới** — bảng top 50, highlight hàng bản thân, pull-to-refresh |
| `client/src/App.tsx` | Thêm tab **Xếp Hạng** vào bottom navigation |
| `client/src/screens/HomeScreen.tsx` | Nút Xếp Hạng điều hướng đúng sang `LeaderboardTab` |

---

## Chạy để test

```bash
cd d:\personalizedmath\new-version-app
npx expo start --tunnel   # quét QR bằng Expo Go
# hoặc
npx expo start --lan      # nếu điện thoại cùng WiFi
```
