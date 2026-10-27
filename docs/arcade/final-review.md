# Review toàn nhánh và xử lý

Review read-only với ngữ cảnh mới, range `b7d0ad9..6c33fe2602fe833cb241c2b204b095908c762bc0`. Reviewer dự kiến gpt-6-astra không chạy được do usage limit trước khi đọc mã; reviewer khả dụng gpt-6.1-sol thực hiện lượt review thực tế duy nhất. Không reviewer con, không re-review sau sửa.

Kết luận ban đầu: **With fixes**. Không Critical. Ba Important được giữ mức theo tác động tới người chơi:

1. Hai socket cùng capability có thể đưa sequence về thấp hơn. Sửa bằng kiểm tra sequence tăng ở cấp player/run cùng với cấp socket. Tab/reconnect mới lấy ack trong bootstrap; hồi phục không đặt lại ack của ván đang chơi.
2. Wi-Fi mất im lặng vẫn để socket OPEN và thân nhân vật còn chắn. Sửa bằng deadline từ lần traffic hợp lệ gần nhất; input lease250ms vẫn giữ nguyên. Sau khoảng3s không traffic, thân hết chắn; traffic trở lại phục hồi kết nối.
3. Runtime được dựng lại từ phòng paused làm mất map disconnect trong bộ nhớ. Sửa bằng đối chiếu live authenticated sockets mỗi tick; người vắng mặt được cấp deadline rồi bỏ thân, người còn gửi input vẫn connected. Vị trí/xu/đơn được giữ.

`tests/api/arcade-lifecycle.spec.ts` tạo Worker riêng cổng5194 với persistence riêng. Cả3 test đã **RED vì chính lỗi trên**, sau đó **GREEN3/3**. Ca thứ3 dừng và khởi động lại cây tiến trình do chính test tạo, không thay đồng hồ/state lưu và không đụng server chính. Lượt RED và GREEN được lưu riêng trong test-results/log của checkout kiểm chứng.

Minor được hoãn: animation/FX vẫn chạy bằng scene time khi MC pause; logic, vị trí, xu và đồng hồ trận đã dừng. Không sửa polish sau review. Người chơi vẫn thấy thông báo tạm dừng. Cần đóng băng presentation clock trong lần cải tiến sau.

Declined to judge: rỗng. Reviewer không bỏ qua hành vi nào vì spec im lặng. Các kiểm chứng local cuối được tổng hợp trong `playtest-report.md`; không suy ra WSS hoặc diễn tập lớp từ review mã nguồn.

Trong cùng fix pass, kiểm chứng phát hiện điểm nghẽn đọc D1 của quiz cũ. Tối ưu gộp request đang chờ, không giữ cache kết quả. Test burst40 RED→GREEN; test ghi mới/lỗi đọc PASS; full API39PASS và Chrome12PASS sau sửa. Đóng Chrome trong hook riêng để không trừ cleanup Windows vào180s gameplay. Không đổi4 file arcade acceptance độc lập.
