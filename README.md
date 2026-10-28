# Quyền lực số

## Hosting Vercel + Cloudflare

[Hướng dẫn triển khai đầy đủ](docs/hosting-vercel-cloudflare.md). Trên Vercel, chọn **Root Directory `deploy/vercel`** và framework **Other**; website/API vẫn chạy bằng Cloudflare Workers, D1 và Durable Objects. Chạy `npm run hosting:prepare` sau khi điền `.env.hosting.local` theo file ví dụ để sinh cấu hình Cloudflare riêng; secret chỉ nhập trong cài đặt hai nền tảng.

Đường vào Worker xác minh proxy trước khi sử dụng domain Vercel và IP khách. QR giữ domain Vercel; WebSocket đi trực tiếp realtime Worker. `npm run test:hosting` chạy kiểm chứng local với dữ liệu riêng, không phát hành cloud.

## Game và cách chạy local

Chế độ hành động mới **Cuộc đua giành khách** ở `/arcade`: chạy, tranh đơn, giao hàng, lướt/xô và cùng mở lối đi. Tối thiểu3 người, đã kiểm tra26 kết nối; bản local cần2 service. Chạy `npm run build` rồi `npm run arcade:preview`, mở `http://127.0.0.1:5189/arcade`. Khi sửa mã dùng `npm run arcade:dev`.

- [Hướng dẫn MC của game hành động](docs/arcade/classroom-runbook.md)
- [Cấu hình local/hosting và phần chưa được triển khai](docs/arcade/deployment.md)
- [Bộ asset và nguồn](assets/arcade/provenance.json)
- [Kiểm chứng, hiệu năng và giới hạn diễn tập](docs/arcade/playtest-report.md)

Nội dung bên dưới mô tả chế độ câu hỏi cũ, được giữ nguyên.

Game tiếng Việt cuối bài thuyết trình Kinh tế chính trị Mác–Lênin: Từ 3 lượt tham gia; mỗi điện thoại đại diện cho một cá nhân hoặc một nhóm, ba vòng tình huống và leaderboard. Tối đa 90 điểm. Chơi 9 phút + 1 phút chốt; vào phòng/phổ biến luật ngoài khung này.

- [Hướng dẫn MC và phương án dự phòng](docs/classroom-runbook.md)
- [Ngân hàng câu hỏi và nguồn](docs/question-bank.md)
- [Acceptance matrix](docs/acceptance-matrix.md)
- [Bằng chứng kiểm thử mở rộng](docs/acceptance-extended-verification.md)
- [Nhật ký phát triển](docs/development-log.md)

## Chạy local

Node 24 LTS, npm. Cài đúng lockfile bằng `npm ci`; `npm run build` sinh cấu hình Worker. Áp migration local rồi chạy preview:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_redundant_gunslinger.sql
npm run dev -- --port 5187
```

Mở http://127.0.0.1:5187. Khi dùng Sites, giữ helper setup/install/build và Site identity trong `.openai/hosting.json`; production dùng Worker và D1 binding `DB`.

```powershell
npm run typecheck
npm run test:unit
npm run test:api
npm run test:e2e
```

API/E2E cần server local; browser tests dùng Chrome đã cài. Có thể đặt `ACCEPTANCE_BASE_URL`. Ca riêng: `RUN_REAL_DURATION=1` chạy đủ 600 giây, `RUN_RESTART=1` kiểm tra tự khởi động lại runtime. Timing fixtures chỉ dùng D1 local; production không có endpoint đổi giờ/điểm. Không chạy fixtures trên dữ liệu buổi học.

## Mã nguồn

`server/content` chứa 18 tình huống/54 nhiệm vụ và lời giải, chỉ import từ server. `server/game` quyết định random, deadline, chấm và DTO theo quyền. `server/room-store.ts` lưu D1 bằng version CAS. `app/api/rooms` xác thực lệnh; `components/game` hiển thị MC/điện thoại; `hooks/useRoom.ts` đồng bộ.

Token điều khiển 32 byte lưu trong trình duyệt, chỉ hash trong phòng; không vào QR/URL. Phòng hết hạn sau 24 giờ. Không dùng AI runtime hay tài khoản cá nhân. Không cần chọn vị trí nhóm hay khai báo trước số lượng. Cùng ván tải lại giữ đề; chơi lại sinh seed/run mới, đề có thể lặp giữa các ván độc lập. Đồng điểm cùng hạng, không thưởng tốc độ. Mỗi vòng có sáu tình huống: tối đa sáu lượt nhận đề khác nhau; đông hơn thì phân phối lại cân bằng. Không còn giới hạn sản phẩm sáu nhóm; khả năng phục vụ vẫn phụ thuộc dung lượng và tải của hosting.

Sửa nội dung tại `server/content/data.ts`: mỗi nhiệm vụ gồm prompt, đáp án đúng, ba phương án nhiễu và giải thích. Engine xáo lựa chọn và tạo ID công khai riêng. Chạy unit tests sau khi sửa. Tất cả tình huống hư cấu, không phải chứng cứ về doanh nghiệp thật.
