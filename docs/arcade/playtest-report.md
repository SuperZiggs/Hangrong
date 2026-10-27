# Kiểm chứng bản local — Cuộc đua giành khách

27/10/2026. Game mới dưới `/arcade`; bản câu hỏi và dữ liệu D1 được giữ riêng. Đây là bản local đã kiểm chứng, chưa phải kết quả diễn tập trên Wi‑Fi lớp hoặc một deployment WSS công khai.

## Bằng chứng hiện có

| Nhóm | Kết quả |
|---|---|
|Unit|112/112 PASS trên17 file; TypeScript PASS|
|Asset|47 nhóm required,305 frame,4 backdrop+wordmark,2 font Việt,16 SFX+2 music loop, OGG/MP3; source/license/SHA256/alpha/atlas PASS|
|Ngân sách|Ảnh/font theo catalogue2.95MiB; audio3.40MiB; mỗi atlas<=2048px|
|API cả hai chế độ|36PASS,3SKIP theo guard cũ; A10 bỏ khỏi lần này vì đã chạy600s thật riêng|
|A10 độc lập|PASS600s thật, đúng practice/reset/chặng/kết quả540s, khóa xu và xuất CSV đến600s|
|Chrome độc lập|E01–E03 PASS; tạo/join/start/pause/replay, CSS zoom125%, blur/typing và reconnect|
|Chrome bổ sung|Menu/Escape/Tab và âm thanh/sliders PASS|
|Chơi bằng phím|3 Chrome process độc lập: tranh một đơn, xô có event thật, giữ hàng, đi vòng qua cầu, giao đúng1 lần và cùng thấy xu — PASS|
|Hồi quy focus legacy|Một readiness race của test cũ được tác giả acceptance độc lập xác minh và sửa đúng1condition; production legacy không đổi. Xem `legacy-test-validity.md`|
|Quyền riêng tư realtime|Đơn riêng và sự kiện nhận/giao/bỏ đơn chỉ tới chủ đơn và MC, kể cả sau khi receipt bị xóa;2 test sự kiện qua full/patch PASS|

Ca chơi3 máy dùng sự kiện phím Chrome tin cậy qua CDP, xếp lịch key-up cùng lúc với key-down để thời gian giữ phím không cộng thêm độ trễ round trip. Các điểm/vị trí/đồng hồ đều do server thật quyết định. Không dùng API sửa state hoặc rút ngắn practice. Người thử tự động đi theo các làn riêng, vòng qua người chắn; không cho avatar xuyên nhau để làm bài test dễ hơn.

## Tải26 người +3 màn render

Nguồn số đo: [`evidence/load-26-three-renderers.json`](evidence/load-26-three-renderers.json).

- 26 socket cùng IP, input20Hz, E/Space và giao dịch;3 Chrome render toàn cảnh ở1366×768,1280×720,1920×1080.
- Đợi City tải xong và warm-up3s, đo120s input thực. Từ host start đến cả3 City ready:2768ms trong runtime local đã warm. Tải ban đầu được ghi riêng, không trộn thời gian loader vào FPS hoạt động.
- 5928 mẫu RTT: p50=9.65ms, p95=52.71ms. Chi phí tick p95=6ms.0 lỗi message,0 page error,0 khoảng trống sequence broadcast.35 đơn đã giao trong trạng thái cuối.
- Render thực qua Phaser POST_RENDER:60FPS, p95 frame21.7/21.6/21.2ms. RAF trình duyệt không được coi là FPS game.
- CPU i7‑13620H16 logical cores; Chrome ANGLE Intel UHD/Direct3D11. Heap quan sát khoảng33–50MB mỗi renderer; đây là xu hướng ngắn, không chứng minh không có leak dài hạn.
- Tổng nhận ở26 client Node:267230738 byte/120s. Full snapshot định kỳ +patch dùng chung giảm lặp map, nhưng mạng lớp vẫn phải thử thật.

Các lần trước chưa đạt RTT được giữ trong báo cáo thử: bản full-state đầu~1.065GB/120s; bản clone/diff riêng từng người và đo lẫn tải asset có RTT p95 vượt mục tiêu. Bản cuối encode public state một lần, ghép phần riêng theo quyền, không xóa check để đạt gate. Gate script vẫn giữ RTTp95<=150ms, tickp95<=25ms, framep95<=33ms,0 lỗi/gap và mọi client có chuyển động.

## Cần xác minh ngoài phiên local

- Chưa deploy service Cloudflare hoặc xác minh WSS staging; xem `deployment.md`. Website đã có hosting không tự có binding realtime mới.
- Chưa có26 laptop người thật trên Wi‑Fi lớp, người mới chơi thử, khảo sát độ vui/cân bằng hoặc audition âm thanh bằng người. Các mức xu/khoảng cách là thông số khởi đầu.
- CSS zoom125% đã có ảnh trong Chrome; không gọi đó là native browser zoom hoặc kiểm tra mọi màn hình.
- Các màn MC trong phép đo không dùng dự đoán nhân vật. Chỉ số hòa giải hình ảnh của người chơi được ghi riêng trong bài3 Chrome; khoảng cách trước interpolation bao gồm độ trễ hiển thị, không phải sai số vật lý cùng timestamp.

## Nguồn kiểm tra và quyết định

[`independent-matrix.md`](independent-matrix.md), [`independent-red-baseline.md`](independent-red-baseline.md), [`acceptance-matrix.md`](acceptance-matrix.md), [`implementation-record.md`](implementation-record.md). Bộ arcade acceptance độc lập giữ nguyên SHA256. Kiểm tra cuối toàn suite và review branch được ghi bổ sung sau khi kết thúc.
