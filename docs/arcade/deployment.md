# Cấu hình và giới hạn triển khai

Triển khai bằng tài khoản riêng: xem [Vercel + Cloudflare](../hosting-vercel-cloudflare.md). Website/API qua proxy Vercel đã xác thực; WebSocket kết nối trực tiếp realtime Worker. Dùng `.env.hosting.example` và `npm run hosting:prepare` để sinh cấu hình riêng, giữ các địa chỉ local bên dưới cho phát triển.

Hai phần tách biệt: website React/Vinext tại `/arcade`, service realtime Cloudflare Durable Objects trong `realtime/`. Dữ liệu, API và D1 của game câu hỏi giữ nguyên.

## Cập nhật luật hàng ngày28/10/2026

Bản v2 bổ sung hồi hàng theo điểm45 giây, kho riêng2 kiện và mang2 kiện riêng, cùng3 khách trung tâm nhận85% đích giao mới từ phút3. Cần cập nhật đồng thời website và realtime. Phòng lưu theo cấu trúc cũ vẫn giữ roster/xu/đơn; ván cũ đang chơi hoặc tạm dừng chuyển sang gián đoạn với thông báo cập nhật luật, MC chọn Chơi lại để khởi tạo v2. Không xóa D1 hoặc thư mục dữ liệu để cập nhật. Phòng cũ đã có kết quả tiếp tục đọc được.

## Local đã sử dụng

Node24 LTS, npm và Chrome. Từ thư mục repo:

```powershell
npm ci
npm run build
npm run arcade:preview
```

Website: `http://127.0.0.1:5189/arcade`. Realtime: `http://127.0.0.1:5191/health`. Dừng bằng Ctrl+C. `arcade:preview` mở bản production đã build cùng realtime. Khi sửa mã, dùng `npm run arcade:dev`; cũng có thể chạy riêng website và `npm run arcade:realtime` trong hai terminal.

Các script hỗ trợ:

```powershell
npm run typecheck
npm run test:unit
$env:ACCEPTANCE_BASE_URL='http://127.0.0.1:5189'
npm run test:api
npm run test:e2e
npm run arcade:load -- --clients 26 --seconds 120 --rendered 3 --out test-results/load/report.json
npm run arcade:assets
```

Ca A10 trong `arcade-independent.spec.ts` chạy600 giây thật, mặc định không rút ngắn thời gian. Bộ quiz cũ cần migration D1 local theo README trước khi chạy hồi quy.

## Service có địa chỉ dùng chung

Phiên này kiểm tra Wrangler và nhận kết quả **chưa đăng nhập Cloudflare**. Chưa phát hành service, chưa có URL staging/WSS được xác minh. Một website đã có hosting không tự tạo ra namespace Durable Objects cho service mới.

Khi dùng tài khoản Cloudflare được giao, deploy cấu hình `realtime/wrangler.jsonc` bằng Wrangler. Giữ migration `v1` cho lớp `ArcadeRoom`, namespace riêng `ARCADE_ROOMS`.

| Biến | Nơi dùng | Giá trị |
|---|---|---|
|`ARCADE_SERVICE_URL`|Worker của website|HTTPS base URL của service realtime đã deploy|
|`ARCADE_PUBLIC_WS_URL`|Service realtime|WSS base URL trình duyệt truy cập được|
|`ARCADE_ALLOWED_ORIGINS`|Service realtime|Danh sách origin website chính xác, phân tách dấu phẩy|

Không dùng localhost trong bootstrap cho laptop khác. Website HTTPS cần WSS. Trước buổi học phải thử tạo/join, thao tác, pause/reconnect và đủ thời lượng trên địa chỉ thật. Không đưa credential vào Git.

Chạy LAN HTTP cũng cần bind hai server ra địa chỉ LAN, đặt WS public URL thành IP máy chủ và allowlist đúng origin LAN. Đường LAN này chưa được kiểm chứng trong phiên bàn giao; không dùng lệnh local nguyên trạng rồi coi các máy khác truy cập được.

## Khôi phục và vòng đời

Phòng hết hạn sau24 giờ. Sảnh/pause/kết quả lưu state; trận đang chạy gặp khởi động lại bất ngờ chuyển interrupted thay vì dựng lại thành tích từ dữ liệu cũ. Bộ đếm20Hz chạy trong một room actor. Alarm20 giây giữ sự kiện nền khi phòng chưa có input; alarm ngừng tự lập lịch khi không còn ván active. Chỉ timer trong bộ nhớ không đủ bảo đảm không bị thu hồi sau thời gian không có sự kiện đến: [Cloudflare lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

Snapshot đầy đủ định kỳ cùng patch trung gian giữ server là nơi quyết định vị trí/xu/đơn. Client chỉ dự đoán chuyển động ngắn để hiển thị, không tự xác nhận điểm.

Sequence tăng theo người chơi trong mỗi ván, không chỉ theo socket. Tab/máy phục hồi đọc ack trong bootstrap trước khi gửi lệnh mới. Traffic hợp lệ giữ thân connected; không nhận traffic khoảng3 giây thì thân hết chắn dù TCP chưa đóng. Khi resume sau runtime khởi động lại, server đối chiếu socket thực thay vì tin mãi cờ connected đã lưu.
