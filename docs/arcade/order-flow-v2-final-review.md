# Review toàn nhánh — order flow v2

Reviewer độc lập, read-only, model gpt-6-astra/high. Phạm vi `d3dae7e..5defec757f83cc1a5497825508f78330edf43529`; đọc spec, plan, source và test; không sửa checkout hoặc giao lại review cho agent khác.

Không có Critical. Một Important: vị trí home+(0,35) nằm trong bán kính42 của cả tiệm và kho riêng(home+72). Phím E thật đặt cả `interactPressed` và `abandonHeld`; nhánh bỏ hàng chặn lần nhấn thứ hai, trái lời nhắc nhận thêm kiện. Hai regression dùng `InputState.down/up/frame` với `stepWorld` đã thất bại RED(1 kiện thay vì2).

Một lượt sửa: vẫn đếm thời gian giữ E, nhưng cho phép một cạnh nhấn mới nhận kiện hợp lệ trong vùng chồng lấn trước ngưỡng1000ms. Giữ đủ1000ms vẫn bỏ tất cả; giữ phím không lặp nhận, mỗi kiện không thanh toán hai lần. Hai ca GREEN, toàn bộ147/147 unit và TypeScript đạt. Không thay hoặc nới acceptance độc lập. Theo quy trình inline, không thuê thêm lượt review lại cùng diff; test RED→GREEN và hồi quy là bằng chứng sửa.

Reviewer kiểm tra40 phép so sánh projection/stream trong bộ nhớ: hai kiện, giao một phần, alias cũ, phí khác nhau và trở lại hàng công khai; không thấy rò ID riêng. Timer từng điểm, kho giới hạn, bộ đếm đích giao, map thay mới ở mốc khách đến và khôi phục phiên bản cũ khớp thiết kế.

Không có Minor mới. Declined to judge: animation/FX cũ vẫn chạy khi MC pause, đã là hạn chế Minor ghi ở v1 và không được tuyên bố sửa toàn bộ trong v2. Quyết định của executor: giữ phạm vi; đồng hồ luật, spawn, phí và tiền dừng khi pause, nhưng hình ảnh cũ có thể tiếp tục động.

Sau review, toàn bộ15 Chrome và14 API arcade trên source đã sửa đều đạt. Timeout40 người quiz cũ còn tái hiện khi chạy riêng, trên D1 sạch và cả build trước cập nhật d3dae7e; đã giữ làm lỗi có từ trước chưa xử lý trong phạm vi arcade. Xem `order-flow-v2-verification.md`; không coi full API là PASS.
