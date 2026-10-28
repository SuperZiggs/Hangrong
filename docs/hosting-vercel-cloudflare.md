# Triển khai Cuộc đua giành khách bằng Vercel + Cloudflare

Website/API chạy trên Cloudflare Workers; trạng thái phòng chạy trên realtime Worker với SQLite Durable Objects. Vercel chuyển tiếp HTTP để người chơi dùng địa chỉ `.vercel.app`; WebSocket kết nối trực tiếp realtime Worker qua WSS. Game này không cần D1.

## 1. Chuẩn bị

Dùng Node 24 LTS và npm. Từ thư mục gốc repo:

```powershell
npm ci
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js login
Copy-Item -LiteralPath .env.hosting.example -Destination .env.hosting.local
```

Nếu file local đã có, sửa file đó, không ghi đè bằng file ví dụ. Điền:

| Biến | Giá trị |
|---|---|
| `PUBLIC_SITE_ORIGIN` | Origin HTTPS chính xác của Vercel, ví dụ `https://hangrong1.vercel.app` |
| `CLOUDFLARE_WORKERS_SUBDOMAIN` | Workers subdomain, ví dụ `dinhloc-truong2005` |
| `CLOUDFLARE_WEBSITE_NAME` | Tên website Worker, mặc định `hangrong` |
| `CLOUDFLARE_REALTIME_NAME` | Tên realtime Worker, mặc định `hangrong-realtime` |

File local và thư mục `.hosting/` được Git bỏ qua. Secret nhập riêng trong cài đặt hai nền tảng.

## 2. Build và deploy Cloudflare

```powershell
npm run build
npm run hosting:prepare
npm run hosting:deploy:realtime
npm run hosting:deploy:website
```

`hosting:prepare` chỉ sinh cấu hình local từ build mới. Script từ chối build cũ có tên `quyen-luc-so`, loại binding D1 kế thừa, giữ migration Durable Objects `v1` và tạo đúng URL HTTPS/WSS. Cấu hình website có `global_fetch_strictly_public` để gọi realtime Worker cùng tài khoản bằng URL; thiếu cờ này có thể gặp1042 dù local vẫn chạy. Website và realtime cần cùng phiên bản luật. Giữ tên realtime Worker khi cập nhật để giữ namespace/phòng hiện có.

Nếu chưa có secret: tạo chuỗi ngẫu nhiên dài ít nhất 32 ký tự bằng trình quản lý mật khẩu, lưu riêng rồi nhập vào website Worker:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js secret put HANGRONG_ORIGIN_SECRET --config .hosting/website.wrangler.json
```

Đã có secret đúng thì giữ nguyên giá trị. Không cần tạo lại sau mỗi lần deploy. Nhập cùng giá trị vào Vercel.

## 3. Cấu hình Vercel

Import repo `SuperZiggs/Hangrong`, production branch `main`:

- **Root Directory:** `deploy/vercel`.
- **Framework Preset:** Other.
- **Output Directory:** `public` theo `vercel.json`.
- **Environment Variables / Production:** `CLOUDFLARE_ORIGIN` là HTTPS origin website Worker; `HANGRONG_ORIGIN_SECRET` là cùng secret ở Cloudflare.

Ví dụ origin website: `https://hangrong.dinhloc-truong2005.workers.dev`, không thêm đường dẫn. Deploy/redeploy Vercel sau khi sửa biến. Nếu đổi domain công khai, cập nhật `PUBLIC_SITE_ORIGIN`, prepare rồi deploy lại hai Worker. Không trỏ origin proxy về chính Vercel.

Vercel thay header `x-origin-secret` bằng secret phía máy chủ. Cloudflare xác minh secret trước khi dùng domain và IP khách do proxy chuyển tiếp; secret không xuất hiện trong frontend. Realtime chỉ nhận đúng origin đã cấu hình. Preview khác domain cần cấu hình staging riêng.

## 4. Kiểm tra trước khi chia sẻ

```powershell
npm run typecheck
npm run test:unit
npm run test:hosting
npm run arcade:assets
```

Bộ hosting dùng state riêng ở `.wrangler/hosting-acceptance`, không cần D1, mở các cổng 5205–5208. Đóng server kiểm thử trước khi build lại nếu Windows đang khóa file trong `dist`.

Mở domain Vercel: `/` phải vào sảnh “Cuộc đua giành khách”. Tạo phòng riêng, kiểm QR đúng domain, cho ít nhất 3 người vào, bắt đầu/tạm dừng/tiếp tục và kiểm reconnect. WebSocket phải dùng `wss://...workers.dev`. Xem [báo cáo kiểm chứng](hosting-verification.md) để phân biệt kết quả local và production.

Lỗi403: kiểm tra origin chính xác và cùng secret ở hai nền tảng. Lỗi gateway IP: kiểm tra `x-real-ip` do Vercel cung cấp. Giữ kiểm tra Origin, capability và `Cache-Control: no-store` khi xử lý lỗi.

Khi quay lui, chọn cặp phiên bản website/realtime tương thích. Giữ namespace/phòng và migration `v1`. Dữ liệu cloud cũ không bị xóa khi bỏ binding không dùng.

## Tài liệu nhà cung cấp

- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites#restricting-your-origin-to-vercel-traffic)
- [Vercel route environment variables](https://vercel.com/docs/project-configuration/vercel-json#using-environment-variables-in-routes)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
