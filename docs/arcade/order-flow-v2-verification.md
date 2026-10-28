# Order flow v2 — kiểm chứng ngày28/10/2026

Thiết kế được người dùng duyệt: `../superpowers/specs/2026-10-28-arcade-order-flow-design.md`. Kế hoạch: `../superpowers/plans/2026-10-28-arcade-order-flow-implementation.md`. Báo cáo này bổ sung bằng chứng v2; các báo cáo/bản ghi v1 được giữ nguyên làm lịch sử.

## Quyết định và bằng chứng

Luật và thanh toán nằm trong `shared/arcade`, realtime chỉ nhận thao tác được xác thực. `cargo.ts` được dùng bởi luật nhặt/giao, snapshot, HUD và Phaser để cùng đọc quyền sở hữu. Snapshot công khai che toàn bộ ID kiện riêng trong cả trường cũ và danh sách mới. Từng điểm nhận có hạn hồi riêng; đích giao công khai có bộ đếm độc lập với đơn riêng.

Giữ nguyên toàn bộ asset và dependency; bổ sung số kiện, nhãn loại hàng, đồng hồ hồi và khách động bằng atlas/font sẵn có. Không thay đổi schema/D1 của quiz hoặc phát hành lên cloud. Ván cũ đang chạy/tạm dừng được nhận diện theo phiên bản và giữ tiến độ ở trạng thái gián đoạn để MC chủ động chơi lại; kết quả cũ vẫn xem được.

## Bằng chứng test-first

- Baseline115/115 unit trước khi sửa production.
- Tác giả acceptance độc lập chỉ đọc requirements và source cũ:26 unit chạy được,20 lỗi đúng hành vi mới chưa có;6 ca kiểm tra hành vi đã có. Tác giả thực hiện/sanction thay đúng U13 từ kho1 sang kho2, ghi nguyên assertion cũ và lý do R2.
- Worker thực chạy source cũ được đóng băng: nhặt bằng input hợp lệ, pause/reconnect đạt, nhưng hồi hàng sớm hơn45s làm RED. Cùng ca không đổi trên source v2 đạt.
- Chrome trên build cũ: RED vì thiếu countdown và thiếu tiền nhận của kiện thứ hai. Chrome cảnh đã chạy: RED vì chưa thêm khách ở mốc3 phút.
- Bốn ca bổ sung khôi phục phiên bản cũ RED vì thiếu nhận diện phiên bản, sau đó GREEN.
- Ma trận, command, SHA-256 và các bản RED: `order-flow-v2-matrix.md`, `order-flow-v2-red-baseline.md`. Không sửa ba bộ acceptance mới để làm chúng đạt.

## Kiểm chứng hiện có

| Kiểm tra | Kết quả |
|---|---|
| Unit |147/147 trên21 file đạt, gồm hai ca bổ sung phím E thật sau review|
| TypeScript |`tsc --noEmit` đạt|
| Toàn bộ Chrome |15/15 đạt,0 flaky,4,9 phút trên source sau sửa review; gồm quiz cũ, chơi arcade bằng phím, overlay và3 ca v2|
| API arcade |14/14 đạt,0 skip/flaky,78,8s; riêng45s refill chạy47,3s, gồm pause/reconnect và hàng chưa giao|
| API cả hai chế độ |39 đạt,1 lỗi quiz40 người,3 skip theo guard cũ; lỗi40 người cũng tái hiện trên build trước cập nhật, xem phân tích bên dưới|
| Build website |Production build đạt sau khi dừng đúng preview cũ đang khóa dist trên Windows|
| Realtime dry-run cuối |177,52KiB, gzip35,10KiB; không deploy|
| Asset |47 nhóm,305 frame; SHA/atlas/fallback đạt; ảnh/font2,95MiB, audio3,40MiB|
| Lint source liên quan |0 lỗi,6 cảnh báo hiện có; lần quét thư mục ban đầu còn ăn nhầm bundle sinh tự động trong `realtime/work`, đã tách riêng source tracked để báo chính xác|
| Tải26 kết nối +3 renderer |90s input thực,RTT p95=51,21ms,tick p95=6ms;60FPS ở cả3 màn,frame p95=23,9/24/24ms;0 lỗi message/browser/gap; mọi người chơi có chuyển động|
| Ngân sách boot |27 chunk; gzip toàn bộ JS/CSS=538572byte,art/font=844099byte,tổng bảo thủ1382671byte (~1,319MiB),dưới2MiB|
| Review toàn nhánh |Một Important về E nhấn/giữ ở vùng chồng lấn,2 regression RED→GREEN;147/147 unit sau sửa; không có Minor mới|

Bằng chứng có thể đọc mà không chứa capability/token: [`evidence/order-flow-v2-test-summary.json`](evidence/order-flow-v2-test-summary.json), [`evidence/order-flow-v2-load.json`](evidence/order-flow-v2-load.json), [`evidence/order-flow-v2-bundle-budget.json`](evidence/order-flow-v2-bundle-budget.json). Báo cáo review: [`order-flow-v2-final-review.md`](order-flow-v2-final-review.md). Các JSON/trace/log đầy đủ được giữ trong worktree ở `test-results/` và `work/order-flow-v2-execution-logs/`; không đưa capability hoặc attachment base64 vào báo cáo tracked.

## Lỗi quiz40 người có từ trước

Lượt API chạy đồng thời với Chrome có38 đạt/2 lỗi/3 skip, Chrome14 đạt/1 lỗi đi bộ timeout. Đã giữ bằng chứng, đóng băng source và chạy tuần tự: toàn bộ Chrome15/15 đạt; API39 đạt/1 lỗi/3 skip. Bộ14 API arcade độc lập trên source cuối đạt toàn bộ.

Lỗi còn lại là ca quiz cũ `classroom cohort40: shared-IP joins, balanced three-round assignments, concurrent answers/submits and replay`. Sau khi cả40 người trả lời/nộp vòng1 và fixture D1 chuyển sang vòng2,19 lượt GET đầu khoảng1s,21 lượt sau thật sự timeout10s; phản hồi server đến muộn khoảng104–105s. Cả D1 sạch và tắt trace vẫn tái hiện. Thời gian1730 assertion tổng283ms không giải thích được lỗi; chưa xác định nguyên nhân stall. Các probe không có bước trả lời/nộp vòng1 không tương đương nên không được coi là đã sửa.

Đối chứng cuối chạy nguyên ca test đó với **build production trước cập nhật ở commit d3dae7e** cũng lỗi. Diff của `server/room-store.ts`, `server/game`, `app/api/rooms`, `.openai` trong thay đổi này rỗng. Kết luận đủ bằng chứng là lỗi local có từ trước, chưa khẳng định nguyên nhân sâu hơn. Giữ timeout/assertion, không đánh dấu lỗi thành skip/pass, không sửa quiz ngoài phạm vi thiết kế arcade đã duyệt. Vì vậy không tuyên bố toàn bộ API xanh hoặc đã sẵn sàng cho40 người ở chế độ quiz. Ba skip cũ vẫn là persisted legacy, real-duration quiz và runtime restart theo guard của chúng.

## Bài tải và command cuối

`node scripts/arcade-load.mjs --url ws://127.0.0.1:5195 --origin http://127.0.0.1:5187 --clients26 --seconds90 --rendered3 --out test-results/order-flow-v2-load/report.json`:26 socket thật cùng IP,3 Chrome Phaser renderer ở1366×768,1280×720,1920×1080. City ready3611ms; đo90s input sau warm-up,4420 mẫu RTT;23 đơn đã giao.Ảnh cuối được chụp sau khi MC pause; FPS lấy từ Phaser POST_RENDER trong khoảng chơi, không lấy FPS RAF thay thế. Máy i7-13620H/16 logical cores,Intel UHD/ANGLE D3D11. Tổng nhận192849764byte; heap mỗi renderer khoảng19–32MB trong lượt ngắn, không chứng minh không có leak dài hạn.

Command unit: `node node_modules/vitest/vitest.mjs run --maxWorkers=1`; typecheck: `node node_modules/typescript/bin/tsc --noEmit`; browser: `node node_modules/@playwright/test/cli.js test --project=browser`; API arcade: cùng CLI với ba file `tests/api/arcade-{independent,lifecycle,order-flow-v2}.spec.ts`, bỏ riêng A10 đã có bằng chứng600s v1. Production: `node scripts/run-framework.mjs build`; realtime: `node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config realtime/wrangler.jsonc --outdir work/order-flow-v2-realtime-build`; assets: `node scripts/verify-arcade-assets.mjs`. Node24 được dùng nhất quán. Không đổi dependency hoặc sửa ba bộ acceptance v2 độc lập; SHA cuối khớp bản frozen trong RED report.

## Ảnh quan sát

- `screenshots/order-flow-v2/real-keyboard-order-cooldown.png`: Chrome nhập bàn phím, nhặt kiện qua server thực và thấy đồng hồ hồi.
- `screenshots/order-flow-v2/authorized-two-private-cargo-ui.png`: actual shell/Phaser/font/asset với network fixture được cấp quyền; kiểm tra bố cục hai kiện, giá trị6/4 và kho chờ1. Đây là kiểm tra giao diện bằng fixture, không phải hành trình kiếm xu/mở kênh trên server thực.
- `screenshots/order-flow-v2/central-customers-arrive.png`: actual shell/Phaser chuyển giữa hai snapshot trước/sau180s; kiểm tra khách được thêm vào cảnh hiện có. Nhịp180s và tỷ lệ17/3 được kiểm tra riêng trên luật production.

## Giới hạn

Nhịp45/20 giây và giá8 xu là cấu hình đã duyệt để chơi thử, chưa được xác nhận cân bằng qua sinh viên. Kiểm chứng local không thay cho Wi-Fi lớp/26 laptop thật hoặc staging WSS. Không lặp lại bài600s thực của v1 vì các mốc thời gian được giữ; unit v2 vẫn kiểm tra360/540/600s. Hạn chế animation/FX còn chạy lúc MC pause đã ghi ở bản v1 không được tuyên bố là đã sửa toàn bộ trong thay đổi này.

## Bàn giao local đã kiểm chứng

Fast-forward checkout sạch `E:/MLN122/web-game`, nhánh `work/quyen-luc-so`, từ d3dae7e lên7cdd67a (code+evidence), sau đó đồng bộ commit tài liệu bàn giao. Bản `dist` cũ được chuyển nguyên vẹn vào `work/pre-order-flow-v2-dist-20261028`;200 file dist chép từ build đã kiểm chứng khớp SHA256 từng file. Không đụng/reset D1 hoặc kho trạng thái arcade gốc.

PID launcher cũ đã hết hoạt động; xác minh5189/5191 trống trước khi mở đúng `node scripts/run-arcade-local.mjs --production`, PID19824 tại thời điểm bàn giao. Website [`http://127.0.0.1:5189/arcade`](http://127.0.0.1:5189/arcade) và realtime5191 đều200; tạo phòng/bootstrap host qua proxy thật trả `rulesVersion=2`. Trong checkout chính,147/147 unit và TypeScript đạt; hai smoke Chrome trên đúng5189 đạt: tạo/join/start/pause/replay và nhặt bằng bàn phím với đồng hồ hồi45s,0 flaky. Hai body20,2s/4,5s, tổng88,5s gồm đóng browser.

MC chọn **Chơi lại** hoặc tạo phòng mới để dùng luật mới; giữ tiến độ ván cũ ở trạng thái gián đoạn thay vì tự đổi xu. Chỉ bàn giao local, không push/deploy cloud. Worktree `E:/MLN122/.worktrees/cuoc-dua-gianh-khach` được giữ vì chứa raw asset và evidence gốc. Ledger và mọi quyết định: [`order-flow-v2-implementation-record.md`](order-flow-v2-implementation-record.md). Bằng chứng bàn giao không chứa token: [`evidence/order-flow-v2-local-handoff.json`](evidence/order-flow-v2-local-handoff.json).
