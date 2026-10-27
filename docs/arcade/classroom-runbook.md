# Vận hành Cuộc đua giành khách

Game mô phỏng hư cấu dùng để trải nghiệm và thảo luận về nền tảng, quyền lực thị trường và quyền lựa chọn. Đây không phải kết luận pháp lý về một doanh nghiệp thật. Các mức xu và thời gian hồi hiện là thông số khởi đầu, chưa có diễn tập cân bằng với sinh viên.

## Chuẩn bị

1. Mở `/arcade` trên laptop MC, chọn **Tạo phòng**. Chiếu QR hoặc mã8 ký tự.
2. Mỗi laptop nhập tên cá nhân/nhóm và mã phòng. Một laptop điều khiển một nhân vật. Cần tối thiểu3 người để bắt đầu; có kiểm tra tự động ở26 người.
3. MC kiểm danh sách, loại lượt nhập nhầm trước khi bắt đầu. Tên có thể trùng; số thứ tự và dấu hình/màu giúp phân biệt trong thành phố.
4. Tắt tiếng mặc định để tránh nhiều laptop phát nhạc cùng lúc. Có thể bật riêng nhạc/hiệu ứng và giảm chuyển động trong cài đặt.

## Hướng dẫn20 giây

Để tự thử trên một máy trước buổi học: tạo phòng, rồi mở terminal thứ hai trong repo và chạy `npm run arcade:load -- --room MAPHONG8 --clients 3 --seconds 600` (thay `MAPHONG8` bằng mã thật). Ba bot tham gia qua cùng API/WebSocket như người chơi. Mở tab khác để nhập tên của mình **trước khi** MC bấm bắt đầu. Bot chỉ nhận/giao, chạy và lướt; không sửa xu/vị trí hay đồng hồ. Ctrl+C ngắt bot. Đây là công cụ thử local, không thay diễn tập lớp.

“Dùng WASD hoặc mũi tên để chạy, E để nhận và giao hàng, Space để lướt và xô nhẹ. Người chơi có thể chắn nhau, nhưng không ai bị loại. Đi theo dấu nhận/giao và bản đồ nhỏ. Cầu vòng miễn phí; đi qua cổng P có thể phát sinh phí trên đơn đang mang.”

- Một người mang tối đa một đơn; giao đúng điểm nhận xu. Va chạm không làm mất hàng.
- Đợt đơn đầu xuất hiện đồng thời, mọi người cách điểm nhận gần nhất cùng120 đơn vị. Ô vàng trên bản đồ nhỏ là tiệm riêng, cùng số với nhân vật.
- Giữ E khoảng1 giây ở tiệm của mình để bỏ đơn. Space hồi4 giây.
- Quầy cạnh tiệm: khuyến mãi8 xu; kênh riêng40 xu. Điểm góp gần lối chung: góp5 xu hoặc phần còn thiếu. Khi góp đủ, mọi người dùng được cầu chung.
- Tab mở/đóng bảng xếp hạng; Escape mở/đóng menu. Mở menu hoặc đổi tab trình duyệt sẽ dừng thao tác của nhân vật; phòng vẫn chạy.

## Nhịp10 phút

| Thời gian | Trạng thái |
|---|---|
|0–60 giây|Chạy thử; tại giây60 đặt lại xu, đơn và nâng cấp thử|
|60–180|Chặng1|
|180–360|Chặng2|
|360–540|Chặng3; phí cổng P đổi từ2 lên4 xu|
|540–600|Chốt kết quả, không cộng xu mới; MC thảo luận|

MC có thể tạm dừng và tiếp tục. Chơi lại yêu cầu xác nhận, giữ danh sách và đặt lại toàn bộ tiến độ ván. Đồng xu cùng hạng, không thưởng tốc độ mạng.

## Mất kết nối

- Tải lại trên cùng trình duyệt giữ danh tính bằng phiên đã lưu. Đừng xóa dữ liệu trình duyệt trong trận.
- Khi mất mạng, game ngừng gửi thao tác và báo kết nối lại. Sau khoảng3 giây mất socket, thân nhân vật không còn chắn đường.
- Nếu đổi máy, MC mở cài đặt, cấp mã phục hồi cho đúng số/tên. Nhập mã trên máy mới; quyền máy cũ hết hiệu lực. Mã dùng trong5 phút.
- Nếu máy chủ khởi động lại bất ngờ, phòng có thể báo **Trận đã gián đoạn**. MC mở ván mới; không dùng tiến độ chưa hoàn tất làm kết quả chính thức.
- Nếu Wi‑Fi lớp không ổn định, MC tạm dừng. Chỉ tiếp tục sau khi thử kết nối; nếu không phục hồi được, chuyển sang thảo luận tình huống từ trải nghiệm vừa chơi.

## Lời chốt một phút

“Nền tảng giúp kết nối người bán và khách hàng, giảm một phần công sức tìm kiếm. Khi nhiều người phụ thuộc vào cùng một cổng, thay đổi phí hoặc điều kiện tiếp cận có thể tác động rộng. Trong game, các bạn đã chọn trả phí, tự mở kênh, hoặc góp xây một lối chung. Hãy phân biệt lợi ích của quy mô và đổi mới với khả năng kiểm soát điều kiện thị trường. Một ván game đơn giản không đủ chứng minh độc quyền; nó cho chúng ta tình huống để thảo luận.”

Gợi mở: Ai được lợi từ cổng P? Khi phí đổi, ai khó chuyển hướng nhất? Lối chung cần phối hợp gì? Đầu tư riêng có đánh đổi nào?

Chỉ báo “Đơn qua P” đếm các đơn đã giao có phí P, chia cho tổng đơn đã giao trong ván. Đơn đang mang/chưa giao chưa được tính; chỉ số này không đo thị phần của doanh nghiệp thật.

## Giới hạn bàn giao

Bản local cần cả website và service realtime. `127.0.0.1` chỉ dùng trên chính máy đang chạy server. Chưa kiểm chứng26 laptop thật trên Wi‑Fi lớp; cần diễn tập trước buổi học. Xem `deployment.md` để cấu hình địa chỉ dùng chung.
