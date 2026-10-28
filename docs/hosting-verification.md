# Kiểm chứng cấu hình Vercel + Cloudflare

Ngày 28/10/2026. Đây là kết quả source và runtime local; chưa tạo tài nguyên hoặc phát hành trên tài khoản Vercel/Cloudflare thật.

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run test:unit` | 177/177 PASS, 24 files |
| Acceptance hosting độc lập | 22/22 PASS, không skip/flaky, 5,1 giây |
| Build production Vinext | PASS |
| ESLint các file code/test mới và Worker entry | PASS |
| `npm run arcade:assets` | 47 nhóm, 305 frames; checksum/atlas/fallback PASS |
| Vercel config so với schema công khai của nhà cung cấp | Hợp lệ |
| `hosting:prepare` với account fixture | PASS, không ghi secret |
| Website/realtime `wrangler deploy --dry-run` | Cả hai PASS, không ghi remote |
| D1 migration từ cấu hình đã sinh, database kiểm thử riêng | Lần đầu áp thành công; lần hai không có migration mới |
| Review độc lập toàn bộ thay đổi và fix cuối | Không còn lỗi P1/P2 được phát hiện |

Acceptance kiểm tra thật HTTP proxy → website Worker → D1/realtime Durable Objects, cùng WebSocket trực tiếp và browser Chrome. Các trường hợp gồm tạo/tham gia/điều khiển phòng, phân quyền, Origin chính xác, secret giả, IP riêng từng người chơi, phản hồi không cache, QR hiển thị và link giữ public origin. Chi tiết RED/GREEN và tính nguyên vẹn assertions trong [baseline](hosting-red-baseline.md), [matrix](hosting-acceptance-matrix.md).

Preview người dùng trên5189 đang giữ `dist` trên Windows, nên build trong bản sao nguồn `E:\MLN122\.codex-build\hosting-green-20261028`. Hash SHA-256 của gateway, entry, arcade proxy, config generator, Vite config và realtime source/config đều khớp checkout chính khi chốt kết quả. Các kiểm thử dùng D1/registry/cổng riêng và đã đóng tiến trình của chúng; không tắt preview người dùng.

Lần kiểm chứng giữa chừng phát hiện error-response503 do đường trả lỗi sớm/transport trong workerd. Bản cuối đọc bỏ body bị từ chối trong giới hạn8KiB/1giây; có bốn unit tests cho body nhỏ, liên tục, treo và lỗi transport. Registry kiểm thử cũng được tách riêng; assertions độc lập không được nới để đạt PASS. Không suy diễn A/B vượt bằng chứng đã ghi ở baseline.

Giới hạn: chưa đo tải trên hosting thật, chưa xác minh domain/DNS/TLS/header Vercel thực tế hoặc hạn mức tài khoản. QR được kiểm tra ảnh hiển thị và link sao chép, chưa giải mã pixel ảnh. Không chạy lại toàn bộ game acceptance600giây trong thay đổi hosting này. Build vẫn có cảnh báo chunk lớn của ứng dụng hiện có và deprecation `punycode`; chúng không làm build thất bại.

Sau khi deploy, thực hiện phần kiểm chứng domain thật trong [hướng dẫn](hosting-vercel-cloudflare.md#4-kiểm-chứng-trước-buổi-chơi) trước buổi học.
