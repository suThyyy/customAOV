# CUSTOMAOV
## Project Overview & Vision

**Version:** 0.1 — Draft  
**Updated:** 16/10/2026  
**Status:** Proposal / Internal Discussion

---

## 1. Project Overview

**CustomAOV** là dự án phát triển nền tảng hỗ trợ tổ chức và quản lý các trận đấu Custom 5v5 trong Liên Quân Mobile (Arena of Valor).

Dự án bắt đầu từ một website bốc thăm chia đội, giúp người tổ chức lựa chọn người chơi, phân chia đội hình, random vị trí và tướng, đồng thời công bố kết quả một cách trực quan.

### Bối cảnh và vấn đề

Hiện nay, nhiều nhóm Custom tổ chức trận đấu thông qua Discord, TikTok hoặc các cộng đồng riêng. Việc quản lý danh sách, chia đội và theo dõi kết quả thường được thực hiện thủ công, đôi khi phải sử dụng Excel hoặc phụ thuộc vào kinh nghiệm của người tổ chức.

Điều này có thể dẫn đến việc chia đội thiếu nhất quán, mất thời gian, khó đánh giá sự cân bằng và thiếu dữ liệu để quản lý các trận đấu lâu dài.

**CustomAOV hướng đến việc giải quyết những vấn đề đó**, bắt đầu bằng một công cụ chia đội thuận tiện và từng bước mở rộng thành nền tảng quản lý hoạt động Custom.

### Đối tượng sử dụng

- **Organizer:** Người tổ chức và điều phối các trận Custom.
- **Player:** Người tham gia thi đấu, theo dõi đội hình, kết quả và thành tích cá nhân.
- **Community Admin:** Người quản lý cộng đồng, thành viên, sự kiện và giải đấu.

---

## 2. Product Vision

**Xây dựng CustomAOV trở thành một nền tảng hỗ trợ tổ chức, quản lý và phát triển cộng đồng Custom Liên Quân Mobile, nơi người chơi có thể kết nối, thi đấu, theo dõi thành tích và tham gia các hoạt động cạnh tranh một cách thuận tiện, minh bạch và có hệ thống.**

Về lâu dài, dự án hướng đến ba giá trị chính:

- **Đối với người tổ chức:** Đơn giản hóa việc quản lý người chơi, chia đội, tổ chức trận đấu và sự kiện.
- **Đối với người chơi:** Xây dựng hồ sơ, lưu trữ lịch sử thi đấu, thống kê hiệu suất và ghi nhận thành tích theo thời gian.
- **Đối với cộng đồng:** Hình thành môi trường Custom có tổ chức, tăng tính minh bạch, hỗ trợ định danh người chơi và hạn chế các hành vi gian lận hoặc smurf khi có đủ dữ liệu và cơ chế xác minh.

Dự án được định hướng phát triển theo từng giai đoạn, dựa trên nhu cầu thực tế, nguồn lực của nhóm và khả năng vận hành lâu dài.

---

## 3. Current Product — Phase 1

**Trạng thái: MVP đã hoàn thiện các chức năng cốt lõi, đang vận hành và kiểm thử nội bộ.**

CustomAOV hiện hỗ trợ:

| Module | Chức năng |
|---|---|
| Player Management | Xem, Thêm, Sửa, Xóa, ON/OFF, đổi avatar, chỉnh Tier/Rank và lựa chọn người chơi |
| Random Balancing | Chia ngẫu nhiên thành hai đội 5v5 |
| Skill-Based Balancing | Chia đội theo 5 Tier, phù hợp với nhóm đã biết kỹ năng của nhau |
| Rank-Based Balancing | Chia đội theo 32 bậc Rank, phù hợp khi chưa có dữ liệu về người chơi |
| Role & Hero Assignment | Phân chia vị trí, lựa chọn hoặc random tướng |
| Result Reveal | Công bố đội hình qua Hộp bí ẩn hoặc Vòng quay số phận |
| Live Share | Chia sẻ kết quả bốc thăm theo thời gian thực |
| Local Data & History | Lưu dữ liệu trên trình duyệt, lịch sử bốc thăm và import/export JSON |

Thuật toán cân bằng hiện sử dụng điểm sức mạnh quy đổi từ Tier hoặc Rank, tìm kiếm các tổ hợp đội hình đáp ứng ngưỡng cân bằng và lựa chọn ngẫu nhiên giữa các phương án phù hợp.

Đây là cơ chế cân bằng dựa trên điểm quy ước, chưa phải hệ thống đánh giá năng lực thực tế hay dự đoán xác suất chiến thắng.

### Technical Snapshot

- **Frontend:** HTML, CSS, JavaScript.
- **Business Logic:** Randomizer Core.
- **Data Storage:** localStorage.
- **Realtime:** Firebase Realtime Database cho Live Share.
- **Hosting:** GitHub Pages.

Website: https://suthyyy.github.io/customAOV/  
Repository: https://github.com/suThyyy/customAOV

**Giới hạn hiện tại:** Chưa có tài khoản và cơ sở dữ liệu tập trung. Firebase Live Share đang sử dụng cơ chế cũ, cần nâng cấp phân quyền trước khi mở rộng công khai.

---

## 4. Product Roadmap

### Phase 1 — Team Randomizer MVP

**Status: Functionally Complete / Internal Operation**

Hoàn thiện công cụ chia đội 5v5 với các chế độ Random, Skill-Based và Rank-Based, kết hợp quản lý người chơi, random vị trí/tướng và Live Share.

Trọng tâm tiếp theo là vận hành thực tế, ghi nhận phản hồi, tối ưu trải nghiệm và xử lý các lỗi phát sinh.

### Phase 2 — Account, Profile & Match Management

**Status: Proposed**

Xây dựng nền tảng dữ liệu và quản lý người dùng, bao gồm:

- Database, backend và hệ thống đăng ký/đăng nhập.
- Hồ sơ người dùng và người chơi, vị trí sở trường, Rank và thông tin liên quan.
- Quản lý trận đấu, đội hình, kết quả thắng/thua và lịch sử tham gia.
- Thống kê KDA, hiệu suất theo từng lane và từng chế độ Custom (vui vẻ hoặc thi đấu cạnh tranh).
- Cho phép người dùng có tài khoản tham gia phòng qua link thay vì phải nhập thủ công.
- Nâng cấp bảo mật, phân quyền và cơ chế vận hành Live Share.

Các chức năng chia đội cơ bản dự kiến vẫn có thể sử dụng mà không bắt buộc đăng nhập.

### Phase 3 — Advanced Team Balancing

**Status: Future Direction**

Nghiên cứu cơ chế cân bằng đội hình dựa trên dữ liệu thi đấu thực tế thay vì chủ yếu phụ thuộc vào Rank hoặc đánh giá chủ quan của người tổ chức.

Hệ thống có thể xem xét lịch sử thắng/thua, KDA, vị trí sở trường và hiệu suất trong các trận Custom để xây dựng chỉ số đánh giá kỹ năng phù hợp.

Mục tiêu là cải thiện chất lượng chia đội dựa trên dữ liệu tích lũy, không mặc định rằng một chỉ số đơn lẻ phản ánh chính xác năng lực người chơi.

### Phase 4 — Tournament Management

**Status: Future Direction**

Phát triển các công cụ tổ chức giải đấu Custom, bao gồm quản lý đội tham gia, lịch thi đấu, nhánh đấu, thể thức BO1/BO3/BO5, kết quả và bảng xếp hạng.

### Phase 5 — Monetization & Ecosystem

**Status: Exploratory**

Nghiên cứu khả năng vận hành bền vững và thương mại hóa khi sản phẩm có đủ người dùng và nhu cầu thực tế.

Các hướng tiềm năng gồm tính năng nâng cao dành cho organizer, hỗ trợ tổ chức sự kiện, hợp tác cộng đồng, tài trợ và tích hợp dịch vụ thanh toán khi phù hợp.

Những tính năng liên quan đến giải thưởng, thanh toán hoặc rút tiền chỉ được xem xét sau khi đánh giá yêu cầu pháp lý và khả năng vận hành.

---

## 5. Next Steps & Development Direction

Trong ngắn hạn, nhóm tập trung **vận hành Phase 1 với người dùng thực tế** để đánh giá tính ổn định, sự thuận tiện và nhu cầu mở rộng.

Song song, cần thống nhất cách phối hợp phát triển, quy trình Git, quyền quản lý repository, Firebase và hoạt động triển khai.

Sau khi Phase 1 vận hành ổn định, nhóm sẽ bắt đầu phân tích nghiệp vụ Phase 2, ưu tiên thiết kế dữ liệu, tài khoản, hồ sơ người chơi và hệ thống quản lý trận đấu trước khi triển khai backend.

**Định hướng phát triển:**

*Bắt đầu từ một công cụ hữu ích, xây dựng dựa trên nhu cầu thực tế và từng bước phát triển thành nền tảng phục vụ cộng đồng Custom Liên Quân Mobile.*

---

### Flow

Bước 1: Hoàn thiện Phase 1 hiện tại

Giữ nguyên:

Vanilla JS + localStorage + Firebase Live Share


Bước 2: Thiết kế database Phase 2

Dựng PostgreSQL schema cho:

- Profiles.
- Communities.
- Rooms.
- Matches.
- Match players.
- Statistics.


Bước 3: Dựng Supabase Auth và API

Cho phép tạo tài khoản, profile và lưu match history.

Bước 4: Chuyển từng phần frontend

Khi Phase ổn, chuyển giao diện sang:

React + TypeScript + Vite

Không rewrite randomizer. Giữ core hiện tại và gọi nó từ React.

Bước 5: Migrate Live Share

Chuyển Firebase Live Share sang Supabase Realtime khi hệ thống mới ổn định.

### Kiến trúc cuối cùng

React + TypeScript + Vite
              |
              v
        Supabase Auth
              |
              v
     PostgreSQL + RLS
        |       |       |
     Storage  Realtime  Functions

Firebase là giải pháp tạm thời cho Live Share hiện tại. Về lâu dài, chọn backend duy nhất là Supabase + PostgreSQL