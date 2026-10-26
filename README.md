# Quyền lực số

Game tiếng Việt cuối bài thuyết trình Kinh tế chính trị Mác–Lênin: 2–6 nhóm, một điện thoại/nhóm, ba vòng tình huống và leaderboard. Tối đa 90 điểm. Chơi 9 phút + 1 phút chốt; vào phòng/phổ biến luật ngoài khung này.

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

Token điều khiển 32 byte lưu trong trình duyệt, chỉ hash trong phòng; không vào QR/URL. Phòng hết hạn sau 24 giờ. Không dùng AI runtime hay tài khoản cá nhân. Cùng ván tải lại giữ đề; chơi lại sinh seed/run mới, đề có thể lặp giữa các ván độc lập. Đồng điểm cùng hạng, không thưởng tốc độ.

Sửa nội dung tại `server/content/data.ts`: mỗi nhiệm vụ gồm prompt, đáp án đúng, ba phương án nhiễu và giải thích. Engine xáo lựa chọn và tạo ID công khai riêng. Chạy unit tests sau khi sửa. Tất cả tình huống hư cấu, không phải chứng cứ về doanh nghiệp thật.
