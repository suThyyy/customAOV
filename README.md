# CustomAOV

CustomAOV là nền tảng cộng đồng để tổ chức, quản lý và ghi nhận các trận đấu Custom và giải đấu Liên Quân Mobile (Arena of Valor).

CustomAOV bắt đầu từ công cụ chia đội ngẫu nhiên và đang phát triển thành hệ thống hỗ trợ Host, người chơi, Viewer, cộng đồng và nhà tổ chức giải. Mục tiêu là tạo ra trải nghiệm thi đấu công bằng hơn, hồ sơ đáng tin cậy hơn và dữ liệu trận đấu có thể truy xuất theo nguồn gốc rõ ràng.

**Website hiện tại:** <https://suthyyy.github.io/customAOV/>

> CustomAOV là dự án cộng đồng độc lập, không trực thuộc hoặc được Garena chứng thực.

## 1. Tầm nhìn và nguyên tắc sản phẩm

CustomAOV hướng tới một nền tảng nơi người chơi có thể tìm trận, tham gia phòng, theo dõi kết quả, xây dựng hồ sơ và tham gia các cộng đồng hoặc giải đấu phù hợp.

Các nguyên tắc dài hạn:

- **Fair competition:** chia đội và tổ chức trận minh bạch, có quy tắc rõ ràng.
- **Transparent records:** phân biệt dữ liệu do người dùng khai báo, dữ liệu hệ thống ghi nhận và dữ liệu được xác minh từ nguồn game bên ngoài.
- **Trustworthy identity:** liên kết tài khoản nền tảng với thông tin game trong phạm vi có thể kiểm chứng.
- **Reduced manipulation:** giảm khả năng smurfing và gian lận khi có đủ dữ liệu, quy tắc và cơ chế xác minh.
- **Traceable results:** kết quả phải có người gửi, thời điểm, trận/phòng liên quan và trạng thái xác minh.
- **Community-driven organization:** Host, Community Admin và nhà tổ chức có công cụ phù hợp với phạm vi quản lý của họ.

CustomAOV không mặc định coi một kết quả do Host báo cáo là kết quả đã được game xác minh.

## 2. Sáu module kinh doanh chính

### Home

Dashboard và khu vực khám phá cho phòng nổi bật, giải đấu, hoạt động gần đây, quick tools, thông báo và các vị trí nội dung hoặc quảng bá trong tương lai.

**Trạng thái:** Planned. Phiên bản hiện tại ưu tiên Quick Randomizer và Open Room, chưa có Home platform đầy đủ.

### Rooms

Không gian tổ chức trận Custom public/private với các vai trò Host, Player và Viewer:

- tạo phòng và chia sẻ invite link;
- Account Join và Host-added Player;
- FIFO Queue với trạng thái Waiting/Selected;
- chia đội theo Random, Tier hoặc Rank;
- Prepare, Start, End, Next Round và Continue/Requeue;
- Host kick, replace và quản lý thành viên;
- đồng bộ trạng thái qua Supabase Realtime;
- lưu trạng thái phòng và đội hình qua PostgreSQL/RPC.

**Trạng thái:** In Progress; Open Room và Queue đã có implementation trong repository hiện tại. Một số hành vi live multi-client, RLS và migration production vẫn cần được xác minh theo môi trường triển khai.

### Tournaments

Module cho việc tạo và điều hành giải đấu:

- tạo giải;
- đăng ký đội;
- duyệt hoặc từ chối đăng ký;
- lịch thi đấu;
- bracket;
- báo cáo kết quả;
- bảng xếp hạng và hồ sơ thành tích.

**Trạng thái:** Planned. Chưa coi các màn hình hoặc mock ở repository `platform` là tính năng đã tích hợp vào CustomAOV.

### Leaderboards

Bảng xếp hạng người chơi, đội và cộng đồng theo metric, mode, mùa giải hoặc khoảng thời gian.

Mỗi bảng xếp hạng trong tương lai phải công bố:

- nguồn dữ liệu;
- tiêu chí đủ điều kiện;
- cách tính;
- khoảng thời gian;
- trạng thái xác minh của dữ liệu.

**Trạng thái:** Planned. Chưa có leaderboard production.

### Communities

Cộng đồng public/private với membership, role, phòng nội bộ, giải nội bộ và activity feed.

**Trạng thái:** Planned. Role trong profile hiện tại không đồng nghĩa với hệ thống Community hoàn chỉnh.

### Profiles

Profile là identity và performance module trung tâm trong dài hạn:

- tài khoản CustomAOV;
- display name, avatar, bio và role;
- Game UID và thông tin game do người dùng cung cấp;
- lịch sử tham gia;
- thống kê;
- match history;
- dữ liệu đã được hệ thống ghi nhận hoặc xác minh.

**Trạng thái:** In Progress. Supabase Auth, account profile, game profile, Game UID cooldown và các policy bảo vệ profile đã có implementation; match history và verified performance data chưa hoàn chỉnh.

## 3. Trạng thái implementation hiện tại

### Implemented

- Quick Randomizer cho 10 người chơi.
- Chia đội Random.
- Chia đội cân bằng theo Tier hoặc Rank.
- Cấu hình score và balance level.
- Phân role/lane và champion assignment theo cấu hình hiện tại.
- Team reveal với secret box, slot-machine, âm thanh và hiệu ứng trực quan.
- Local history và import/export dữ liệu Randomizer.
- Quick Randomizer Live Share qua Firebase Realtime Database.
- Supabase Auth với đăng ký, OTP và đăng nhập.
- Account Profile và Game Profile cơ bản.
- Open Match Room.
- Invite link, Account Join và Host-added Player.
- FIFO Queue và trạng thái Waiting/Selected.
- Host permission, kick, requeue và replacement theo luật Room.
- Prepare/Start/End/Next Round/Continue theo Room lifecycle hiện tại.
- Lưu đội hình và thao tác Room qua RPC có kiểm tra quyền, lock và version.
- Supabase Realtime cho các bảng Room.
- Unit, integration, UI và migration-contract tests trong repository.

### In Progress / cần xác minh thêm

- Xác nhận migration HUY-9/HUY-10/HUY-11 đã được apply đúng ở từng môi trường Supabase.
- Live multi-client verification với dữ liệu staging.
- Kiểm tra đầy đủ RLS, Realtime publication và concurrency trên PostgreSQL thật.
- Hoàn thiện profile data flow và quy tắc dữ liệu lâu dài.
- Chuẩn bị migration frontend từng phần sang React + TypeScript.

### Planned

- Home/Dashboard và discovery.
- Community membership và Community Admin tools.
- Tournament creation, registration, bracket, scheduling và result reporting.
- Leaderboards có provenance và eligibility rules.
- Match history và player/team statistics từ các trận được tổ chức trên nền tảng.
- Typed service adapters để frontend React dùng backend hiện tại.

### Exploratory

- Spectator API.
- Live match integrations.
- Third-party game-data partnerships.
- Game account ownership verification.
- Automatic match tracking.
- Match ID lookup.
- External game data và verified result pipeline.

Các mục Exploratory chưa phải cam kết sản phẩm và không được coi là đã có API, quyền truy cập hoặc đối tác triển khai.

## 4. Phân loại dữ liệu và mức độ xác minh

CustomAOV sẽ phân biệt rõ ba loại dữ liệu:

| Loại dữ liệu | Ví dụ | Ý nghĩa |
|---|---|---|
| User-declared | Game UID, Tier/Rank do người chơi hoặc Host nhập | Thông tin do người dùng khai báo, chưa tự động xác minh |
| Platform-recorded | Phòng, queue, thành viên, đội hình, thời điểm, Host-reported result | Dữ liệu do CustomAOV ghi nhận từ workflow của nền tảng |
| Externally game-verified | Match ID, kết quả hoặc chỉ số được xác nhận từ nguồn game hợp lệ | Chỉ dùng khi có nguồn, quyền truy cập và quy trình đối chiếu đáng tin cậy |

Hiện tại CustomAOV chưa có bằng chứng rằng hệ thống có:

- anti-smurf prevention hoàn chỉnh;
- xác minh quyền sở hữu tài khoản game;
- tự động lấy lịch sử trận;
- Match ID lookup;
- Garena API được xác nhận và cấp quyền;
- authoritative game-result verification.

Không được gắn nhãn “game-verified” cho kết quả chỉ do Host nhập.

## 5. Kiến trúc hiện tại và kiến trúc mục tiêu

### Business backend hiện tại

Backend nghiệp vụ hiện tại gồm:

- **Supabase Auth** cho identity và session;
- **PostgreSQL** cho profile, Room, Queue và trạng thái đội hình;
- **RPC và RLS** cho authorization, transaction boundary và các thao tác Room nhạy cảm;
- **Supabase Realtime** cho đồng bộ trạng thái Room;
- **Firebase Realtime Database** cho Quick Randomizer Live Share hiện tại.

Các SQL migration và verification script nằm trong [db/migrations](db/migrations) và [db/verification](db/verification). File trong repository không tự chứng minh migration đã được apply trên production.

### Application hiện tại

Frontend hiện tại là Vanilla JavaScript, HTML và CSS, được tổ chức quanh:

- [script.js](script.js) cho application state, Randomizer và reveal UI;
- [randomizer-core.js](randomizer-core.js) cho thuật toán chia đội;
- [roomApi.js](roomApi.js), [room-api-core.js](room-api-core.js), [room-controller.js](room-controller.js) và [room-ui.js](room-ui.js) cho Open Room;
- [supabaseAuth.js](supabaseAuth.js) và [supabaseProfile.js](supabaseProfile.js) cho Auth/Profile.

Frontend static hiện được deploy theo hướng GitHub Pages.

### Kiến trúc frontend mục tiêu

Mục tiêu dài hạn là React + TypeScript + Vite, tái sử dụng và chuyển đổi có kiểm soát các ý tưởng UI từ repository `platform`.

Nguyên tắc tích hợp:

- React frontend kết nối tới Supabase hiện tại thông qua typed service adapters.
- Supabase tiếp tục là authoritative source cho Auth, Room và Queue trong giai đoạn migration.
- Không đưa vào production một hệ thống Auth, database hoặc Room song song chỉ vì frontend mới dùng framework khác.
- Fastify/PostgreSQL/WebSocket backend trong `platform` chưa phải kiến trúc production được phê duyệt cho CustomAOV.

## 6. Chiến lược migration frontend

Migration sẽ theo từng module, không rewrite toàn bộ cùng lúc.

1. Giữ `customAOV` làm business backend và product runtime đang hoạt động.
2. Xây typed adapters cho Auth, Profile, Room snapshot và Realtime.
3. Proof of concept React: login, đọc profile, đọc một Room và nhận cập nhật Realtime.
4. Chuyển các màn ít rủi ro trước: Profile, Dashboard, Search và các màn đọc dữ liệu.
5. Chuyển Tournament khi contract và data model đã được thống nhất.
6. Chuyển Room UI sau khi chứng minh được FIFO, Host permission, Queue và Realtime parity.
7. Chuyển Randomizer/battlefield/reveal cuối cùng vì đây là phần có coupling UI và animation cao nhất.

Frontend hiện tại vẫn được giữ cho đến khi frontend mới đạt feature parity và vượt qua regression verification tương ứng.

## 7. Roadmap

| Giai đoạn | Phạm vi | Trạng thái |
|---|---|---|
| Foundation | Quick Randomizer, balancing, reveal, Live Share | Implemented / Internal Testing |
| Identity | Supabase Auth, Account Profile, Game Profile, UID rules | In Progress |
| Rooms | Open Room, Queue, Host controls, lifecycle, Realtime | In Progress |
| Frontend migration | React shell, typed adapters, Profile/Dashboard/Discovery | Planned |
| Communities | Community, membership, roles, internal activities | Planned |
| Tournaments | Registration, administration, bracket, schedule, results | Planned |
| Records | Platform-recorded match history and statistics | Planned |
| Leaderboards | Rules-based rankings by mode, season and provenance | Planned |
| External verification | Game-data integration, Match ID and verified results | Exploratory |

Roadmap có thể thay đổi theo phản hồi người dùng, nguồn lực, kết quả kiểm chứng kỹ thuật và khả năng tiếp cận dữ liệu hợp lệ.

## 8. Local development và tài liệu

Đây là frontend static không có package manifest riêng trong repository hiện tại. Có thể chạy bằng một static HTTP server từ thư mục `customAOV`; không nên mở trực tiếp bằng `file://` vì module import và request của browser có thể bị chặn.

Tài liệu kỹ thuật liên quan:

- [docs/huy11-huy12-implementation.md](docs/huy11-huy12-implementation.md): kiến trúc và checklist Open Match Room.
- [db/migrations](db/migrations): migration SQL theo từng milestone.
- [db/verification](db/verification): preflight/postflight và các kiểm tra chỉ đọc.
- [tests](tests): unit, integration, UI và live-test harness có cơ chế hạn chế write.
- [thiet-ke-boc-tham-lien-quan-v2.md](thiet-ke-boc-tham-lien-quan-v2.md): thiết kế Randomizer và trải nghiệm chia đội.

Khi kiểm tra live Supabase, chỉ sử dụng môi trường được phê duyệt, đọc kỹ safety guard trong test harness và không tự ý apply migration hoặc chạy write test trên production.

## 9. Giới hạn và dependency hiện tại

- Randomizer balancing hiện dựa trên Tier/Rank score, chưa phải đánh giá trình độ từ match data thực tế.
- Firebase vẫn là dependency của Quick Randomizer Live Share trong khi Room dùng Supabase Realtime.
- Migration SQL cần được review và apply theo đúng thứ tự; repository không tự xác nhận trạng thái database từ xa.
- Live multi-client, PostgreSQL thật, RLS production và Realtime delivery cần được kiểm tra ở môi trường phù hợp.
- Chưa có community backend, tournament backend, leaderboard production hoặc verified match history hoàn chỉnh trong `customAOV`.
- Chưa có Garena API hoặc nguồn dữ liệu game bên ngoài được xác minh là có thể dùng lâu dài.
- Tài khoản, Game UID, Tier/Rank và kết quả Host báo cáo không mặc nhiên là dữ liệu game đã xác minh.
- UI migration không được làm gián đoạn Room/Queue đang hoạt động.

## 10. Tương lai tích hợp và hợp tác

Các hướng hợp tác hoặc tích hợp trong tương lai có thể bao gồm:

- Community Admin, streamer và nhà tổ chức giải.
- Đối tác cung cấp dữ liệu trận đấu hợp pháp và ổn định.
- Spectator hoặc live match service.
- Đối tác tổ chức esports và tournament.
- Các nguồn xác minh identity hoặc game account phù hợp với quyền riêng tư và điều khoản dịch vụ.

Mọi tích hợp bên ngoài phải được đánh giá theo quyền truy cập, tính chính xác, tính ổn định, khả năng truy xuất nguồn gốc, quyền riêng tư và điều khoản sử dụng. Không xem một hướng R&D là capability đã cam kết trước khi có proof of concept và verification rõ ràng.

## 11. Đóng góp và cộng tác

- **GitHub:** source code, pull request và code review.
- **Linear:** backlog, issue và milestone.
- **AI coding agents:** hỗ trợ phân tích, triển khai, kiểm thử và review trong phạm vi task được giao.

Mọi thay đổi lớn về Auth, database, Room lifecycle, Realtime hoặc frontend migration cần được ghi nhận bằng tài liệu và regression verification tương ứng.

---

**Build a better Custom experience — fairer teams, stronger communities, and meaningful match history.**
