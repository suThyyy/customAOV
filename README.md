# CustomAOV

**Beyond Random Teams. Build Your Competitive Legacy.**

CustomAOV là nền tảng cộng đồng dành cho người chơi **Liên Quân Mobile**, hướng đến việc tổ chức các trận đấu Custom, quản lý phòng, xây dựng cộng đồng và giải đấu, đồng thời ghi nhận thành tích thi đấu một cách minh bạch.

Từ một công cụ chia đội 5v5, CustomAOV đang phát triển thành hệ sinh thái kết nối **Players, Hosts, Streamers và Communities**.

### Một nền tảng — Sáu trải nghiệm

- **Home:** Khám phá hoạt động, phòng chơi, giải đấu và cộng đồng.
- **Rooms:** Quản lý hàng chờ, chia đội và tổ chức các trận Custom theo BO Series.
- **Tournaments:** Tổ chức giải đấu, đăng ký đội và quản lý nhánh đấu.
- **Leaderboards:** Xếp hạng và vinh danh thành tích.
- **Communities:** Xây dựng cộng đồng và tổ chức các hoạt động nội bộ.
- **Profiles:** Quản lý danh tính và hồ sơ thi đấu, hướng tới dữ liệu có thể truy xuất và xác minh.

**Quick Team** là công cụ chia đội nhanh có thể truy cập từ Home, không yêu cầu tạo Room hoặc đăng nhập.

### Our Vision

Chúng tôi tin rằng mỗi trận đấu Custom đều có thể mang lại nhiều giá trị hơn một kết quả thắng hoặc thua. CustomAOV hướng đến một hệ thống nơi thành tích được ghi nhận theo nguồn dữ liệu rõ ràng, cộng đồng có thể tự tổ chức hoạt động và mỗi người chơi có một hành trình thi đấu đáng tin cậy.

**Current Status:** Active Development — React + TypeScript, Mock/Supabase integration và mở rộng các module cộng đồng.

**Website hiện tại:** https://suthyyy.github.io/customAOV/

> CustomAOV là dự án cộng đồng độc lập, không trực thuộc hoặc được Garena chứng thực.

## 1. Tầm nhìn và nguyên tắc sản phẩm

CustomAOV giải quyết ba nhu cầu chính:

1. **User — Người chơi:** Chia đội nhanh, tham gia hàng chờ qua invite link, tham gia cộng đồng, đăng ký giải đấu và quản lý hồ sơ cá nhân.
2. **Admin — Người tổ chức:** Có toàn bộ khả năng của User; đồng thời tạo và quản lý Room, hàng chờ, BO Series, Community và Tournament trong phạm vi mình sở hữu hoặc được ủy quyền.
3. **Super Admin — Người vận hành nền tảng:** Quản lý tài khoản, vai trò, danh mục quyền, cấu hình module và quy tắc vận hành toàn hệ thống.

**Guest** (chưa đăng nhập) có thể sử dụng Quick Team. Các chức năng yêu cầu tài khoản phải đi qua xác thực phù hợp.

**Nguyên tắc UX:** *User tham gia — Admin tổ chức — Super Admin quản trị nền tảng.* User không cần điều khiển hoặc liên tục theo dõi Room Console sau khi đăng ký hàng chờ; họ có thể theo dõi diễn biến trên livestream của Host.

Các nguyên tắc dài hạn:

- **Fair competition:** Chia đội và tổ chức trận minh bạch, theo quy tắc rõ ràng.
- **Transparent records:** Phân biệt dữ liệu người dùng khai báo, dữ liệu nền tảng ghi nhận và dữ liệu từ nguồn game được xác minh.
- **Trustworthy identity:** Liên kết tài khoản nền tảng với thông tin game trong phạm vi có thể kiểm chứng.
- **Reduced manipulation:** Hướng tới hạn chế smurfing và gian lận khi có đủ dữ liệu và cơ chế xác minh.
- **Traceable results:** Kết quả cần ghi nhận người khai báo, thời điểm, trận liên quan và trạng thái xác minh.
- **Community-driven organization:** Người tổ chức có công cụ quản lý cộng đồng, phòng đấu và giải đấu của mình.

CustomAOV **không mặc định coi kết quả do Host khai báo là kết quả đã được game xác minh**.

## 2. Các module chính

### Home

Trang điều hướng và khám phá nội dung theo vai trò:

- **Guest/User:** Quick Team, tham gia Room qua link, Communities, Tournaments và Profile khi đăng nhập.
- **Admin:** Có thêm Room Manager, Community Manager và Tournament Manager.
- **Super Admin:** Có thêm Platform Administration và Permission Management.

Với Admin, Home cần hiển thị **Room đang quản lý** để có thể quay lại sau khi chuyển module, reload hoặc đăng nhập lại. Room còn tồn tại trên Backend không được biến mất chỉ vì state React bị reset.

### Quick Team

Công cụ chia đội nhanh, tách biệt với Room Management:

1. Nhập danh sách 10 người chơi.
2. Chọn **Random / Tier / Rank** và nhập Tier/Rank khi cần.
3. Chia thành **Blue 5 vs 5 Red**.
4. Có thể **Swap**, chia lại hoặc reset.

Quick Team dành cho cả Guest và tài khoản đã đăng nhập; không bắt buộc Auth, không tạo Supabase Room và không cần Queue, Realtime hay BO Series. Dữ liệu mặc định chỉ dùng trong phiên công cụ. Quy tắc balancing nên nhất quán với Room Mode trong phạm vi khả thi.

### Rooms

Module dành cho **Admin** tổ chức Custom Match. **User** chủ yếu tham gia Queue bằng invite link hoặc được Admin thêm theo quy tắc của phòng.

**Luồng User tham gia:**

1. Mở invite link do Admin chia sẻ.
2. Đăng nhập/đăng ký nếu cần, rồi quay lại đúng link.
3. Xác nhận **Tham gia hàng chờ**.
4. Nhận thông báo đăng ký thành công và vị trí Queue nếu có dữ liệu đáng tin cậy.
5. Tiếp tục theo dõi livestream; không bắt buộc mở Room Console.

**Luồng Host vận hành Room:**

| Bước | Trạng thái | Thao tác | Kết quả |
| --- | --- | --- | --- |
| 1 | `OPEN` | Bấm **Tạo phòng**, chọn tên, BO3/BO5/BO7, visibility và cấu hình | Room được lưu với ID ổn định và có link mời |
| 2 | `OPEN → PREPARE` | Tìm User và thêm vào Queue hoặc nhận User join qua link; bấm **Chuẩn bị vòng** | Chọn **10 người hợp lệ đầu Queue** vào nhóm Selected |
| 3 | `PREPARE` | Chọn **Random / Tier / Rank**; bấm **Chia đội** | Phân **Blue 5 vs 5 Red**, có thể trình diễn Team Reveal |
| 4 | `PREPARE` | Kiểm tra đội hình; **Kick / Replace / Swap** | Điều chỉnh đội hình trước khi bấm **Bắt đầu** |
| 5 | `IN GAME` | Gán Hero/Lane cho từng người; trận đấu diễn ra ngoài nền tảng | Host bấm **END**, nhập Match ID và khai báo kết quả |
| 6 | `GAME REPORTED / SERIES ACTIVE` | Bắt đầu Game tiếp theo | Giữ nguyên roster/đội của BO và lặp lại đến khi xác định đội thắng Series |
| 7 | `SERIES COMPLETE` | Chuẩn bị Series tiếp theo | Chọn người từ Queue theo luật vòng mới, tiếp tục ghi nhận lịch sử |

**Quy tắc quản lý Room:**

- **Queue:** Xếp hàng theo FIFO, việc chọn người phải dựa trên dữ liệu Backend.
- **Kick:** Loại một thành viên khỏi Room. Nếu Kick người đang Selected trước START, mục tiêu là tự bổ sung người hợp lệ đầu Queue; nếu Queue rỗng thì phải bổ sung đủ roster trước START.
- **Replace:** Đổi một người Selected với người trong Queue; người bị thay quay về Queue, **không bị loại khỏi Room**.
- **Swap:** Đổi vị trí hai người Selected, kể cả giữa Blue và Red; không thay đổi membership hay Queue. Kéo-thả là thao tác bổ sung bên cạnh nút Swap.
- **Roster lock:** Sau khi START Game 1, roster và đội được khóa trong BO hiện tại; không Kick/Replace/Swap làm thay đổi đội hình Series đang diễn ra.
- **Persistence & Realtime:** Room phải có thể tìm lại sau khi chuyển module hoặc reload. Thao tác quan trọng được kiểm tra quyền, thực hiện atomically và đồng bộ từ Backend; frontend không giả lập kết quả thành công.

Admin có thể tìm người chơi theo username/display name để thêm vào Queue, trong phạm vi quyền và cơ chế xác nhận phù hợp. Người chưa có tài khoản có thể được thêm dưới dạng Guest, không tự động gắn với Profile thật.

**Match Data:** Kết quả Host nhập hiện được xem là **Host-reported / Unverified**. Nhập Match ID không có nghĩa hệ thống đã truy vấn hoặc xác minh dữ liệu game. Tự động tra cứu Match ID, kết quả, Hero/Lane và thống kê từ nguồn game bên ngoài vẫn là hướng nghiên cứu phụ thuộc nguồn dữ liệu hợp lệ.

### Tournaments

Module tổ chức giải đấu **Public** hoặc **Community-only**:

- Tạo và cấu hình giải đấu.
- Đăng ký đội/người chơi theo thể thức.
- Duyệt hoặc từ chối đăng ký.
- Quản lý lịch thi đấu và bracket.
- Báo cáo kết quả và ghi nhận thành tích.

User đăng ký tham gia; Admin tổ chức và quản lý những giải đấu thuộc quyền của mình.

### Leaderboards

Xếp hạng người chơi, đội và cộng đồng theo tiêu chí, chế độ, mùa giải hoặc khoảng thời gian. Mỗi bảng xếp hạng cần công bố **nguồn dữ liệu, điều kiện đủ tiêu chuẩn, cách tính, kỳ thống kê và trạng thái xác minh**.

### Communities

Cộng đồng **Public/Private** với membership, quản lý thành viên, quyền nội bộ và các hoạt động như Room hoặc Tournament dành riêng cho cộng đồng.

User tham gia cộng đồng; Admin tạo và điều hành cộng đồng thuộc quyền quản lý.

### Profiles

Hồ sơ cá nhân và dữ liệu thi đấu:

- Tài khoản CustomAOV, display name, avatar và thông tin cơ bản.
- Game UID và dữ liệu game có thể liên kết.
- Lịch sử tham gia Room và Tournament.
- Thành tích, thống kê và Match History.
- Phân biệt rõ dữ liệu tự khai, dữ liệu nền tảng ghi nhận và dữ liệu được xác minh từ bên ngoài.

Ưu tiên tự truy xuất thông tin khi có nguồn hợp lệ; không coi thông tin tự khai là dữ liệu đã được xác minh.

### Platform Administration

Khu vực dành cho **Super Admin**:

- Quản lý tài khoản và gán vai trò **User / Admin / Super Admin**.
- Quản lý danh mục module, chức năng và quyền thao tác theo RBAC.
- Cấu hình quyền truy cập theo vai trò, kết hợp kiểm tra **ownership** trên từng Room, Community và Tournament.
- Quản lý cấu hình nền tảng và theo dõi audit logs.

**Nguyên tắc:** Ẩn chức năng trên giao diện không thay thế được kiểm tra quyền tại Backend, RPC và RLS. Super Admin không phải vai trò người dùng tự chọn khi đăng ký.

## 3. Định hướng phát triển

CustomAOV sử dụng **một codebase React + TypeScript**, hỗ trợ hai nguồn dữ liệu thông qua cấu hình môi trường:

- **Mock Mode:** Phát triển và nghiệm thu giao diện/nghiệp vụ mà không ghi vào Production.
- **Supabase Mode:** Kết nối Auth, PostgreSQL, RPC, RLS và Realtime thực tế.

Các module sử dụng chung domain contracts; không tách Git branch chỉ để phân biệt Mock và Supabase. Module mới có thể phát triển **Mock-first**, sau đó tích hợp Backend theo hợp đồng nghiệp vụ đã chốt. Ownership và kiểm tra quyền truy cập cần được thiết kế ngay từ đầu, dù giao diện quản trị RBAC được hoàn thiện sau.

**Trạng thái:** Room/BO Series đã có triển khai Backend và Frontend, nhưng vẫn đang được nghiệm thu vận hành và xử lý các vấn đề UAT. Community, Tournament và quản trị RBAC là các hạng mục mở rộng; việc truy xuất và xác minh dữ liệu trận từ game chưa được coi là đã triển khai.

## 4. Tương lai tích hợp và hợp tác

Các hướng hợp tác hoặc tích hợp có thể bao gồm:

- Streamer, Community Admin và nhà tổ chức giải.
- Đối tác cung cấp dữ liệu trận đấu hợp pháp, ổn định.
- Spectator hoặc live match services.
- Đối tác tổ chức esports/tournament.
- Nguồn xác minh identity hoặc tài khoản game phù hợp với quyền riêng tư và điều khoản dịch vụ.

Mọi tích hợp bên ngoài phải được đánh giá về quyền truy cập, độ chính xác, tính ổn định, khả năng truy xuất nguồn gốc và điều khoản sử dụng; không coi một hướng R&D là tính năng đã sẵn sàng khi chưa được kiểm chứng.

## 5. Đóng góp và cộng tác

- **GitHub:** Quản lý source code, pull request và code review.
- **Linear:** Quản lý backlog, issue và milestone.
- **AI coding agents:** Hỗ trợ phân tích, phát triển, kiểm thử và review trong phạm vi task được giao.

Các thay đổi quan trọng về Auth, database, Room lifecycle, Realtime hoặc phân quyền cần có tài liệu và regression verification tương ứng.

---

**Build a better Custom experience — fairer teams, stronger communities, and meaningful match history.**
