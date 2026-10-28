# Triển khai riêng Cuộc đua giành khách

Người dùng yêu cầu ngày28/10/2026 xóa game quiz cũ và dùng nguồn tại `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`. Đây là nguồn canonical cho thay đổi này. Nhánh worktree đã nhận các cấu hình hosting hiện có bằng fast-forward từ789370d tới8637fa5; cây engine, realtime và asset arcade không khác nhau giữa hai commit.

## Kết quả cần đạt

- Domain production `https://hangrong1.vercel.app/` mở đúng Cuộc đua giành khách. Giữ đường dẫn `/arcade`, `/arcade/host/:code`, `/arcade/play/:code` và API/WebSocket arcade để lời mời, điều khiển và trạng thái vẫn hoạt động.
- Gỡ UI/routes, API, content, engine, DTO, dữ liệu schema/migration, tests và tài liệu chỉ phục vụ quiz cũ. Các trang `/host/:code`, `/play/:code` và API quiz không còn hoạt động.
- Root metadata và favicon dùng nhận diện arcade. Lobby không có link quay về quiz. Giữ giao diện, engine, luật v2 và asset arcade của worktree.
- Website Worker không bind D1; cấu hình triển khai không cần database UUID hay chạy migration D1. Realtime vẫn giữ SQLite Durable Objects `ARCADE_ROOMS` và migration `v1`.
- Giữ Vercel proxy, `HANGRONG_ORIGIN_SECRET`, Origin chính xác, token/capability, giới hạn input và không cache dữ liệu riêng.
- Công cụ chuẩn bị hosting phải từ chối bản build mang identity quiz cũ, tránh deploy nhầm artifact.

## Phạm vi thực hiện

Chỉ dọn repository game và đồng bộ bản đúng sang `E:\MLN122\web-game`, `E:\MLN122\Hangrong-deploy`, GitHub `SuperZiggs/Hangrong` và các Worker tương ứng. Các tài liệu môn học ngoài repository game không thuộc yêu cầu dọn source. Không xóa database cloud, namespace hay dữ liệu arcade; không viết lại Git history.

Địa chỉ, phiên Cloudflare OAuth và tên secret đã được xác minh; không đọc hoặc in giá trị secret. Dùng thông tin địa chỉ công khai trong file cấu hình deployment clone; file này không bị ghi đè khi đồng bộ Git.

## Lựa chọn triển khai

Root hiển thị trực tiếp cùng Lobby của `/arcade`, có giữ query room của lời mời qua client hiện có. Cách này không cần thêm redirect; giữ các đường dẫn host/play và namespace phòng. Không thay engine hoặc đường dẫn API.

## Nghiệm thu

Independent RED/GREEN cho root, metadata, quiz404, no-D1, stale-build guard, gateway và flow arcade; giữ các assertions arcade hiện có. Build/typecheck/unit, asset hashes, dry-run Worker và browser/API cần qua. Sau deploy, kiểm tra root trên Vercel, tạo/join phòng, auth, WebSocket và pause/reconnect bằng ván kiểm thử riêng. Không bắt đầu hoặc sửa phòng của người chơi thật.
