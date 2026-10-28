# Cuộc đua giành khách

Game hành động nhiều người: chạy giao hàng, tranh đơn, lướt/xô và cùng mở lối đi khi thành phố đổi luật. Mỗi máy điều khiển một nhân vật, đại diện cho cá nhân hoặc nhóm; cần tối thiểu 3 người để bắt đầu.

Trang chủ `/` và `/arcade` hiển thị cùng sảnh; link mời `/?room=MAPHONG8` giữ mã phòng. MC và người chơi dùng `/arcade/host/...` và `/arcade/play/...`.

## Chạy local

Dùng Node 24 LTS và npm, từ thư mục gốc repo:

```powershell
npm ci
npm run build
npm run arcade:preview
```

Mở `http://127.0.0.1:5189`. Script mở website và realtime ở cổng 5191; Ctrl+C dừng cả hai. Khi sửa mã, dùng `npm run arcade:dev`.

## Hosting Vercel + Cloudflare

[Hướng dẫn triển khai](docs/hosting-vercel-cloudflare.md). Vercel dùng **Root Directory `deploy/vercel`**, framework **Other**, chuyển tiếp HTTP tới website Worker. Cloudflare chạy website/API và một realtime Worker có SQLite Durable Objects. Game không cần D1.

Điền `.env.hosting.local` theo `.env.hosting.example`, chạy `npm run build` và `npm run hosting:prepare`. Cấu hình sinh trong `.hosting/` không vào Git. Secret `HANGRONG_ORIGIN_SECRET` nhập riêng trong Cloudflare và Vercel; WebSocket đi trực tiếp tới realtime Worker.

## Kiểm tra

```powershell
npm run typecheck
npm run test:unit
npm run test:hosting
npm run arcade:assets
```

`test:hosting` tự mở các service ở cổng 5205–5208 với state riêng. Kiểm tra sâu API/browser dùng server local đang chạy và `ACCEPTANCE_BASE_URL=http://127.0.0.1:5189`; xem [cấu hình triển khai](docs/arcade/deployment.md). Các kiểm tra local không thay thế diễn tập trên domain thật.

## Mã nguồn và tài liệu

- `components/arcade`, `game/arcade`: giao diện React, Phaser và client realtime.
- `shared/arcade`, `realtime`: luật chơi, mô phỏng phía server và Durable Objects.
- `app/api/arcade`, `server/arcade`: API proxy và quyền truy cập phòng.
- `public/arcade/assets`, `assets/arcade`: asset runtime và nguồn gốc.
- [Hướng dẫn MC](docs/arcade/classroom-runbook.md), [luật order-flow v2](docs/arcade/order-flow-v2-requirements.md), [kiểm chứng hosting](docs/hosting-verification.md).

Nguồn triển khai: `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`. Repo GitHub: `SuperZiggs/Hangrong`, branch phát hành `main`.
