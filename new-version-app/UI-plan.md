Đây là plan brainstorm UI cho web app **"Math PK"** — clone cơ chế PK 1v1 từ Xiaoyuan Kousuan, chạy trên web mobile-first với bàn phím số + phép so sánh. Ngôn ngữ: Tiếng Việt. Phong cách: Phẳng tối giản + bảng màu Vàng nắng ấm.

## Bảng màu & Token

```text
--primary:        #f59e0b  (amber-500)   — nút chính, thanh tiến độ, điểm số
--primary-light:  #fbbf24  (amber-400)   — hover, accent nhẹ
--primary-bg:     #fef3c7  (amber-100)   — card nền, badge
--primary-dark:   #78350f  (amber-900)   — text trên nền sáng
--surface:        #ffffff                 — card, modal
--background:     #faf8f5               — nền trang (warm off-white)
--text-primary:   #1f2937  (gray-800)    — tiêu đề, câu hỏi
--text-secondary: #6b7280  (gray-500)    — phụ đề, thông tin phụ
--success:        #22c55e  (green-500)   — đáp án đúng
--error:          #ef4444  (red-500)     — đáp án sai
--border:         #e5e7eb  (gray-200)    — viền card, divider
```

## User Flow Tổng quan

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Trang chủ     │───▶│   Lobby / Chờ   │───▶│   Màn PK 1v1    │
│ (Bắt đầu / Luyện│    │ (Tìm đối thủ    │    │ (30 câu, đếm    │
│  tập / BXH)     │    │  countdown)     │    │  ngược)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                          │
                                                          ▼
                                               ┌─────────────────┐
                                               │  Kết quả PK     │
                                               │ (Thắng / Thua   │
                                               │  / Hòa, XP)     │
                                               └─────────────────┘
```

## 1. Trang chủ (Home)

### Layout: Single column, centered
- **Header**: Logo "Math PK" nhỏ gọn, avatar người chơi (nếu đăng nhập), icon cài đặt (gear) ở góc phải.
- **Hero**: Avatar chính lớn (120x120px) có viền gradient vàng. Dưới là tên người chơi + cấp độ (ví dụ: "Học sinh Cấp 2").
- **Thống kê nhanh**: 3 badge ngang hàng — "🏆 128 thắng", "🔥 7 chuỗi", "⭐ Cấp 12".
- **CTA chính**: Nút to "⚡ Bắt đầu đấu" (full width, màu --primary, bo góc 16px, chữ trắng đậm). Kích thước ~56px cao để dễ bấm trên mobile.
- **CTA phụ**: 2 nút nhỏ hơn, ngang hàng — "📚 Luyện tập" + "🏆 Xếp hạng".
- **Bottom nav**: 4 tab icon + label — Trang chủ / Luyện tập / Lịch sử / Hồ sơ.

## 2. Màn hình Tìm đối thủ (Matchmaking)

- **Full overlay** từ trang chủ, nền --background mờ đi.
- **Center**: Avatar người chơi (trái) vs avatar đối thủ (phải). Giữa là "VS" lớn với hiệu ứng pulse.
- Avatar đối thủ ban đầu là silhouette, sau 1-2s sẽ reveal đối thủ thật.
- **Loading**: Spinner vòng tròn nhỏ + text "Đang tìm đối thủ..." hoặc countdown 3-2-1.
- Nút "Huỷ tìm" nhỏ dưới cùng.

## 3. Màn hình PK 1v1 — Trọng tâm chính

### Structure (Single column, mobile viewport):

```
┌─────────────────────────────────┐
│  Avatar tôi      │     Avatar đối thủ │
│  [Cat]          VS    [Monkey]   │
│  12/30 ██████░░░ │ ░░░░░██████ 8/30  │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Câu 12 / 30             │  │
│  │                           │  │
│  │      9 + 5      ?      13 │  │
│  │              ▼            │  │
│  │         [ < ] [ > ] [ = ] │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───┐ ┌───┐ ┌───┐             │
│  │ 1 │ │ 2 │ │ 3 │             │
│  ├───┤ ├───┤ ├───┤             │
│  │ 4 │ │ 5 │ │ 6 │             │
│  ├───┤ ├───┤ ├───┤             │
│  │ 7 │ │ 8 │ │ 9 │             │
│  └───┘ └───┘ └───┘             │
│       ┌───┐                     │
│       │ 0 │                     │
│       └───┘                     │
│  ┌───────────────────────────┐  │
│  │        XOÁ                │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Components chi tiết:

#### Header đấu:
- **2 avatar 56x56px**, tròn, có viền màu --primary 3px. Avatar bên trái (tôi) có viền xanh lá (--success) khi đang dẫn, avatar đối thủ có viền đỏ (--error) khi đang dẫn.
- **Thanh tiến độ**: 2 thanh nằm ngang ngay dưới avatar, màu --primary. Thanh tôi fill từ trái, thanh đối thủ fill từ phải.
- **Score text**: "12/30" — font bold, --text-primary.
- **Timer**: Đếm ngược vòng tròn nhỏ giữa 2 avatar hoặc bar ngang phía trên. Màu xanh → vàng → đỏ khi còn ít thời gian.

#### Card câu hỏi (trung tâm):
- **Card**: nền --surface, bo góc 20px, shadow nhẹ (0 4px 12px rgba(0,0,0,0.05)). Padding 24px.
- **Counter**: "Câu 12 / 30" — top-right, font nhỏ --text-secondary.
- **Expression**: Căn giữa, font size 36px, --text-primary, bold.
- **2 kiểu câu hỏi**:
  1. **So sánh**: `9 + 5  ?  13` — người chơi chọn `>`, `<`, hoặc `=`
  2. **Tính toán**: `3.14 × 70 = ?` — người chơi nhập kết quả bằng bàn phím số
- **Feedback ngay lập tức**: 
  - Đúng → viền card chớp xanh 0.3s + tiếng "ting" (nếu có âm thanh)
  - Sai → viền card chớp đỏ 0.3s + lắc nhẹ
- **Transition**: Card slide-left-out + slide-right-in mỗi câu mới, duration 200ms ease-out.

#### Bàn phím số (Numeric Keypad):
- **Layout 3x4** giống điện thoại:
```
1  2  3
4  5  6
7  8  9
   0
```
- **Nút bấm**: 72x72px, bo góc 16px, nền --surface, viền --border 1px.
- **Typography**: số 24px bold, --text-primary.
- **Active state**: scale(0.95) + nền --primary-bg khi bấm.
- **Nút XOÁ**: full width, 56px cao, màu --error nhẹ (bg-red-50), text --error.

#### Phím so sánh (xử lý câu hỏi loại 1):
- Khi câu hỏi là so sánh, 3 nút `>`, `<`, `=` hiện ra phía trên bàn phím số (hoặc thay thế bàn phím số).
- **3 nút ngang hàng**: mỗi nút ~80px, bo góc 12px, bg --primary-bg, text --primary-dark 28px bold.
- Active: bg --primary, text white.

## 4. 2 Loại câu hỏi — Chuyển đổi giao diện

### Loại A: So sánh 2 vế (dùng phím `> < =`)
```
┌───────────────────────────┐
│      9 + 5      ?      13 │
│                           │
│  [  <  ]  [  >  ]  [  =  ]│
│                           │
│         (không cần số)    │
└───────────────────────────┘
```
- Vế trái / phải có thể là: số nguyên, phép cộng/trừ/nhân/chia đơn giản, hoặc thập phân.
- Người chơi chỉ bấm 1 trong 3 nút so sánh. Không cần bàn phím số.

### Loại B: Tính kết quả (dùng bàn phím số)
```
┌───────────────────────────┐
│   3.14 × 70 = ?           │
│                           │
│         [219.7]           │
│         (đang nhập)       │
│                           │
│  1  2  3                  │
│  4  5  6                  │
│  7  8  9                  │
│     0                     │
│  [       XOÁ        ]     │
└───────────────────────────┘
```
- Kết quả nhập hiển thị real-time trong card câu hỏi.
- Có thể nhập số thập phân (nút `.` thay vì `0` ở hàng dưới).

## 5. Màn hình Kết quả PK

- **Full screen overlay**.
- **Animation**: Confetti/rain từ trên xuống nếu thắng.
- **Avatar lớn**: Tôi (trái) vs Đối thủ (phải), dưới là tên.
- **Scoreboard**: Số câu đúng / tổng số câu. Tôi 28/30 vs Đối thủ 25/30.
- **Result badge**: "🏆 CHIẾN THẮNG" lớn, màu --success, hoặc "❌ THUA CUỘC" màu --error, hoặc "🤝 HÒA" màu --text-secondary.
- **Stats row**: "⏱️ 2:14" (thời gian), "🎯 93%" (độ chính xác), "🔥 +45 XP".
- **CTA**: 2 nút — "Đấu tiếp" (primary) + "Về trang chủ" (secondary outline).

## 6. Màn hình Luyện tập cá nhân

- Tương tự màn PK nhưng không có avatar đối thủ, không có timer ép.
- **Header**: Chọn cấp độ (Dễ / Trung bình / Khó) và chọn loại toán (So sánh / Tính toán / Tất cả).
- **Progress**: Thanh tiến độ cá nhân, không có đối thủ.
- **Sau mỗi câu**: Hiện đáp án đúng nếu sai, có giải thích ngắn.
- **Kết thúc**: Tổng kết số câu đúng, thời gian, đề xuất luyện tập tiếp.

## 7. Bottom Navigation (xuất hiện trên mọi màn hình không phải game)

```
┌─────────────────────────────────┐
│  🏠    📚    📊    👤           │
│ Trang chủ Luyện BXH   Hồ sơ     │
│          tập                    │
└─────────────────────────────────┘
```
- 4 tab, icon + label, căn đều.
- Active: icon + label màu --primary, có indicator chấm nhỏ phía trên.
- Inactive: --text-secondary.

## 8. Responsive & Mobile-First

- **Viewport**: Design cho 375-430px width trước. Tablet sẽ scale card + bàn phím lên.
- **Safe area**: padding-bottom 24px cho iPhone home indicator.
- **Touch target**: Tất cả nút >= 48x48px (bàn phím số 72x72px để dễ bấm nhanh).
- **Landscape**: Card câu hỏi bên trái, bàn phím bên phải (2 cột).

## 9. Animation & Motion

- **Transition màn hình**: slide-in từ phải, 250ms ease-out.
- **Card câu hỏi**: slide-left khi next, slide-right khi prev. scale(0.98) → scale(1) khi hiện.
- **Nút bấm**: scale(0.92) on active, duration 80ms.
- **Đáp án đúng**: viền card chớp --success 2 lần (0.6s) + checkmark fade-in.
- **Đáp án sai**: shake card 300ms (translateX ±8px) + viền đỏ.
- **Timer**: Bar width giảm dần, màu chuyển từ --success → --primary → --error.
- **Avatar đối thủ**: bounce nhẹ khi họ trả lời đúng (feedback visual).

## 10. Assets cần thiết

- Avatar mặc định (5-8 kiểu động vật dễ thương: mèo, khỉ, gấu, thỏ...)
- Icon set: trophy, fire, star, gear, home, book, chart, user, clock, check, x
- Badge/rank icons cho cấp độ người chơi
- Confetti animation (lottie hoặc CSS particles)
- Sound effects (tùy chọn): ting đúng, buzz sai, tick timer, victory fanfare

## Technical Notes (khi chuyển sang build)

- Dùng React state machine cho flow: `idle` → `matchmaking` → `playing` → `result`
- WebSocket hoặc polling 1s để sync tiến độ đối thủ (nếu PK thật sự real-time)
- Hoặc giả lập đối thủ AI với delay ngẫu nhiên 1-4s mỗi câu
- Bàn phím số: xử lý pointer events để tránh double-tap zoom trên iOS
- Prevent default on space/enter để tránh scroll khi bấm nhanh

---

Plan này sẵn sàng để review. Nếu bạn duyệt, mình có thể tiến sang việc vẽ wireframe chi tiết hơn hoặc bắt đầu code prototype trực tiếp.