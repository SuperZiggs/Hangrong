# Hosting Hàng rong bằng Vercel + Cloudflare

Website và API chạy trên Cloudflare Workers; database quiz dùng D1, realtime arcade dùng một Worker có SQLite Durable Objects. Vercel chuyển tiếp HTTP để người chơi dùng một địa chỉ `.vercel.app`. WebSocket kết nối trực tiếp tới realtime Worker qua WSS. Repo không cần tách giao diện hay đổi luật chơi.

## 1. Chuẩn bị Cloudflare

Dùng Node >=22.13, npm và tài khoản Cloudflare. Từ thư mục gốc của repo:

```powershell
npm ci
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js login
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 create hangrong
```

Ghi lại `database_id` trả về. Trong Cloudflare Workers & Pages, chọn/tạo Workers subdomain của tài khoản. Ví dụ tài khoản có subdomain `my-account`, hai Worker mặc định sẽ có địa chỉ `https://hangrong.my-account.workers.dev` và `https://hangrong-realtime.my-account.workers.dev`.

Tạo project Vercel như mục 3 để biết chính xác domain được cấp. Ví dụ bên dưới dùng `https://hangrong.vercel.app`; phải thay nếu tên đó không thuộc project của bạn. Chọn gói Free/Hobby trong hạn mức, không cần mua tên miền riêng.

## 2. Chuẩn bị cấu hình và deploy hai Worker

```powershell
Copy-Item -LiteralPath .env.hosting.example -Destination .env.hosting.local
```

Sửa `.env.hosting.local`:

| Biến | Giá trị |
|---|---|
|`PUBLIC_SITE_ORIGIN`|Origin HTTPS chính xác của Vercel, không có đường dẫn hoặc query|
|`CLOUDFLARE_WORKERS_SUBDOMAIN`|Workers subdomain của tài khoản, ví dụ `my-account`|
|`CLOUDFLARE_D1_DATABASE_ID`|UUID thật từ lệnh tạo D1|
|`CLOUDFLARE_D1_DATABASE_NAME`|Tên database, mặc định `hangrong`|
|`CLOUDFLARE_WEBSITE_NAME`|Tên website Worker, mặc định `hangrong`|
|`CLOUDFLARE_REALTIME_NAME`|Tên realtime Worker, mặc định `hangrong-realtime`|

Không thêm secret vào file ví dụ. `.env.hosting.local` và cấu hình sinh trong `.hosting/` được Git bỏ qua.

```powershell
npm run build
npm run hosting:prepare
npm run hosting:db:migrate
npm run hosting:deploy:realtime
npm run hosting:deploy:website
```

`hosting:prepare` chỉ ghi cấu hình local, không tạo tài nguyên cloud. Nó dùng cấu hình build thật, thay D1 mẫu bằng ID của bạn, giữ migration Durable Objects `v1`, và sinh URL HTTPS/WSS theo tên Worker. Chỉ áp migration D1 bằng lệnh đã ghi nhận; không xóa database để cập nhật game.

Tạo một chuỗi ngẫu nhiên mạnh dài ít nhất 32 ký tự bằng trình quản lý mật khẩu; lưu riêng để nhập cùng một giá trị trên hai nền tảng. Nhập dưới dạng secret của website Worker:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js secret put VERCEL_ORIGIN_SECRET --config .hosting/website.wrangler.json
```

Chưa nhập secret thì website ở chế độ gateway sẽ trả lỗi cấu hình; đây không phải chế độ hoạt động để chia sẻ cho người chơi.

## 3. Kết nối repo với Vercel

Import repo `SuperZiggs/Hangrong`, chọn branch `main`:

- **Root Directory:** `deploy/vercel`.
- **Framework Preset:** Other. Project proxy có sẵn `framework: null`, không cài dependencies và không build ứng dụng Next.js.
- **Output Directory:** `public` theo `vercel.json`.
- **Environment Variables / Production:**
  - `CLOUDFLARE_ORIGIN`: HTTPS origin website Worker, ví dụ `https://hangrong.my-account.workers.dev`, không thêm dấu `/` cuối.
  - `VERCEL_ORIGIN_SECRET`: cùng giá trị bí mật đã nhập vào website Worker.

Deploy/redeploy Vercel sau khi đặt biến. Nếu domain được cấp khác `.env.hosting.local`, sửa `PUBLIC_SITE_ORIGIN`, chạy `hosting:prepare` và deploy lại cả hai Worker. Không trỏ `CLOUDFLARE_ORIGIN` về Vercel vì sẽ tạo vòng lặp proxy.

Vercel thay thế header `x-origin-secret` bằng secret trong môi trường máy chủ. Cloudflare chỉ sử dụng domain công khai và IP khách do proxy chuyển tiếp sau khi xác minh secret; domain lạ, secret sai hoặc IP thiếu/sai bị từ chối. Trình duyệt chỉ cần URL Vercel; không được đưa secret vào mã frontend.

Các yêu cầu qua gateway có header không cache; API trong ứng dụng vẫn giữ `Cache-Control: no-store`. QR và link tham gia lấy domain đang mở trong trình duyệt. Realtime chỉ cho phép đúng origin đã cấu hình. Preview deployment có domain khác không được tự động cấp quyền; dùng project/domain staging riêng nếu cần kiểm tra staging.

## 4. Kiểm chứng trước buổi chơi

Các kiểm tra source/local:

```powershell
npm run typecheck
npm run test:unit
npm run test:hosting
npm run arcade:assets
```

Bộ hosting dùng state D1 riêng và các cổng 5205–5208; không dùng dữ liệu buổi học. Trên Windows, đóng **server kiểm thử của bạn** trước khi build lại. Nếu preview khác đang giữ thư mục `dist`, build ở một bản sao nguồn riêng để giữ buổi chơi đang chạy. Kết quả kiểm chứng của thay đổi này được ghi trong [báo cáo](hosting-verification.md).

Trên domain Vercel thật, kiểm tra cả `/` và `/arcade`: tạo phòng, QR/link đúng domain Vercel, tham gia với ít nhất 3 người, bắt đầu/tạm dừng/tiếp tục, tải lại và reconnect, xem/xuất kết quả. Kiểm tra WebSocket dùng `wss://...workers.dev` và chạy thử với số người dự kiến; bộ load sẵn có mặc định đã được dùng cho 26 kết nối local, không phải bảo đảm tải production. Theo dõi hạn mức và lỗi của cả hai nhà cung cấp.

Nếu tạo/join trả403, đối chiếu chính xác `PUBLIC_SITE_ORIGIN`, domain đang mở và cùng secret ở Vercel/Cloudflare; không bỏ kiểm tra Origin để chữa lỗi. Nếu báo IP gateway không hợp lệ, kiểm tra header `x-real-ip` do Vercel chuyển tiếp tới origin; không thay bằng IP client tự khai. Không cache token/bootstrap hoặc phản hồi phòng để chữa lỗi tải.

Nếu phải quay lui, khôi phục phiên bản Worker và deployment Vercel tương thích. Không xóa D1/namespace hay sửa migration `v1`. Bản cập nhật website và realtime phải cùng phiên bản luật arcade.

## Tài liệu nhà cung cấp

- [Vercel external rewrites và xác thực origin](https://vercel.com/docs/routing/rewrites#restricting-your-origin-to-vercel-traffic)
- [Biến môi trường trong routes/transforms](https://vercel.com/docs/project-configuration/vercel-json#using-environment-variables-in-routes)
- [Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/)
- [Durable Objects Free limits](https://developers.cloudflare.com/durable-objects/platform/pricing/)
