# Hướng dẫn kết nối Linear với Codex CLI

**Mục đích:** Kết nối Codex với Linear để AI có thể đọc task, tạo task và cập nhật tiến độ trực tiếp từ terminal.

### Bước 1 — Chuẩn bị

Cần có:
- Tài khoản Linear và được mời vào workspace của nhóm.
- Node.js và Codex CLI đã cài trên máy.
- Cursor hoặc VS Code để mở terminal.

Nếu chưa cài Codex CLI, chạy:

```powershell
npm install -g @openai/codex
```

### Bước 2 — Kết nối Linear MCP

Mở terminal và chạy:

```powershell
codex mcp add linear --url https://mcp.linear.app/mcp
```

Sau đó đăng nhập:

```powershell
codex mcp login linear
```

Trình duyệt sẽ mở ra → đăng nhập Linear → cấp quyền kết nối.

### Bước 3 — Kiểm tra kết nối

Chạy:

```powershell
codex mcp list
```

Nếu thấy `linear` có trạng thái `enabled` và `Auth: OAuth` thì MCP đã được cấu hình.

### Bước 4 — Kiểm tra bằng Codex

Mở Codex CLI:

```powershell
codex
```

Nhập prompt:

> Kiểm tra kết nối Linear MCP. Liệt kê các project và task mà tôi có quyền truy cập. Chỉ đọc dữ liệu, không tạo hoặc cập nhật gì.

Nếu Codex đọc được project và task thật thì kết nối thành công.

### Bước 5 — Sử dụng

Sau khi kết nối, có thể yêu cầu Codex:

- Đọc và phân tích yêu cầu của một task trên Linear.
- Đề xuất cách triển khai dựa trên source code hiện tại.
- Tạo hoặc cập nhật task khi được yêu cầu.
- Hỗ trợ code, chạy test và tổng hợp kết quả để cập nhật tiến độ.

**Lưu ý:** Nên yêu cầu Codex xin xác nhận trước khi tạo, sửa, đóng hoặc xóa task.

---

**Workspace CustomAOV:** https://linear.app/dogsaymeowhh

*Thành viên cần được mời vào workspace trước khi có thể truy cập các project và task của nhóm.*