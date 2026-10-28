# Cuộc đua giành khách — điều chỉnh nguồn hàng và khách trung tâm

Ngày: 28/10/2026. Trạng thái: người dùng đã duyệt toàn bộ bản thiết kế; đã triển khai, kiểm chứng và bàn giao local tại checkout chính. Xem `../../arcade/order-flow-v2-verification.md` cho bằng chứng và lỗi quiz40 người có từ trước còn tồn tại.

## Mục tiêu

Tạo tranh giành và va chạm ở khu giao hàng trung tâm, đồng thời làm nguồn hàng công khai có thời gian hồi dễ hiểu và kênh riêng có ích khi gom hàng. Tiếp tục dùng Phaser và máy chủ điều khiển luật chơi hiện có.

## Những lựa chọn đã trao đổi

- Cách cũ dồn vị trí nhận hàng về giữa từ phút thứ 3 không diễn đạt rõ ý người dùng.
- Cách người dùng chọn là giữ các điểm nhận hàng, thêm khách ở trung tâm và đưa phần lớn đích giao về đó. Người dùng muốn chỉ khoảng 10–20% đơn công khai mới giao về hai bên.
- Mốc triển khai đề xuất trong khoảng đó: **85% trung tâm, 15% hai bên**; thêm **3 khách** trong khoảng 2–3 khách đã trao đổi. Hai con số cụ thể này là lựa chọn của người thiết kế để người dùng duyệt.

## 1. Hàng công khai thường: hồi riêng từng điểm

- Mỗi điểm nhận hàng có tối đa 1 kiện thường đang chờ. Đầu lượt luyện tập và sau khi đặt lại ở giây 60, mỗi điểm có sẵn 1 kiện.
- Khi kiện được nhặt, chính điểm đó bắt đầu hồi **45 giây** rồi xuất hiện 1 kiện mới tại đúng vị trí đó. Không chờ giao thành công.
- Các điểm có đồng hồ độc lập; không còn bù hàng theo tổng số kiện đang chờ của cả phòng và không chuyển điểm nhận về giữa từ phút thứ 3.
- Đơn đã nhặt, giao hoặc bỏ không làm sinh thêm kiện ngoài lịch của điểm đó. Kiện không được nhặt tiếp tục nằm chờ.
- Khuyến mãi vẫn tốn 8 xu, tạo 3 kiện công khai theo lịch hiện có và hồi kỹ năng 45 giây. Những kiện bổ sung này không chiếm chỗ hoặc đặt lại thời gian hồi của điểm thường.

## 2. Khách trung tâm và tỷ lệ giao hàng

- Từ mốc **3:00 tính từ lúc MC bắt đầu**, thêm 3 khách nhận hàng tại khu trung tâm ở bờ đối diện các điểm nhận hàng, gần hướng ra của cổng P. Vẫn có thể đi cầu vòng miễn phí hoặc lối chung để tới đây.
- Khách cũ được giữ để hoàn tất các đơn trước đó. Trước 3:00, đơn mới dùng các điểm giao cũ.
- Từ 3:00, **đơn công khai mới**, gồm đơn thường và khuyến mãi, nhận đích giao theo tỷ lệ 85% khách trung tâm, 15% khách ở hai bên. Tỷ lệ này áp dụng cho **đích giao**, không áp dụng cho vị trí xuất hiện kiện hàng.
- Đề xuất phân phối có kiểm soát: trong mỗi 20 đơn công khai mới sau mốc 3:00, có 17 đơn giao trung tâm và 3 đơn giao hai bên, xếp xen kẽ. Chia lần lượt giữa 3 khách trung tâm; phần hai bên luân phiên trái/phải. Bộ đếm này độc lập với đơn riêng và lịch hồi của từng điểm.
- Tỷ lệ là tỷ lệ đơn được tạo, không phải tỷ lệ đơn đã giao; với ít đơn thì tỷ lệ quan sát có thể lệch. Những đơn đã tồn tại ở 3:00 giữ nguyên đích giao.
- Mỗi khách nhận được nhiều kiện khác nhau từ nhiều người chơi. Khi đủ gần, mỗi người nhấn E giao kiện của mình; giao trước không làm mất quyền giao của người khác. Vẫn giữ va chạm giữa người chơi.

## 3. Kênh riêng: kho 2 kiện, mang tối đa 2 kiện riêng

- Giữ giá mở kênh 40 xu, giá trị 8 xu/kiện. Kiện đầu xuất hiện sau 20 giây kể từ khi mở kênh.
- Mỗi lần sinh chỉ thêm **1 kiện**, các lần sinh cách nhau ít nhất **20 giây**; tích tối đa **2 kiện riêng chưa được nhặt**. Kho đầy thì không tích một loạt lần sinh để bù hàng dồn dập khi lấy hàng.
- Người chơi mang tối đa **2 kiện riêng của mình**, hoặc **1 kiện công khai**. Đề xuất không trộn đơn công khai và đơn riêng trong cùng chuyến để giữ thao tác đơn giản.
- Đề xuất mỗi lần nhấn E nhận 1 kiện; nhấn lần nữa để nhận kiện riêng thứ hai nếu có. Giữ tuyến giao gần tiệm hiện có; đơn riêng không thuộc tỷ lệ 85/15.
- Đề xuất mỗi lần nhấn E giao 1 kiện phù hợp với điểm giao; nếu cả hai kiện có cùng đích, nhấn E hai lần. Mỗi kiện chỉ thanh toán một lần.
- Người khác vẫn không nhìn thấy hoặc nhận được kiện riêng. Đề xuất giữ E 1 giây tại tiệm để bỏ toàn bộ hàng đang mang, không nhận xu.
- Phí P áp dụng riêng từng kiện đang mang và chỉ ghi nhận một lần cho mỗi kiện khi đi qua cổng. Nếu mang 2 kiện riêng chưa ghi phí qua P lúc phí là 4 xu, tổng phí là 8 xu; đi lại qua cổng không thu thêm trên các kiện đó. Kiện đã mang qua trước khi nhặt kiện thứ hai giữ nguyên phí riêng của nó.

## 4. Hiển thị và thao tác

- Thông báo trước mốc 3:00 nói rõ khách trung tâm sắp đến; lúc xuất hiện có dấu hiệu dễ thấy. Các khách trung tâm được bố trí đủ cách nhau để nhận diện và tiếp cận.
- Điểm nhận công khai hết hàng hiển thị số giây còn lại tới đợt hàng mới.
- Kho riêng và hàng đang mang có chỉ báo số lượng riêng biệt, chẳng hạn kho 2/2, đang mang 1/2. Không dùng một biểu tượng kiện hàng để ngầm đại diện cho hai kiện mà không có số đếm.
- Đơn thường, đơn khuyến mãi và đơn riêng có nhãn hoặc dấu hiệu phân biệt. Chỉ dẫn giao hàng, số xu thực nhận, phí và hình kiện đang mang phản ánh đủ số kiện.
- Mã máy chủ chịu trách nhiệm hồi hàng, sức chứa, quyền sở hữu, đích giao và thanh toán. Trạng thái gửi tới từng người tiếp tục bảo vệ thông tin đơn riêng.

## Giữ nguyên và giới hạn

Giữ các mốc luyện tập/đặt lại, phút 6 tăng phí P, phút 9 khóa điểm, phút 10 kết thúc; di chuyển, xô đẩy, kết nối lại, vai trò MC, cầu miễn phí và góp lối chung. Tạm dừng đóng băng các đồng hồ mới như các đồng hồ hiện có. Chưa tăng thưởng đơn hoặc thay giá nâng cấp. Nhịp 45/20 giây là cấu hình để chơi thử, chưa khẳng định đã cân bằng.

Không tự di chuyển các kiện cũ hoặc đổi đích của kiện đang mang khi sang chặng. Phòng đã chạy theo cấu trúc cũ cần được nhận diện rõ khi triển khai; đề xuất chỉ bắt đầu luật mới trong ván mới, không âm thầm đặt lại một trận đang chơi.

## Kiểm chứng cần có khi triển khai

- Hai điểm bị lấy lệch thời gian hồi đúng 45 giây độc lập; giao hàng không ảnh hưởng thời gian hồi; không xuất hiện kiện thứ hai cùng chỗ.
- Kho riêng không sinh trước 20 giây, chỉ sinh 1/lần và không vượt 2 kiện chờ; tải tối đa 2 kiện riêng, không trộn hàng; quyền sở hữu được kiểm tra trên máy chủ.
- Hai kiện được giao, bỏ và ghi phí riêng chính xác; không trả tiền hai lần khi gửi lại thao tác hoặc kết nối lại.
- Khách xuất hiện đúng 3:00; các đích giao cũ được giữ; 20 đơn công khai mới có 17 đích trung tâm và 3 đích hai bên; đơn riêng không ảnh hưởng phân phối.
- Hai người giao các kiện khác nhau tới cùng một khách đều nhận đúng xu.
- Chơi thử thực tế để kiểm tra thời gian đứng chờ, lợi thế kênh riêng, mật độ va chạm và khả năng đọc thông tin trên laptop.

Các kiểm thử nghiệm thu cũ được giữ làm bằng chứng của bản trước; các hợp đồng đã thay đổi (một kiện mang theo, kho riêng một kiện, lịch bù đơn công khai) phải được ghi rõ là được thay thế, không sửa ngầm kiểm thử độc lập cũ để hợp thức hóa luật mới.
