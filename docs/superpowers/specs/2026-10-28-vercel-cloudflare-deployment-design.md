# Đề xuất triển khai Vercel + Cloudflare

Ngày: 28/10/2026. Trạng thái: đã chỉnh và kiểm chứng mã nguồn/cấu hình theo yêu cầu người dùng ngày 28/10/2026; chưa tạo tài nguyên cloud. Xem [kết quả kiểm chứng](../../hosting-verification.md).

## Mục tiêu và phạm vi

Đưa toàn bộ game câu hỏi và game arcade hiện tại lên mạng, với một địa chỉ Vercel dùng cho MC và người chơi. Dùng Vercel Hobby và Cloudflare Workers Free trong hạn mức, không bật gói trả phí. Tên dự án đề xuất của người thực hiện là `quyen-luc-so`; địa chỉ cuối cùng phụ thuộc tên còn trống và tài khoản được dùng.

Người dùng đã chọn nền tảng Vercel + Cloudflare và yêu cầu chỉnh mã sau khi nhận đề xuất Vercel làm proxy. Phạm vi triển khai hiện tại là source/config host-ready; phát hành cloud và kiểm chứng domain thật cần quyền truy cập tài khoản tương ứng.

## Các phương án

1. **Vercel làm proxy, Cloudflare chạy ứng dụng hiện có — đề xuất.** Vercel chuyển tiếp HTTP tới website Worker; trình duyệt kết nối WSS trực tiếp tới realtime Worker. Giữ Vinext, D1 và Durable Objects; cần cấu hình nguồn truy cập hợp lệ và kiểm tra IP dùng cho rate limit khi đi qua proxy.
2. **Chuyển frontend sang Vercel, giữ backend trên Cloudflare.** Cần tách build/frontend khỏi các API và import `cloudflare:workers`, rồi thiết lập kết nối giữa hai bên. Công việc nhiều hơn mà mục tiêu hiện tại chủ yếu là địa chỉ truy cập Vercel.

Đây là thay đổi triển khai của ứng dụng sẵn có. Không thay luật chơi, giao diện hay chuyển cơ sở dữ liệu sang nhà cung cấp khác.

## Thiết kế đề xuất

- Vercel có một project proxy riêng, không tự nhận repo Vinext này là một ứng dụng Next.js để build. Chuyển tiếp đường dẫn, query, phương thức và nội dung yêu cầu tới website Worker; URL trên trình duyệt vẫn là Vercel.
- Cloudflare có website Worker `quyen-luc-so`, D1 binding `DB`, cùng realtime Worker `cuoc-dua-gianh-khach-realtime` và namespace SQLite Durable Objects `ARCADE_ROOMS`.
- Giữ `.openai/hosting.json` và đường chạy local. Cấu hình tài khoản Cloudflare tự quản phải thay ID database mẫu bằng D1 thật; không sửa dữ liệu local để mô phỏng production.
- Website Worker nhận `ARCADE_SERVICE_URL` qua cấu hình runtime. Realtime nhận `ARCADE_PUBLIC_WS_URL` dùng WSS và `ARCADE_ALLOWED_ORIGINS` chứa chính xác domain Vercel được cấp phép; không cho phép wildcard toàn bộ `vercel.app`.
- Hai điểm kiểm tra Origin của quiz và arcade cần hiểu đúng domain công khai đã cấu hình. Vẫn từ chối domain lạ; không xóa guard và không tin trực tiếp `X-Forwarded-Host` từ request.
- IP để giới hạn yêu cầu phải được kiểm tra khi có proxy. Chỉ dùng IP do Vercel chuyển tiếp sau khi xác minh yêu cầu từ gateway của mình bằng cơ chế có bí mật máy chủ; request Cloudflare trực tiếp dùng `CF-Connecting-IP`. Kiểm chứng header thực tế trước khi chốt cách triển khai; không gom cả lớp vào IP proxy và không tin IP do client tự khai.
- API trạng thái, bootstrap, token và xuất kết quả không được cache dùng chung. Giữ `Cache-Control: no-store` và kiểm chứng qua Vercel. QR và link tham gia phải dùng domain Vercel.
- Không đưa token Cloudflare, token Vercel hoặc bí mật gateway vào Git, bundle trình duyệt hay log. Chọn production domain ổn định; preview domain chỉ được dùng sau khi cấp phép đúng origin.

## Bằng chứng đã kiểm tra

- `scripts/run-framework.mjs`, `vite.config.ts` và `dist/server/wrangler.json`: build hiện tại sinh Worker Vinext; D1 trong bản build đang có ID mẫu.
- `server/room-store.ts` dùng trực tiếp D1 qua `cloudflare:workers`; `server/arcade/proxy.ts` chuyển tiếp HTTP sang realtime.
- `server/http.ts` và `server/arcade/proxy.ts` hiện so Origin với URL của request; cần kiểm tra thêm khi gateway và origin khác domain.
- `server/rate-limit.ts` dựa vào `CF-Connecting-IP`, vì vậy proxy là thay đổi có ảnh hưởng cần kiểm chứng.
- `realtime/wrangler.jsonc` đã khai báo lớp SQLite `ArcadeRoom` và migration `v1`; giữ nguyên migration và dữ liệu đã có.
- QR hiện lấy `window.location.origin`/`location.origin`, phù hợp với địa chỉ Vercel nếu proxy giữ nguyên URL trên trình duyệt.
- Wrangler `whoami`: chưa đăng nhập Cloudflare. Không có credential Cloudflare/Vercel trong các biến môi trường đã kiểm tra; chưa xác minh trạng thái tài khoản trên trình duyệt. Repo hiện không có Git remote. Chưa có Vercel CLI/project link trong checkout.

## Điều kiện nghiệm thu và quay lui

Build và typecheck phải qua; kiểm tra HTTP qua proxy phải bao gồm Origin hợp lệ/không hợp lệ, rate limit không bị thay đổi sai và phản hồi riêng tư không cache. Trên địa chỉ thật phải tạo/join được cả quiz và arcade, QR trỏ đúng URL, host điều khiển được, WSS kết nối/reconnect được và chạy thử đúng số người dự kiến. Mục tiêu diễn tập ban đầu dùng 26 kết nối như bộ load hiện có; đây chưa phải kết quả tải production.

Phải xác minh tài khoản và domain thật trước khi tạo tài nguyên. Không chọn trial/paid để vượt hạn mức. Nếu giới hạn Free không đủ, báo bằng đo đạc thực tế trước khi đổi gói.

Khi quay lui, khôi phục phiên bản Worker và cấu hình Vercel trước đó; không xóa database/namespace hay đặt lại migration. Với lần triển khai đầu chưa có phiên bản cũ, có thể ngừng proxy công khai và giữ dữ liệu cloud cho việc sửa cấu hình. Website và realtime phải dùng phiên bản tương thích, gồm luật arcade v2 đang có.

## Tài liệu nền tảng

- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites#rewrites-to-external-origins)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

## Bước tiếp theo sau khi duyệt

Lập kế hoạch thực hiện ngắn, chuẩn bị cấu hình và các kiểm tra theo rủi ro ở trên, rồi xác thực tài khoản để triển khai. Người dùng cần hoàn tất đăng nhập bằng giao diện của nhà cung cấp khi được yêu cầu; không gửi mật khẩu hoặc API token trong chat. Việc phát hành chỉ được coi là hoàn tất khi đã có URL thật và kết quả kiểm tra trên URL đó.
