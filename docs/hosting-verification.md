# Kiểm chứng Cuộc đua giành khách trên Vercel + Cloudflare

Ngày 28/10/2026. Nguồn canonical: `E:\MLN122\.worktrees\cuoc-dua-gianh-khach`. Yêu cầu người dùng đã thay thế sản phẩm quiz bằng game arcade hiện có.

## Phạm vi đã sửa

Trang chủ và `/arcade` dùng cùng Lobby, giữ query mã phòng. Đã gỡ giao diện/API/engine/content/schema/migration và tài liệu riêng của quiz, cùng 22 file test chỉ dành cho quiz. Package đổi thành `cuoc-dua-gianh-khach`; bỏ Drizzle và yêu cầu D1. Hosting từ chối build cũ có identity `quyen-luc-so`.

So với baseline `8637fa5`, các cây `game/arcade`, `shared/arcade`, `realtime`, `assets/arcade`, `public/arcade/assets` không đổi. Lịch sử Git và bằng chứng arcade cũ vẫn có thể phục hồi; không xóa database cloud hoặc state phòng.

## Kết quả local

| Kiểm tra | Kết quả |
|---|---|
| TypeScript | PASS |
| Unit | 160/160 PASS, 20 files |
| Hosting độc lập | 24/24 PASS, 4,4 giây, không skip/retry; gateway và direct mode |
| API arcade gốc A01–A09 + A11 | 10/10 PASS, 15,2 giây; không chạy lại A10 600 giây |
| Chrome E01/E02 | 2/2 PASS, 3,7 giây; responsive + create/join/start/play/pause/replay |
| Build Vinext | PASS, chỉ còn trang arcade và API arcade/catch-all404 |
| ESLint | PASS, 0 lỗi, 7 cảnh báo có sẵn; bỏ qua output sinh tự động `realtime/work` |
| Asset | 47 nhóm, 305 frames, SHA256/atlas/fallback PASS |
| Worker dry-run | Website và realtime PASS; website cuối 2172,74KiB / gzip594,93KiB |
| Review độc lập | Không phát hiện P1/P2 còn lại sau các sửa nhánh lỗi |

Log hosting cuối: `.wrangler/hosting-acceptance/1793184243518-26408`. API/browser results: `test-results/arcade-only-api.json`, `test-results/arcade-only-browser.json`. Các file sinh này được Git bỏ qua.

RED và audit assertions tại [baseline](hosting-red-baseline.md), [matrix](arcade-only-test-matrix.md). Bộ hosting giữ nguyên assertions trong các lượt sửa.

## Lỗi runtime phát hiện trong quá trình xác minh

Ban đầu root redirect hợp lệ nhưng fixture browser không chuyển tiếp các request sau redirect; chọn render trực tiếp cùng Lobby để giữ URL/mã phòng và giảm thêm một bước điều hướng. Không đổi assertion để bỏ qua lỗi.

Chuỗi POST trả lỗi rồi GET tiếp theo làm local workerd chờ khoảng25 giây. Chỉ drain Request ở Worker ngoài cùng chưa đủ: Vinext chuyển quyền sở hữu stream bằng `new Request(...)`/NextRequest. Catch-all API trả JSON404 và đọc bỏ body có giới hạn tại Request của route. Các nhánh từ chối Origin/thiếu service và code/operation không hợp lệ cũng dọn body tại owner thực, giữ status/auth/no-store. Giới hạn8KiB/1giây giữ nguyên; không tăng timeout, không mở quyền truy cập. Hai ca N02 cuối đạt111ms/81ms.

## Triển khai production

Cấu hình đã chuẩn bị cho `https://hangrong1.vercel.app`, website `hangrong`, realtime `hangrong-realtime` trên subdomain `dinhloc-truong2005`. Giữ migration Durable Objects v1 và secret hiện có; không đọc giá trị secret.

Đã deploy website và realtime từ worktree canonical. Lần đầu POST tạo phòng trả404 kèm Cloudflare1042; realtime health200. Thêm `global_fetch_strictly_public` vào cấu hình website để hỗ trợ URL fetch giữa hai Worker cùng tài khoản theo [Cloudflare Fetch docs](https://developers.cloudflare.com/workers/runtime-apis/fetch/). Giữ các flag cũ, chỉ thêm một lần, realtime không đổi. N09 RED2FAIL/15PASS trước sửa; sau sửa toàn bộ160unit PASS và dry-run website PASS.

- Website version: `8b0ce1ce-9c86-48d2-b879-7ac8dba19c93`.
- Realtime version: `3531da0f-7e59-4339-ba82-55658b165863`.
- Domain: [hangrong1.vercel.app](https://hangrong1.vercel.app).
- Smoke19:06 ngày28/10/2026 (UTC+7): PASS. Tạo phòng bằng Chrome UI, ba người tham gia, MC bắt đầu, canvas Phaser ready, auth WSS, pause/resume, reconnect giữ playerId. Phòng kiểm tra riêng đã để paused.
- QR hiển thị và link sao chép đúng domain Vercel; kiểm tra mobile không tràn ngang; không có pageerror.
- Root200 với metadata arcade; GET/POST API quiz và các trang host/play cũ404.
- [Bằng chứng JSON không chứa capability](arcade/evidence/arcade-only-live-20261028.json). Ảnh và script smoke ở `work/arcade-only-live-*` trong canonical, không đưa token vào tài liệu/Git.

Giới hạn: production smoke dùng ba người và pha chạy thử; không khẳng định đã chạy lại600giây hoặc chịu tải cả lớp. Không giải mã pixel QR. Giữ các báo cáo arcade lịch sử với ghi chú supersession; chúng không chứng nhận sản phẩm quiz hiện tại.

## Đồng bộ và dọn local

Đã fast-forward cả `E:\MLN122\web-game` và `E:\MLN122\Hangrong-deploy` từ bản cũ tới source arcade đã phát hành. File `.env.hosting.local` trong clone deploy giữ nguyên SHA256; `hosting:prepare` của clone chạy thành công với generator mới. Mỗi bản `dist` được thay từ build canonical:177file khớp SHA256 từng file. Preview5189/5191 đã mở lại bằng nguồn mới; root local200/titlearcade, realtime health200. Dữ liệu phòng local giữ nguyên.

Đã xóa hai bản build sinh tự động `.codex-build/hosting-baseline-20261028`, `hosting-green-20261028` và hai backup `web-game/work/pre-arcade-dist`, `pre-order-flow-v2-dist-20261028` còn chứa ứng dụng cũ. Junction dependency được tháo trước khi xóa; thư viện chung vẫn còn. Không xóa coursework, raw arcade assets, Git history hoặc state/database. Các server test riêng5210/5211 đã dừng; preview người dùng5189/5191 được giữ hoạt động.
