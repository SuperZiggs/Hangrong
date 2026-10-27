# Acceptance matrix thực thi

Bảng độc lập chi tiết: [`independent-matrix.md`](independent-matrix.md). Yêu cầu đóng băng: [`frozen-requirements.md`](frozen-requirements.md).

| Yêu cầu | Bằng chứng |
|---|---|
|Min3,26 cùng IP, tên trùng, idempotency, role/room isolation|A01–A06,A09,A11|
|Di chuyển chuẩn hóa, dash/va chạm/miễn đẩy/tường|U01–U05;3 Chrome contest/bump/delivery|
|Không mất E/Space khi packet đến nhanh; một edge một lần; lease250ms|input-inbox4; input3; A07–A08; E03|
|Một chủ/một lần giao, phí khóa một lần, số dư0, bỏ đơn|U06–U11;3 Chrome giao10 xu qua cầu miễn phí|
|Khuyến mãi/kênh riêng/lối chung, giới hạn và đồng thời|U12–U14; world/server authority; API permission tests|
|Đợt mở đầu công bằng, chỗ xuất phát hợp lệ, nhà có collision|opening5;map-buildings1|
|Private orders/sự kiện không lộ; public encoding dùng chung không ghi đè phần riêng|U08;stream1;private-events2;transport4|
|Timeline, reset60s, fee360s, khóa điểm540s, giữ kết quả600s|U15–U19;A10 real600s; bài3 Chrome đợi stage1 thật|
|Reconnect/recovery/stale run/expiry/pause|A05–A08;E03;independent unit pause|
|Hai socket cùng danh tính, Wi-Fi mất im lặng, paused qua runtime restart thật|arcade-lifecycle3: RED→GREEN; player ack tăng, thân mất chắn sau~3s, trạng thái tiến độ giữ nguyên|
|HUD/menu/âm thanh Việt, laptop/mobile/125%|E01–E03;overlay/audio2;ảnh kiểm tra|
|Asset complete/alpha/anchor/atlas/source/license/hash/budget|asset49;Pillow pipeline;verify-arcade-assets;engine/review board|
|Tải active26 +3 renderers|load-production-26-three-renderers.json:120s, RTTp9583.42ms,tickp9511ms,60FPS,0 error/gap|
|Gộp đọc D1 đang chờ; đọc sau ghi/lỗi không giữ state cũ|room-read-concurrency3; cohort26/40 unmodified PASS|
|Game cũ giữ API/data và hành vi|26 API legacy PASS;6 browser legacy qua full run+readiness audit|
|Hosting và diễn tập lớp|Chưa có WSS staging hoặc diễn tập Wi‑Fi/người thật; không claim đã production-ready|

Bộ test chỉ đọc state của production qua API/WebSocket. Các fixture đổi thời gian của quiz cũ chỉ dùng D1 local cho test quiz, không dùng để chứng minh600s của arcade hoặc thay đổi state arcade.
