# Kiểm chứng bản local — Cuộc đua giành khách

27–28/10/2026. Game mới dưới `/arcade`; bản câu hỏi và dữ liệu D1 được giữ riêng. Đây là bản local đã kiểm chứng, chưa phải kết quả diễn tập trên Wi‑Fi lớp hoặc một deployment WSS công khai.

## Bằng chứng hiện có

| Nhóm | Kết quả |
|---|---|
|Unit|115/115 PASS trên18 file; TypeScript PASS|
|Asset|47 nhóm required,305 frame,4 backdrop+wordmark,2 font Việt,16 SFX+2 music loop, OGG/MP3; source/license/SHA256/alpha/atlas PASS|
|Ngân sách|Ảnh/font trong trận2.95MiB (chưa gồm backdrop); audio3.40MiB; mỗi atlas<=2048px. Boot bảo thủ1.317MiB gồm toàn bộ client JS/CSS gzip, cả4 backdrop, wordmark và2 font; xem `evidence/bundle-budget.json`|
|API cả hai chế độ|Bản production:39PASS,3SKIP theo guard cũ; A10 bỏ khỏi lần này vì đã chạy600s thật riêng|
|A10 độc lập|PASS600s thật, đúng practice/reset/chặng/kết quả540s, khóa xu và xuất CSV đến600s|
|Chrome độc lập|E01–E03 PASS; tạo/join/start/pause/replay, CSS zoom125%, blur/typing và reconnect|
|Chrome bổ sung|Menu/Escape/Tab và âm thanh/sliders PASS|
|Toàn bộ Chrome production|12/12 PASS,0flaky, gồm6 luồng quiz legacy và6 luồng arcade; mất4.4 phút gồm practice thật và cleanup Chrome|
|Chơi bằng phím|3 Chrome process độc lập: tranh một đơn, xô có event thật, giữ hàng, đi vòng qua cầu, giao đúng1 lần và cùng thấy xu — PASS|
|Hồi quy focus legacy|Một readiness race của test cũ được tác giả acceptance độc lập xác minh và sửa đúng1condition; UI legacy giữ nguyên; server có tối ưu đọc trạng thái nêu dưới. Xem `legacy-test-validity.md`|
|Quyền riêng tư realtime|Đơn riêng và sự kiện nhận/giao/bỏ đơn chỉ tới chủ đơn và MC, kể cả sau khi receipt bị xóa;2 test sự kiện qua full/patch PASS|
|Review và vòng đời|Một fresh review;3 Important được tái hiện RED rồi GREEN3/3 qua socket/Worker thật. Có khởi động lại runtime khi paused; xem `final-review.md`|
|Build|Vinext production build PASS; realtime Wrangler dry-run PASS (173.20KiB / gzip34.00KiB); không deploy|
|Lint|Mã mới0 lỗi; toàn repo còn9 lỗi ở4 file legacy không đổi (`Brand`, `JoinScreen`, `RoomClient`, `useRoom`),9 warnings; không tuyên bố lint toàn repo xanh|

Ca chơi3 máy dùng sự kiện phím Chrome tin cậy qua CDP, xếp lịch key-up cùng lúc với key-down để thời gian giữ phím không cộng thêm độ trễ round trip. Các điểm/vị trí/đồng hồ đều do server thật quyết định. Không dùng API sửa state hoặc rút ngắn practice. Người thử tự động đi theo các làn riêng, vòng qua người chắn; không cho avatar xuyên nhau để làm bài test dễ hơn.

## Hồi quy đọc trạng thái quiz cũ

Các lượt kiểm tra lặp lại từng gặp GET10s timeout ở cohort26/40 và một lần runtime restart giữa request. Giữ nguyên timeout và assertion. `currentRoom` trước đây xếp hàng từng lần đọc D1; nay request cùng phòng chỉ chia sẻ một lần đọc đang chờ, xóa flight khi xong/lỗi, DTO vẫn dựng riêng theo quyền. Ba test gồm burst40 (RED40read→GREEN1read), thấy ghi mới và phục hồi sau lỗi. Full API cuối39PASS/3SKIP trong1.6 phút; cohort26/40 đạt11.7s/18.8s cho toàn hành trình ba vòng. D1 và quy tắc quiz giữ nguyên.

Bài3 Chrome giữ180s cho gameplay; đóng3 process Chrome nằm ở afterEach90s riêng, sau khi mọi assertion/ảnh/evidence đã hoàn thành. Lần timeout ở cleanup được giữ log, không coi là lỗi gameplay hay làm yếu kiểm tra.

## Tải26 người +3 màn render

Nguồn cuối sau sửa review: [`evidence/load-production-26-three-renderers.json`](evidence/load-production-26-three-renderers.json). Máy chủ realtime khởi động sạch; một phòng26 người active cùng3 renderer. Lần đạt trước review giữ riêng trong `evidence/load-26-three-renderers.json`.

- 26 socket cùng IP, input20Hz, E/Space và giao dịch;3 Chrome render toàn cảnh ở1366×768,1280×720,1920×1080.
- Đợi City tải xong và warm-up3s, đo120s input thực. Từ host start đến cả3 City ready:5308ms trên bản production local. Tải ban đầu được ghi riêng, không trộn thời gian loader vào FPS hoạt động.
- 5720 mẫu RTT: p50=26.58ms, p95=83.42ms. Chi phí tick p95=11ms.0 lỗi message,0 page error,0 khoảng trống sequence broadcast.48 đơn đã giao trong trạng thái cuối.
- Render thực qua Phaser POST_RENDER:60FPS, p95 frame21.5/21.6/21.8ms. RAF trình duyệt không được coi là FPS game.
- CPU i7‑13620H16 logical cores; Chrome ANGLE Intel UHD/Direct3D11. Heap quan sát khoảng19–33MB mỗi renderer; đây là xu hướng ngắn, không chứng minh không có leak dài hạn.
- Tổng nhận ở26 client Node:265603374 byte/120s. Full snapshot định kỳ +patch dùng chung giảm lặp map, nhưng mạng lớp vẫn phải thử thật.

Các lần trước chưa đạt RTT được giữ trong báo cáo thử: bản full-state đầu~1.065GB/120s; bản clone/diff riêng từng người và đo lẫn tải asset có RTT p95 vượt mục tiêu. Sau review, cách đọc lại native socket/attachment mỗi tick cũng không đạt tải (RTTp95~74.7s,tickp9539ms); bằng chứng giữ trong `evidence/load-presence-enumeration-failed.json`. Bản cuối dùng cache seenAt theo auth/message/close, dựng lại cache từ socket khi actor thức dậy, và kiểm deadline thuần bộ nhớ. Encode public state một lần, ghép phần riêng theo quyền, không xóa check để đạt gate. Gate script vẫn giữ RTTp95<=150ms, tickp95<=25ms, framep95<=33ms,0 lỗi/gap và mọi client có chuyển động.

## Cần xác minh ngoài phiên local

- Chưa deploy service Cloudflare hoặc xác minh WSS staging; xem `deployment.md`. Website đã có hosting không tự có binding realtime mới.
- Chưa có26 laptop người thật trên Wi‑Fi lớp, người mới chơi thử, khảo sát độ vui/cân bằng hoặc audition âm thanh bằng người. Các mức xu/khoảng cách là thông số khởi đầu.
- CSS zoom125% đã có ảnh trong Chrome; không gọi đó là native browser zoom hoặc kiểm tra mọi màn hình.
- Các màn MC trong phép đo không dùng dự đoán nhân vật. Chỉ số hòa giải hình ảnh của người chơi được ghi riêng trong bài3 Chrome; khoảng cách trước interpolation bao gồm độ trễ hiển thị, không phải sai số vật lý cùng timestamp.
- Ba client bàn phím production có khoảng cách hiệu chỉnh hiển thị p95 lần lượt5.58/6.33/9.53 đơn vị; không coi đây là sai số vật lý cùng timestamp. Cùng thấy30 xu và một lần giao của người thắng.

## Nguồn kiểm tra và quyết định

[`independent-matrix.md`](independent-matrix.md), [`independent-red-baseline.md`](independent-red-baseline.md), [`acceptance-matrix.md`](acceptance-matrix.md), [`implementation-record.md`](implementation-record.md), [`final-review.md`](final-review.md), [`visual-review.md`](visual-review.md). Bộ arcade acceptance độc lập giữ nguyên SHA256. Kết quả tổng và hash lưu trong [`evidence/final-test-summary.json`](evidence/final-test-summary.json).
