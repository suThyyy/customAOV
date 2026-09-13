# 🎮 App "Bốc Thăm Liên Quân" — Bản Thiết Kế Chi Tiết (v2)

> Dùng nội bộ cho team riêng. Tech stack: **HTML + CSS + JS thuần**, dữ liệu lưu bằng **localStorage** (không backend, không server).
> v2 bổ sung: ảnh đại diện người chơi, 2 kiểu Reveal (Hộp Bí Ẩn / Vòng Quay Số Phận), Xuất-Nhập dữ liệu, tên team tự sinh, lịch sử bốc thăm, âm thanh.

---

## 1. Tổng quan tính năng

| Trục lựa chọn | Kiểu A | Kiểu B |
|---|---|---|
| **Chia team** | 🎲 Random hoàn toàn | ⚖️ Cân theo Tier (có mức du di 50-50/60-40/70-30) |
| **Gán tướng** | 🎰 Random toàn bể | 🎯 Random đúng bể tướng theo vị trí |
| **Cách hiện kết quả** | 📦 Hộp Bí Ẩn (bấm để lật) | 🎡 Vòng Quay Số Phận (quay lần lượt từng người) |

---

## 2. Cấu trúc dữ liệu (localStorage schema)

```js
{
  "players": [
    {
      "id": "p1",
      "name": "Tí Coi",
      "tier": 1,
      "avatar": "data:image/jpeg;base64,..." // ảnh đã resize+nén, hoặc null nếu chưa up
    }
    // ... tối đa 10 người
  ],

  "tierScore": { "1": 8, "2": 4, "3": 2, "4": 1, "5": 0.5 },

  "championPool": {
    "top": ["Renekton", "Darius"],
    "jungle": ["Zac", "Lee Sin"],
    "mid": ["Lux", "Zed"],
    "adc": ["Kalista", "Jinx"],
    "support": ["Lulu", "Senna"]
  },

  "settings": {
    "teamMode": "tier",        // "random" | "tier"
    "championMode": "byRole",  // "full" | "byRole"
    "balanceLevel": "60-40",   // "50-50" | "60-40" | "70-30"
    "revealMode": "secretBox", // "secretBox" | "slotMachine"
    "soundEnabled": true
  },

  "history": [
    {
      "timestamp": "2026-09-13T10:00:00Z",
      "teamAName": "Đội Gánh Còng Lưng",
      "teamBName": "Liên Minh Feed Lure",
      "teamA": [{ "playerId": "p1", "role": "top", "champion": "Renekton" }],
      "teamB": [{ "playerId": "p2", "role": "jungle", "champion": "Zac" }],
      "balancePercent": { "teamA": 52, "teamB": 48 }
    }
    // giữ tối đa 10 lần gần nhất, cũ nhất bị xóa khi vượt giới hạn
  ]
}
```

> **Lưu ý dung lượng:** ảnh avatar PHẢI được resize (khuyến nghị tối đa 200×200px) + nén chất lượng ~70% qua `<canvas>` trước khi lưu base64. 10 ảnh sau resize chỉ ~200-400KB tổng, an toàn trong giới hạn localStorage (5-10MB tùy trình duyệt).

---

## 3. Giao diện (UI Sections)

### 3.1 Header
- Tên app to đậm: **"🎲 Bốc Team Liên Quân"**
- Tagline gen Z random mỗi lần load (mảng 5-6 câu)

### 3.2 Thêm người chơi (cập nhật: thêm upload avatar)
- Input tên + dropdown chọn tier (1-5) + **ô upload ảnh đại diện** (`<input type="file" accept="image/*">`)
- Preview ảnh ngay sau khi chọn (trước khi bấm "Thêm")
- Nếu không upload → dùng avatar mặc định (chọn ngẫu nhiên 1 trong bộ emoji/icon vui có sẵn, vd 🐸🐵🦍🐔)
- Xử lý ảnh: đọc file → vẽ vào `<canvas>` resize 200×200 → xuất base64 JPEG quality 0.7 → lưu vào `player.avatar`
- Validate: tối đa 10 người, không tên trống

### 3.3 Danh sách người chơi
- Chip hiện: **avatar tròn nhỏ + tên + tier** (màu viền theo tier như v1)
- Bấm vào avatar trong chip → cho phép đổi ảnh khác (upload lại) hoặc xóa người chơi

### 3.4 Panel chỉnh Tier Score
- Như v1, không đổi

### 3.5 Chọn chế độ (bổ sung thêm 1 radio group)
```
┌─ Chia Team ──────────────┐   ┌─ Gán Tướng ──────────────┐
│ ◯ Random hoàn toàn       │   │ ◯ Random toàn bể         │
│ ● Cân theo Tier          │   │ ● Đúng vị trí            │
└──────────────────────────┘   └───────────────────────────┘

┌─ Độ cân bằng (hiện khi chọn "Cân theo Tier") ──┐
│ ● 50-50  ◯ 60-40  ◯ 70-30                        │
└────────────────────────────────────────────────────┘

┌─ Cách hiện kết quả ───────────────────────────────┐
│ ● 📦 Hộp Bí Ẩn — bấm từng thẻ để lật               │
│ ◯ 🎡 Vòng Quay Số Phận — quay lần lượt từng người   │
└────────────────────────────────────────────────────┘

🔊 Âm thanh: [ ON / OFF ]
```

### 3.6 Nhập bể tướng theo vị trí
- Như v1, không đổi

### 3.7 Nút hành động chính
- "🎲 BỐC THĂM 🎲" + "🔄 Bốc lại"

### 3.8 Kết quả — chia theo 2 kiểu Reveal

**a) Hộp Bí Ẩn (Secret Box)**
- Thuật toán chạy xong toàn bộ (chia team + gán vị trí + gán tướng) TRƯỚC khi hiện UI
- Hiện 10 thẻ dạng lưới, mặt trước mỗi thẻ: **avatar người chơi + tên + vị trí** (luôn hiện sẵn, không ẩn danh tính người chơi — chỉ ẩn tướng)
- Mặt sau thẻ (trước khi bấm): dấu "❓" lớn thay cho ảnh tướng
- Bấm vào thẻ → flip animation (CSS 3D transform `rotateY`) → lật sang mặt hiện ảnh tướng thật (lấy từ Data Dragon CDN qua bảng mapping tên)
- Có nút "Lật tất cả" cho ai không muốn bấm từng cái

**b) Vòng Quay Số Phận (Slot Machine tuần tự)**
- Thuật toán cũng chạy xong toàn bộ trước
- UI hiện 1 khung quay lớn ở giữa, xử lý **tuần tự từng người** theo thứ tự (vd Team A Top → Team A Jung → ... → Team B Support)
- Với người hiện tại: hiện avatar + tên người chơi cố định, khung ảnh tướng bên cạnh chạy nhanh qua nhiều ảnh tướng ngẫu nhiên (setInterval ~80ms), chậm dần (tăng dần thời gian mỗi bước, kiểu easing), rồi dừng đúng vào tướng kết quả thật
- Sau khi 1 người quay xong, tự động chuyển sang người tiếp theo sau ~0.5s (hoặc có nút "Tiếp theo ▶" để chủ động bấm)
- Danh sách người đã quay xong hiện dần thành 1 bảng kết quả bên dưới/bên cạnh khung quay chính

**Chung cho cả 2 kiểu:**
- Hiện % sức mạnh mỗi team (nếu chế độ Cân theo Tier)
- **Tên team tự sinh** ngẫu nhiên (xem mục 4.4), hiện ở đầu mỗi cột team
- Confetti 🎉 khi kết thúc toàn bộ
- Âm thanh: "tạch tạch" lúc quay/lật, "tada" lúc xong (nếu bật)
- Nút "📋 Copy kết quả" dạng text cho Discord/Zalo
- Nút "💾 Lưu vào lịch sử" (tự động lưu luôn sau khi hoàn tất, không cần bấm riêng)

### 3.9 Mục mới — Lịch sử bốc thăm
- Danh sách 10 lần gần nhất, mỗi dòng: thời gian + tên 2 team + nút "Xem lại" (mở lại chi tiết kết quả lần đó, chỉ xem, không tính lại)
- Nút xóa từng mục hoặc xóa hết lịch sử

### 3.10 Mục mới — Xuất / Nhập dữ liệu
- Nút "📤 Xuất dữ liệu": gom toàn bộ object localStorage (players, championPool, settings, history) thành 1 file `.json`, dùng `Blob` + thẻ `<a download>` để tải xuống
- Nút "📥 Nhập dữ liệu": `<input type="file" accept=".json">`, đọc file, `JSON.parse`, ghi đè vào localStorage, reload lại UI
- Cảnh báo xác nhận trước khi ghi đè ("Nhập dữ liệu sẽ thay thế toàn bộ dữ liệu hiện tại, tiếp tục?")

---

## 4. Thuật toán chi tiết

### 4.1 Chia team — Random hoàn toàn
Fisher-Yates shuffle, cắt đôi. (không đổi so với v1)

### 4.2 Chia team — Cân theo Tier
Duyệt toàn bộ tổ hợp (brute-force combinations), lọc theo % sức mạnh cho phép, random 1 trong nhóm hợp lệ. (không đổi so với v1 — xem lại file v1 nếu cần chi tiết công thức + test case)

### 4.3 Gán vị trí & gán tướng
Không đổi so với v1 (gán vị trí không trùng trong team, gán tướng theo bể vị trí hoặc toàn bể, fallback khi hết tướng).

### 4.4 Sinh tên team ngẫu nhiên (MỚI)
```
- Chuẩn bị 2 mảng từ vựng:
  tinhTu = ["Gánh Còng Lưng", "Không Biết Sợ", "Chuyên Feed", "Bất Tử", "Toxic Vui Vẻ", ...]
  danhTu = ["Liên Minh", "Đội", "Biệt Đội", "Hội", ...]
- Khi ra kết quả: random 1 danhTu + 1 tinhTu ghép lại cho mỗi team
  (đảm bảo 2 team không trùng tên nhau trong cùng 1 lần bốc — random lại nếu trùng)
- Ví dụ: "Liên Minh Gánh Còng Lưng" vs "Biệt Đội Chuyên Feed"
```

### 4.5 Animation Reveal (2 kiểu)
**Hộp Bí Ẩn:** chỉ cần CSS flip 3D (`transform: rotateY(180deg)` + `backface-visibility: hidden`), trigger bằng class JS khi click — không cần logic random trong animation vì kết quả đã có sẵn, chỉ là hiệu ứng hiển thị.

**Vòng Quay Số Phận:**
```
Với mỗi người theo thứ tự:
  1. Lấy danh sách ảnh tướng để "chạy" ngẫu nhiên trong lúc quay = bể tướng tương ứng
     (bể theo vị trí nếu chế độ "Đúng vị trí", hoặc bể gộp nếu "Random toàn bể")
  2. spinDuration = 1.5-2 giây, dùng vòng lặp giảm dần tốc độ:
     bước 1-10: đổi ảnh mỗi 80ms
     bước 11-15: đổi ảnh mỗi 150ms
     bước 16-18: đổi ảnh mỗi 300ms
     bước cuối: dừng, hiện đúng ảnh tướng đã tính từ thuật toán
  3. Phát âm thanh "tạch" mỗi lần đổi ảnh (nếu bật âm thanh)
  4. Sau khi dừng, đợi ~500ms rồi tự chuyển người tiếp theo
```

### 4.6 Nguồn ảnh tướng — Data Dragon CDN
```
URL pattern: https://ddragon.leagueoflegends.com/cdn/<version>/img/champion/<key>.png
version: lấy cố định 1 bản mới nhất lúc code xong (vd "15.10.1"), không cần tự động
         cập nhật version vì đây là dự án cá nhân nhỏ
key: tên tướng viết liền không dấu cách/ký tự đặc biệt, theo đúng chuẩn Riot
     (vd "Kai'Sa" → "KaiSa", "Wukong" → "MonkeyKing", "Nunu & Willump" → "Nunu")
→ CẦN 1 bảng mapping tên hiển thị (tiếng Việt user gõ) ↔ key chuẩn CDN,
  chuẩn bị sẵn đầy đủ ~165 tướng khi code, để user chỉ cần gõ tên tướng thường
  (không cần biết quy tắc đặt tên của Riot)
```

---

## 5. Quy ước đã chốt (tổng hợp v1 + v2)

- Mâm/Tier: số càng nhỏ càng mạnh. Tối đa 10 người (2 team x 5).
- "50-50/60-40/70-30" = mức du di % sức mạnh cho phép, KHÔNG phải tỉ lệ số người.
- Tướng/vị trí không trùng trong cùng điều kiện đã định (có fallback khi hết).
- Avatar người chơi: resize + nén trước khi lưu localStorage; có ảnh mặc định nếu không upload.
- 2 kiểu Reveal: Hộp Bí Ẩn (chủ động bấm) và Vòng Quay (tự động, tuần tự từng người) — KHÔNG có kiểu "Hiện ngay" (đã chốt bỏ).
- Danh tính người chơi (tên + avatar) luôn hiển thị công khai ngay từ đầu; chỉ ẩn KẾT QUẢ TƯỚNG cho tới khi reveal.
- Có Xuất/Nhập dữ liệu JSON để backup.
- Có tên team tự sinh ngẫu nhiên, lịch sử 10 lần bốc gần nhất, âm thanh bật/tắt được.

---

## 6. Prompt chi tiết để đưa cho AI code (Claude Code / Cursor / v.v.)

```
Tôi cần bạn xây dựng 1 web app tên "Bốc Team Liên Quân" bằng HTML + CSS + JS THUẦN
(không dùng framework, không build tool). Dữ liệu lưu bằng localStorage, KHÔNG có
backend/server/API riêng — chỉ gọi trực tiếp CDN ảnh tướng công khai của Riot
(Data Dragon) từ phía client.

## Cấu trúc dữ liệu localStorage (dùng đúng schema này):
{
  players: [{id, name, tier, avatar}],  // avatar: base64 JPEG đã resize 200x200, hoặc null
  tierScore: {1:8, 2:4, 3:2, 4:1, 5:0.5},
  championPool: {top:[], jungle:[], mid:[], adc:[], support:[]},
  settings: {teamMode, championMode, balanceLevel, revealMode, soundEnabled},
  history: [{timestamp, teamAName, teamBName, teamA:[{playerId, role, champion}],
             teamB:[...], balancePercent:{teamA, teamB}}]  // tối đa 10 mục, cũ nhất bị xóa
}

## Các section UI cần có (theo thứ tự):
1. Header: tên app to đậm "🎲 Bốc Team Liên Quân" + tagline gen Z random mỗi lần load
   (mảng 5-6 câu, chọn random 1 câu khi trang load).

2. Form thêm người chơi: input tên + dropdown tier (1-5) + input file upload avatar
   (accept="image/*") có preview ảnh trước khi bấm Thêm. Xử lý ảnh upload: đọc file
   bằng FileReader, vẽ vào canvas resize còn tối đa 200x200px (giữ tỉ lệ, crop vuông
   giữa ảnh), xuất ra base64 JPEG quality 0.7, lưu vào player.avatar. Nếu không upload,
   gán ngẫu nhiên 1 emoji trong mảng ["🐸","🐵","🦍","🐔","🐹","🦖"] làm avatar mặc định
   (hiện emoji to trong vòng tròn thay vì ảnh). Validate tối đa 10 người, tên không trống.

3. Danh sách người chơi dạng chip: avatar tròn nhỏ (ảnh hoặc emoji) + tên + viền màu
   theo tier (tier1=#FFD700, tier2=#4ADE80, tier3=#94A3B8, tier4=#60A5FA, tier5=#C084FC).
   Bấm avatar trong chip → mở lại input file để đổi ảnh. Nút X trên chip để xóa người.

4. Panel ẩn/hiện chỉnh tierScore từng tier, mặc định {1:8,2:4,3:2,4:1,5:0.5}.

5. Radio "Chia team": Random hoàn toàn / Cân theo Tier.
6. Radio "Gán tướng": Random toàn bể / Đúng vị trí.
7. Radio "Độ cân bằng" (chỉ enable khi Chia team = Cân theo Tier): 50-50 / 60-40 / 70-30.
8. Radio "Cách hiện kết quả": 📦 Hộp Bí Ẩn / 🎡 Vòng Quay Số Phận.
9. Toggle "🔊 Âm thanh": ON/OFF, lưu vào settings.soundEnabled.

10. 5 ô textarea nhập bể tướng theo vị trí (Top/Jung/Mid/ADC/Support, mỗi dòng 1 tên
    tướng), nút Lưu. Cảnh báo nếu 1 vị trí có ít hơn 2 tướng.

11. Nút to "🎲 BỐC THĂM 🎲" + nút phụ "🔄 Bốc lại".

12. Khu vực kết quả — RẼ NHÁNH theo revealMode đã chọn:

    a) NẾU revealMode = "secretBox":
       - Thuật toán chạy XONG hoàn toàn trước (có đủ team, vị trí, tướng cho cả 10 người)
       - Hiện lưới 10 thẻ (2 cột theo team), MẶT TRƯỚC mỗi thẻ luôn hiện sẵn:
         avatar người chơi (ảnh thật hoặc emoji mặc định) + tên người + tên vị trí.
         Vùng hiện tướng ban đầu che bằng dấu "❓" lớn.
       - Bấm vào thẻ → CSS 3D flip animation (transform: rotateY(180deg), dùng
         backface-visibility: hidden cho 2 mặt) → lộ ra ảnh tướng thật (từ CDN,
         xem mục "Nguồn ảnh tướng" bên dưới) + tên tướng.
       - Có nút "Lật tất cả" để tự động lật hết các thẻ còn lại.
       - Phát âm thanh "lật thẻ" mỗi lần flip nếu soundEnabled = true.

    b) NẾU revealMode = "slotMachine":
       - Thuật toán cũng chạy XONG hoàn toàn trước khi bắt đầu animation.
       - Xử lý TUẦN TỰ từng người theo thứ tự cố định (Team A: Top,Jung,Mid,ADC,Support
         rồi tới Team B tương tự). Chỉ xử lý 1 người tại 1 thời điểm.
       - Với người đang quay: hiện cố định avatar + tên người chơi + tên vị trí ở 1 bên,
         bên cạnh là khung ảnh tướng đang "chạy": dùng setInterval đổi ảnh tướng ngẫu
         nhiên (lấy từ đúng bể tướng của vị trí đó, hoặc bể gộp nếu chế độ Random toàn
         bể) theo tốc độ giảm dần:
           - 10 lần đầu: đổi ảnh mỗi 80ms
           - 5 lần tiếp: đổi ảnh mỗi 150ms
           - 3 lần tiếp: đổi ảnh mỗi 300ms
           - dừng hẳn, hiện đúng ảnh tướng đã tính sẵn từ thuật toán cho người đó
         (dùng setTimeout đệ quy hoặc chuỗi Promise, KHÔNG dùng setInterval cố định
         vì cần tốc độ thay đổi dần theo thời gian — easing).
       - Phát âm thanh "tạch" mỗi lần đổi ảnh trong lúc quay (nếu soundEnabled).
       - Sau khi 1 người dừng quay, thêm kết quả người đó vào 1 bảng danh sách kết quả
         hiện dần bên dưới, đợi 500ms rồi tự động chuyển sang quay người tiếp theo.
       - Có thể thêm nút "Bỏ qua hiệu ứng, hiện hết" để dừng animation và hiện toàn bộ
         kết quả còn lại ngay lập tức.

    Chung cho cả 2 kiểu:
    - Hiện tên team tự sinh ngẫu nhiên ở đầu mỗi cột (xem thuật toán sinh tên bên dưới).
    - Hiện % sức mạnh mỗi team nếu teamMode = "tier" (vd "52% - 48%").
    - Bắn confetti khi HOÀN TẤT toàn bộ (tất cả thẻ đã lật / tất cả người đã quay xong).
    - Phát âm thanh "tada" khi hoàn tất (nếu soundEnabled).
    - Nút "📋 Copy kết quả" dùng Clipboard API, copy dạng text đẹp gồm tên team,
      tên người, vị trí, tướng — format sẵn để dán Discord/Zalo.
    - Tự động lưu kết quả vào history trong localStorage ngay khi hoàn tất (không cần
      thao tác thêm của user), giữ tối đa 10 mục gần nhất (FIFO, xóa mục cũ nhất khi
      vượt quá 10).

13. Section "Lịch sử bốc thăm": danh sách tối đa 10 dòng từ history, mỗi dòng hiện
    thời gian + 2 tên team + nút "Xem lại" (mở modal/panel hiện lại chi tiết kết quả
    đã lưu, chỉ đọc, không tính toán lại) + nút xóa từng dòng + nút "Xóa hết lịch sử".

14. Section "Xuất / Nhập dữ liệu":
    - Nút "📤 Xuất dữ liệu": gom toàn bộ localStorage app (players, tierScore,
      championPool, settings, history) thành object, JSON.stringify, tạo Blob
      type application/json, tạo thẻ <a> với URL.createObjectURL + thuộc tính
      download="boc-team-backup.json", trigger click để tải xuống.
    - Nút "📥 Nhập dữ liệu": input type="file" accept=".json", đọc bằng FileReader,
      JSON.parse nội dung, hiện confirm dialog ("Nhập dữ liệu sẽ THAY THẾ toàn bộ
      dữ liệu hiện tại, tiếp tục?"), nếu đồng ý thì ghi đè toàn bộ localStorage bằng
      dữ liệu vừa nhập và reload lại UI (window.location.reload() là đủ).

## Thuật toán BẮT BUỘC (phần quan trọng nhất):

### Chia team "Random hoàn toàn":
Fisher-Yates shuffle toàn bộ players, cắt đôi: Math.floor(N/2) người đầu → Team A,
phần còn lại → Team B.

### Chia team "Cân theo Tier" — dùng brute-force duyệt tổ hợp, KHÔNG dùng snake draft:
1. sizeA = Math.floor(N/2), sizeB = N - sizeA
2. power[i] = tierScore[players[i].tier]; totalPower = tổng power tất cả người
3. Viết hàm generateCombinations(array, k) đệ quy, sinh tất cả tổ hợp chọn k phần tử
   (N tối đa 10 nên tối đa C(10,5)=252 tổ hợp, không cần tối ưu hiệu năng gì thêm)
4. Với mỗi tổ hợp làm Team A: powerA = tổng power trong tổ hợp,
   percentA = powerA / totalPower * 100
5. balanceLevel map sang khoảng percentA cho phép:
   "50-50" → [48,52] | "60-40" → [40,60] | "70-30" → [30,70]
6. Lọc tổ hợp có percentA trong khoảng. Nếu rỗng, nới thêm ±5% lặp tối đa 3 lần.
   Nếu vẫn rỗng sau 3 lần nới, lấy tổ hợp có percentA gần 50% nhất trong toàn bộ,
   kèm cảnh báo UI "Dữ liệu quá lệch, đã lấy phương án cân nhất có thể".
7. Random chọn 1 tổ hợp trong danh sách đã lọc (KHÔNG luôn lấy tổ hợp tối ưu nhất —
   phải random trong nhóm hợp lệ để mỗi lần bốc ra kết quả khác nhau).

### Gán vị trí:
Team đúng 5 người → random shuffle 5 vị trí gán không trùng. Team dư người (N lẻ) →
5 người đầu (random chọn) nhận 5 vị trí chuẩn, người dư nhận nhãn "Linh hoạt/Sub"
và random tướng từ TOÀN BỘ bể gộp bất kể chế độ đang chọn.

### Gán tướng "Đúng vị trí":
Random 1 tướng chưa dùng (bởi ai trong cả 2 team) từ đúng championPool[vị trí đó].
Hết tướng chưa dùng → fallback cho trùng NHƯNG chỉ với người ở team đối diện
(không trùng trong cùng 1 team), đánh dấu ⚠️ nhỏ.

### Gán tướng "Random toàn bể":
Gộp 5 mảng championPool thành 1 mảng (loại trùng tên), random không trùng cho tất cả
10 người. Cùng rule fallback như trên.

### Sinh tên team ngẫu nhiên:
Chuẩn bị 2 mảng: tinhTu (10-15 cụm tính từ vui, vd "Gánh Còng Lưng","Không Biết Sợ",
"Chuyên Feed","Bất Tử","Toxic Vui Vẻ") và danhTu (5-6 từ, vd "Liên Minh","Đội",
"Biệt Đội","Hội"). Random ghép 1 danhTu + 1 tinhTu cho mỗi team, nếu 2 team ra
trùng tên thì random lại cho team B tới khi khác nhau.

## Nguồn ảnh tướng (Data Dragon CDN):
URL: https://ddragon.leagueoflegends.com/cdn/15.10.1/img/champion/<key>.png
Cần 1 object mapping đầy đủ TÊN HIỂN THỊ (tiếng Việt/tên thường user gõ, không phân
biệt hoa thường, bỏ dấu nháy đơn) ↔ key chuẩn Riot. Chuẩn bị sẵn bảng mapping đầy đủ
cho toàn bộ tướng hiện có trong game (khoảng 165+ tướng, tính tới bản 15.x), xử lý
đúng các trường hợp đặc biệt như: "Kai'Sa"→"KaiSa", "Kha'Zix"→"Khazix",
"Cho'Gath"→"Chogath", "Wukong"→"MonkeyKing", "Nunu & Willump"→"Nunu",
"Renata Glasc"→"Renata", "Dr. Mundo"→"DrMundo", "Jarvan IV"→"JarvanIV",
"Lee Sin"→"LeeSin", "Master Yi"→"MasterYi", "Miss Fortune"→"MissFortune",
"Twisted Fate"→"TwistedFate", "Xin Zhao"→"XinZhao", "Aurelion Sol"→"AurelionSol",
"Tahm Kench"→"TahmKench" (và các case tương tự khác cùng pattern bỏ khoảng trắng/
dấu nháy). Nếu tên user gõ không khớp bất kỳ key nào trong mapping, hiện ảnh
placeholder mặc định (icon dấu hỏi) thay vì để trống/lỗi ảnh vỡ.

## Animation & âm thanh:
- Hộp Bí Ẩn: CSS 3D flip (transform: rotateY(180deg), backface-visibility: hidden
  trên 2 mặt của thẻ), trigger bằng thêm/bỏ class JS khi click.
- Vòng Quay: dùng setTimeout đệ quy (không phải setInterval cố định) để tạo hiệu
  ứng chậm dần dần theo mô tả thuật toán ở section 12b bên trên.
- Âm thanh: dùng thẻ <audio> ẩn với vài file mp3 ngắn (tạch, lật thẻ, tada) — nếu
  không có sẵn file âm thanh thì dùng Web Audio API tạo beep đơn giản bằng
  OscillatorNode thay thế, miễn là có phản hồi âm thanh khi soundEnabled = true.
- Confetti: dùng thư viện canvas-confetti qua CDN (unpkg hoặc cdnjs) cho đơn giản,
  không cần tự viết.

## Style yêu cầu (gen Z / gaming):
Nền gradient tím-đen (#1a0033 → #0d0d1a), chữ to đậm, font Google Fonts dễ đọc
tiếng Việt (vd "Be Vietnam Pro" hoặc "Baloo 2"). Rải emoji tự nhiên, slang "gánh
team","feed","carry","top 1" nhưng không lạm dụng gây rối UI. Responsive cơ bản
cho điện thoại.

## Lưu ý kỹ thuật chung:
- Code chia rõ 3 file: index.html, style.css, script.js (dễ đọc/maintain hơn 1 file
  gộp vì project này khá nhiều tính năng).
- Comment tiếng Việt cho các hàm thuật toán chính: chia team theo tier,
  generateCombinations, sinh tên team, xử lý resize ảnh, mapping tên tướng CDN,
  animation vòng quay.
- Không cần build step, không cần test framework — mở index.html là chạy được.
- Xử lý lỗi cơ bản: try/catch khi đọc/ghi localStorage (phòng trường hợp quota đầy
  hoặc JSON hỏng khi Nhập dữ liệu), hiện thông báo lỗi thân thiện thay vì crash trắng
  trang.
```

---

**Bản v2 đã gộp đủ toàn bộ yêu cầu ban đầu + 2 đề xuất mới (avatar, 2 kiểu reveal) + 3 đề xuất PM/BA bạn đã chọn (backup JSON, tên team vui, lịch sử, âm thanh). Sẵn sàng đưa nguyên phần 6 cho AI code để bắt đầu build.**
