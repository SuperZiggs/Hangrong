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
| Chrome mới |3/3 đạt: nhặt thực/cooldown, HUD2 kiện riêng, khách trung tâm xuất hiện trong cảnh đã chạy|
| Worker thực + lifecycle |4/4 đạt; riêng45s refill chạy47,4s, gồm pause/reconnect và hàng chưa giao|
| Build website |Production build đạt sau khi dừng đúng preview cũ đang khóa dist trên Windows|
| Realtime dry-run |177,35KiB, gzip35,07KiB; không deploy|
| Asset |47 nhóm,305 frame; SHA/atlas/fallback đạt; ảnh/font2,95MiB, audio3,40MiB|
| Lint source liên quan |0 lỗi,6 cảnh báo hiện có; lần quét thư mục ban đầu còn ăn nhầm bundle sinh tự động trong `realtime/work`, đã tách riêng source tracked để báo chính xác|

Hồi quy toàn bộ API/Chrome, kiểm tra tải và lượt review cuối được cập nhật bên dưới sau khi hoàn tất; không coi các bước đang chạy là đã đạt.

## Ảnh quan sát

- `screenshots/order-flow-v2/real-keyboard-order-cooldown.png`: Chrome nhập bàn phím, nhặt kiện qua server thực và thấy đồng hồ hồi.
- `screenshots/order-flow-v2/authorized-two-private-cargo-ui.png`: actual shell/Phaser/font/asset với network fixture được cấp quyền; kiểm tra bố cục hai kiện, giá trị6/4 và kho chờ1. Đây là kiểm tra giao diện bằng fixture, không phải hành trình kiếm xu/mở kênh trên server thực.
- `screenshots/order-flow-v2/central-customers-arrive.png`: actual shell/Phaser chuyển giữa hai snapshot trước/sau180s; kiểm tra khách được thêm vào cảnh hiện có. Nhịp180s và tỷ lệ17/3 được kiểm tra riêng trên luật production.

## Giới hạn

Nhịp45/20 giây và giá8 xu là cấu hình đã duyệt để chơi thử, chưa được xác nhận cân bằng qua sinh viên. Kiểm chứng local không thay cho Wi-Fi lớp/26 laptop thật hoặc staging WSS. Không lặp lại bài600s thực của v1 vì các mốc thời gian được giữ; unit v2 vẫn kiểm tra360/540/600s. Hạn chế animation/FX còn chạy lúc MC pause đã ghi ở bản v1 không được tuyên bố là đã sửa toàn bộ trong thay đổi này.
