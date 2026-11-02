# CustomAOV

**A community-driven platform for organizing Arena of Valor custom matches.**

CustomAOV là dự án phát triển nền tảng hỗ trợ tổ chức và quản lý các trận đấu Custom 5v5 trong **Liên Quân Mobile (Arena of Valor)**.

Khởi đầu từ công cụ chia đội ngẫu nhiên, CustomAOV hướng đến xây dựng một sân chơi cộng đồng thuận tiện, công bằng, minh bạch và có tính cạnh tranh, nơi người chơi có thể tham gia Custom, theo dõi lịch sử thi đấu và tích lũy thành tích thực tế.

**Website:** https://suthyyy.github.io/customAOV/

## 1. Current Features — Phase 1

**Status: MVP / Internal Testing**

- **Player Management:** Thêm, sửa, xóa, quản lý danh sách người chơi, Tier và Rank.
- **Team Balancing:** Chia đội ngẫu nhiên, cân bằng theo Skill (5 Tier) hoặc Rank (32 bậc).
- **Role & Hero Assignment:** Phân chia vị trí và lựa chọn/random tướng.
- **Result Reveal:** Công bố đội hình bằng các hiệu ứng trực quan.
- **Live Share:** Chia sẻ kết quả chia đội theo thời gian thực.
- **Local History:** Lưu lịch sử bốc thăm và hỗ trợ import/export dữ liệu.

Thuật toán hiện tại sử dụng điểm quy đổi từ Tier hoặc Rank để tìm kiếm các đội hình tương đối cân bằng. Đây chưa phải hệ thống đánh giá trình độ dựa trên dữ liệu thi đấu thực tế.

**Current Tech Stack:** HTML, CSS, JavaScript, localStorage, Firebase Realtime Database và GitHub Pages.

## 2. Product Vision

CustomAOV hướng đến ba nhóm người dùng:

| Nhóm | Vai trò |
|---|---|
| **Super Admin** | Đội ngũ CustomAOV, quản trị toàn bộ nền tảng |
| **Community Admin** | TikToker, Streamer, KOL được cấp tài khoản quản lý cộng đồng riêng |
| **User** | Người chơi đăng ký tài khoản, tham gia cộng đồng và các trận Custom |

### Community & Match Organization

- Người chơi đăng ký tài khoản CustomAOV qua email hoặc số điện thoại khi được hỗ trợ.
- Tham gia một hoặc nhiều cộng đồng của các Streamer/KOL.
- Community Admin có thể quản lý thành viên, phê duyệt hoặc từ chối yêu cầu tham gia theo cấu hình cộng đồng.
- Host tổ chức trận Custom bằng cách chia sẻ link đăng ký hoặc tìm kiếm, lựa chọn người chơi trực tiếp từ cộng đồng.
- Hệ thống hỗ trợ chia đội và tổ chức các trận Casual, Competitive hoặc Tournament theo phạm vi phát triển từng giai đoạn.

Các chức năng chia đội cơ bản vẫn được định hướng sử dụng mà không bắt buộc đăng nhập.

## 3. Match History & Player Statistics

CustomAOV định hướng **chỉ ghi nhận thành tích từ các trận đấu được tổ chức thông qua nền tảng**, không đồng bộ toàn bộ lịch sử đấu của tài khoản Liên Quân.

Thành tích sẽ hỗ trợ cả thống kê tổng hợp và thống kê riêng theo chế độ Casual/Competitive.

### Proposed Match Flow

1. **Team Setup:** Host chọn 10 người, chia đội và xác định chế độ thi đấu trên CustomAOV.
2. **Gameplay:** Người chơi vào Liên Quân và thi đấu bình thường.
3. **Result Submission:** Sau trận, Host chọn lane và tướng thực tế của từng người, sau đó gửi yêu cầu đồng bộ.
4. **Match Retrieval:** Backend CustomAOV tìm kiếm và truy xuất Match Details từ nguồn dữ liệu khả dụng.
5. **Validation & Mapping:** Đối chiếu trận đấu, đội hình, tướng và người tham gia với dữ liệu CustomAOV.
6. **Match History:** Lưu kết quả và các chỉ số hợp lệ vào PostgreSQL, ghi nhận thống kê cá nhân cho những người chơi có tài khoản được liên kết.

Dữ liệu mục tiêu bao gồm Win/Loss, Hero, Lane, KDA, MVP, điểm trận, vàng, sát thương, chống chịu, trang bị và các chỉ số khác khi có thể truy xuất.

Người chưa có tài khoản CustomAOV vẫn có thể tham gia trận đấu, nhưng không tích lũy thành tích cá nhân trên nền tảng.

### Match Data Retrieval — R&D

Garena hiện chưa có API công khai được nhóm xác minh là phù hợp để CustomAOV truy xuất Match Details. Dự án đang xem xét hai hướng:

**Option A — Third-party Integration**

Nghiên cứu hoặc thuê ngoài dịch vụ/API có khả năng cung cấp dữ liệu lịch sử và chi tiết trận đấu, với các tiêu chí về tính chính xác, quyền truy cập, độ ổn định và khả năng sử dụng lâu dài.

**Option B — In-house Integration**

Nghiên cứu phát triển dịch vụ truy vấn dữ liệu từ lịch sử đấu có thể truy cập hợp lệ.

Luồng dự kiến:

`Player Profile → Match History → Match Details → Data Mapping → CustomAOV Database`

Hệ thống có thể thử tra cứu lần lượt những người tham gia trận có lịch sử công khai và đã đồng ý sử dụng dữ liệu, dừng khi tìm được đúng trận và dữ liệu đủ để đối chiếu.

Một tài khoản game phục vụ nghiên cứu có thể được sử dụng để kiểm tra khả năng xem lịch sử công khai, nhưng không mặc định có quyền truy cập API nội bộ hoặc dữ liệu bị ẩn.

**Current Status:** Cả hai hướng đều đang ở mức nghiên cứu khả thi (R&D), chưa có API tích hợp được xác nhận hoạt động. Nếu chưa có nguồn truy xuất phù hợp, hệ thống có thể sử dụng phương án nhập kết quả và bằng chứng trận đấu để dự phòng.

## 4. Development Roadmap

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Team Randomizer, Skill/Rank Balancing, Live Share | MVP / Internal Testing |
| **Phase 2.1** | PostgreSQL, Supabase Auth, Account & Game Profile | In Development |
| **Phase 2.2** | Community Management, Membership, Custom Rooms | Planned |
| **Phase 2.3** | Match Results, Match History, Player Statistics | R&D / Planned |
| **Phase 3** | Data-driven Team Balancing dựa trên thành tích thi đấu | Future |
| **Phase 4** | Tournament Management, BO1/BO3/BO5, Standings | Future |
| **Phase 5** | Ecosystem, Partnerships & Monetization | Exploratory |

Roadmap có thể được điều chỉnh dựa trên phản hồi người dùng, nguồn lực và tính khả thi kỹ thuật.

## 5. Technical Direction

**Current:** Vanilla JavaScript, localStorage, Firebase Live Share, GitHub Pages.

**Planned:**
- **Database:** PostgreSQL.
- **Authentication & Backend Services:** Supabase.
- **Frontend:** Kế thừa hệ thống hiện tại, cân nhắc React + TypeScript + Vite khi phù hợp.
- **Match Data:** Backend integration thông qua nguồn dữ liệu được xác minh.
- **Realtime:** Đánh giá phương án tiếp tục sử dụng hoặc chuyển đổi từ Firebase khi có nhu cầu thực tế.

Các quyết định kỹ thuật được triển khai theo từng milestone, ưu tiên giữ ổn định tính năng hiện có và tránh thay đổi kiến trúc không cần thiết.

## 6. Development & Collaboration

- **GitHub:** Source code, Pull Requests và code review.
- **Linear:** Backlog, issues, milestones và tiến độ.
- **AI Coding Agents:** Hỗ trợ phân tích yêu cầu, triển khai, kiểm thử và review theo phạm vi task.

Các quy định kỹ thuật và hướng dẫn agent được quản lý trong repository khi cần thiết.

## Project Direction

**Build a better Custom experience — fairer teams, stronger communities, and meaningful match history.**

CustomAOV ưu tiên giá trị thực tế cho người tổ chức và người chơi. Những cơ hội mở rộng như hợp tác cộng đồng, esports và các mô hình dịch vụ mới được xem là tiềm năng phát triển, không phải điều kiện quyết định thành công của dự án.

---

*CustomAOV is an independent community project and is not officially affiliated with or endorsed by Garena.*
