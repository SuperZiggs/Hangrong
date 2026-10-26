# Cuộc đua giành khách — thiết kế game hành động trên laptop

Ngày: 27/10/2026.
Trạng thái: bản thiết kế để người dùng xem xét trước khi lập kế hoạch triển khai; chưa phải ứng dụng đã được xây dựng hoặc chơi thử.

## 1. Mục tiêu và cơ sở

Tạo game giải trí cuối bài thuyết trình Kinh tế chính trị Mác – Lênin. Người chơi điều khiển nhân vật trong một thành phố chung, tranh đơn hàng, chọn đường, cản nhau và kiếm xu. Nền tảng hư cấu P kiểm soát một tuyến thuận tiện cùng một phần luồng đơn hàng, tạo tình huống minh họa quyền kiểm soát điểm vào, sự tập trung giao dịch và rủi ro phụ thuộc.

Thành công: người mới hiểu vòng chơi bằng một lần chạy thử; trong trận họ dành thời gian di chuyển, tương tác và phản ứng với người khác; diễn biến tạo ra các khoảnh khắc vượt hạng nhìn thấy được trên máy chiếu. Một phút cuối dành để gọi tên các cơ chế kinh tế vừa trải nghiệm.

Nguồn nội dung đã xem:

- `E:/MLN122/ND/đề.png`.
- `E:/MLN122/ND/Biểu hiện mới của độc quyền ngày nay cơ sở lý luận và trường hợp Alphabet (Google)(updated).md`.
- `E:/MLN122/ND/thuyết trình .pptx`, nhất là kiểm soát điểm vào, vòng lặp tự củng cố, tác động đến doanh nghiệp nhỏ và giải pháp giữ quyền chủ động.
- `E:/MLN122/web-game/docs/classroom-runbook.md` và `flexible-participation-requirements.md` cho bối cảnh tổ chức hiện tại, không dùng cấu trúc câu hỏi làm cơ chế của game mới.

Game là mô hình hư cấu, không tái hiện một vụ việc pháp lý hoặc khẳng định mọi nền tảng lớn đều có hành vi giống P. Không cố đưa đủ năm biểu hiện lý luận vào một ván ngắn. Va chạm giữa nhân vật là cơ chế giải trí, không tự nó đại diện cho một kết luận về độc quyền.

## 2. Quyết định đã có và phần người thiết kế đề xuất

Người dùng đã xác nhận trong cuộc trao đổi hiện tại:

- Muốn một game để trực tiếp chơi và tương tác, thay cho chủ yếu trả lời câu hỏi.
- Chọn phát triển ý tưởng Cuộc đua giành khách.
- Lớp phần lớn dùng laptop; ưu tiên thao tác hơn quản lý chiến thuật.
- Muốn người chơi có thể trở thành vật cản của nhau.
- Đồng ý với mô tả va chạm, tranh đường và lướt xô nhẹ được trình bày trước đó.

Các mục sau là lựa chọn thiết kế đề xuất, chưa được coi là yêu cầu riêng do người dùng đặt ra:

- Ván khoảng 10 phút, gồm chạy thử, tám phút thi đấu và một phút chốt.
- Mỗi thiết bị điều khiển một nhân vật; có thể đại diện cá nhân hoặc nhóm. Giữ ngưỡng bắt đầu tối thiểu 3 người tham gia từ sản phẩm hiện tại; không quay lại giới hạn cố định sáu nhóm.
- Chơi trực tuyến trong cùng phòng, có màn MC/máy chiếu; mục tiêu kiểm tra quy mô lớp khoảng 26 thiết bị, không hứa dung lượng không giới hạn.
- Va chạm giữ nguyên đơn hàng; không có máu, chết hoặc loại khỏi ván.
- Các con số về xu, phí, tốc độ và hồi kỹ năng dưới đây là thông số khởi đầu để cân chỉnh, không phải kết quả cân bằng đã được kiểm chứng.

## 3. Các hướng đã cân nhắc

| Hướng | Lợi ích | Đánh đổi | Kết quả trao đổi |
| --- | --- | --- | --- |
| Hành động bằng bàn phím | Di chuyển liên tục, tranh đường, dễ nhìn trên máy chiếu | Cần đồng bộ vị trí và va chạm tốt; kỹ năng điều khiển ảnh hưởng thành tích | Người dùng nghiêng về hướng này và đồng ý bổ sung cản đường |
| Điều khiển nhẹ, chiến thuật là chính | Dễ để cả nhóm bàn bạc; quyết định đầu tư nổi bật | Có nguy cơ quay lại cảm giác chọn phương án, chậm nhịp giải trí | Không dùng làm hướng chính |
| Giữ game câu hỏi và thêm hiệu ứng | Tận dụng nhiều phần sẵn có | Không giải quyết đúng điều người dùng muốn thay đổi | Không dùng làm vòng chơi mới |

Bản đầu giữ hành động là chính, chỉ dùng một tài nguyên tiền xu và ít lựa chọn phát triển. Không thêm quản lý tồn kho, nhân công, bảng chỉ số phức tạp hoặc câu hỏi bắt buộc giữa trận.

## 4. Vòng chơi và điều khiển

1. Đơn công khai xuất hiện ở các điểm nhận hàng trung lập trên bản đồ. Biểu tượng cho biết giá trị và khu vực giao.
2. Người chơi chạy tới, nhấn E để nhận đơn còn trống. Một đơn chỉ được cấp cho một người; mỗi người mang tối đa một đơn.
3. Đi tới khách được đánh dấu, tự chọn tuyến, tránh hoặc cản các nhân vật khác.
4. Nhấn E trong vùng giao để hoàn thành; hệ thống trả xu sau khoản phí đã ghi nhận của chuyến đó.
5. Tìm đơn mới hoặc ghé cửa hàng/trạm tương tác để đầu tư. Hành động của người khác có thể làm lựa chọn hiện tại kém thuận lợi hơn.

| Phím | Tác dụng |
| --- | --- |
| WASD hoặc mũi tên | Di chuyển theo hướng nhấn; đi chéo không nhanh hơn đi thẳng |
| E | Tương tác với mục tiêu được tô sáng trong phạm vi gần: nhận, giao hoặc xác nhận khoản đầu tư tại trạm |
| Space | Lướt ngắn theo hướng di chuyển, có thời gian hồi |

Không cần chuột trong phần hành động chính. Hướng dẫn hiện bằng một dòng ngắn, nút E chỉ rõ đối tượng đang được chọn. Nếu nhiều đối tượng ở gần, ưu tiên giao đơn đang mang, sau đó nhận đơn, sau đó trạm đầu tư; người chơi thấy trước hành động được thực hiện.

Người chơi có thể bỏ đơn đang mang bằng một thao tác giữ E tại cửa hàng của mình để nhận đơn khác, không được nhận tiền. Hành động này chỉ khả dụng khi đứng ở cửa hàng và có hướng dẫn rõ, không làm nhấn E giao hàng bình thường vô tình bỏ đơn. Đơn bị bỏ được hủy, hệ thống bổ sung đơn mới theo quy tắc sinh chung.

## 5. Bản đồ và va chạm

Thành phố có các cụm điểm nhận/giao hàng, khu cửa hàng, tuyến P thuận tiện, đường vòng rộng hơn và một tuyến chung có thể mở. Mỗi người có cửa hàng được đánh dấu bằng màu riêng; điểm xuất phát được bố trí theo cấu trúc đối xứng hoặc theo các vị trí có quãng đường tới đơn đầu tương đương.

Các đoạn cầu, ngã tư và cổng tạo cơ hội chặn đường. Mỗi nút quan trọng có ít nhất một phương án đi khác; điểm nhận/giao có vùng tiếp cận đủ rộng, không thể khóa toàn bộ chỉ bằng một nhân vật đứng yên. Không tạo ngõ cụt bắt người chơi phải chờ đối thủ tự rời đi.

Va chạm đề xuất:

- Nhân vật có thân va chạm, không đi xuyên nhau trong điều kiện bình thường. Tiếp xúc khi đi thường làm chậm và đẩy nhẹ; không làm mất xu hay rơi hàng.
- Space tạo một lượt lướt ngắn. Va vào người khác truyền lực đẩy giới hạn; không xuyên tường, cổng đóng hoặc làm nhân vật văng khỏi khu vực chơi.
- Thông số khởi đầu: lượt lướt khoảng 0,2 giây, hồi khoảng 4 giây, người vừa bị đẩy có khoảng 1 giây miễn lực đẩy tiếp theo. Trong khoảng này họ vẫn có thân va chạm; hiệu ứng màu cho biết trạng thái bảo vệ.
- Khi không nhấn hướng, Space dùng hướng quay gần nhất. Giữ phím không tạo vô hạn lệnh lướt hoặc tương tác.
- Không cộng điểm trực tiếp cho việc đẩy/cản. Lợi ích đến từ tranh tuyến và cơ hội giao hàng; đứng chặn cũng mất thời gian kiếm tiền của chính mình.
- Người chơi không bị loại; đối thủ đông người vẫn phải có phương án thoát qua thiết kế đường và giới hạn lực đẩy.

Quy mô bản đồ, số điểm đơn và bề rộng đường phải thích ứng với số người trước khi bắt đầu, thay vì nhét 26 người vào bố cục dành cho sáu. Giới hạn đồng thời cao hơn chỉ được quyết định sau thử tải. Mỗi bản đồ trong cùng ván được khóa từ đầu, không thay kích thước giữa trận.

## 6. Tiền xu, nền tảng P và phát triển cửa hàng

Một tài nguyên duy nhất là xu. Mọi người bắt đầu phần tính điểm với cùng 20 xu. Đơn thường trả 10 xu; thông số này có thể đổi sau chơi thử.

Tuyến P là đường tắt thuận tiện, có phí. Đi đường ngoài P mất nhiều thời gian hơn nhưng không mất phí tuyến này. Phí chuyến được ghi khi đi qua cổng đang mở và được trừ vào tiền giao hàng; mức phí và tiền thực nhận hiện rõ trước khi qua cổng. Một đơn chịu phí P tối đa một lần, đi vòng hoặc đi qua lại không bị trừ thêm. Phí đã ghi cho đơn không đổi khi bảng phí toàn phòng đổi. Đơn chưa giao không tạo khoản tiền thưởng hoặc nợ; người hết tiền vẫn có thể tiếp tục nhận và giao đơn.

Nền tảng P có luồng đơn công khai theo thuật toán mô phỏng. Mức tập trung giao dịch được hiển thị từ giao dịch đã thực sự đi qua P; đây là chỉ báo của ván chơi, không phải chỉ số đo lường doanh nghiệp thật. Việc luồng đơn đổi và phí tăng là các sự kiện công khai theo chặng để có thể giải thích, không phải MC tùy ý nhắm vào người dẫn đầu.

Hai khoản phát triển cá nhân:

- **Khuyến mãi:** dùng 8 xu tại trạm cửa hàng để tạo một đợt ba đơn công khai quanh khu của mình trong khoảng 20 giây; mỗi đợt có thời gian hồi khoảng 45 giây. Đối thủ cũng nhận được các đơn chưa ai nhận. Đơn khuyến mãi có cùng quy tắc giao/phí với đơn thường; không nhân tiền thưởng và không lấy lại đơn đã được người khác nhận.
- **Kênh riêng:** dùng 40 xu, mở một lần, để tạo dòng đơn riêng giá trị khởi đầu 8 xu. Tối đa một đơn riêng đang chờ, sinh không nhanh hơn một đơn mỗi 20 giây; chỉ chủ cửa hàng nhận được. Địa điểm giao ở khu ngoại vi, tạo phương án ít phụ thuộc khu trung tâm. Chủ vẫn mang tối đa một đơn kể cả đơn riêng; đi qua P vẫn áp dụng phí tuyến theo cùng quy tắc.

Một khoản phát triển chung:

- **Mở lối chung:** dự án một lần của cả phòng, giá khởi đầu bằng 12 xu nhân số người tham gia đã chốt. Người chơi ghé trạm và đóng góp theo nấc 5 xu hoặc phần còn thiếu nếu thấp hơn. Không đóng quá số dư và không thu dư mức mục tiêu. Khi đủ, tuyến mở cho tất cả, không thu phí P. Khoản đóng góp không được hoàn tiền và không cộng điểm riêng. Các lần góp đồng thời phải được xử lý thống nhất, không trừ tiền hai lần hoặc lấy thừa.

Chỉ hiển thị khoản đầu tư của trạm đang đứng gần, cùng giá và nút E; không phủ nhiều menu lên màn hình lúc chạy. Việc đầu tư chỉ diễn ra khi nhân vật thực sự đứng trong vùng tương tác, không chặn toàn bộ trận. Thống kê đóng góp có thể nhận danh hiệu phụ, không thay đổi thứ hạng tiền xu.

Không giả định một lựa chọn luôn tốt nhất: cần chơi thử để tuyến P vẫn có giá trị về tốc độ/lượng đơn, kênh riêng có thể thu hồi vốn nếu mở đủ sớm, và mở lối chung đem lại lựa chọn thật. Nếu một chiến thuật áp đảo bất kể đối thủ, điều chỉnh giá, khoảng cách hoặc nhịp đơn trước phát hành.

## 7. Nhịp ván khoảng 10 phút

Vào phòng và phổ biến luật ở ngoài khung này. MC có thể tạm dừng; khi đó thời gian thực tăng bằng thời gian dừng.

| Đồng hồ trận | Trạng thái |
| --- | --- |
| 0:00–1:00 | Chạy thử nhận/giao và va chạm. Kết thúc chạy thử đặt lại xu, đơn, nâng cấp, vị trí và hồi kỹ năng của tất cả; không tính kết quả thử |
| 1:00–3:00 | Thi đấu chặng 1: P thuận tiện, phí khởi đầu 2 xu/đơn; mọi người kiếm tiền và làm quen đối thủ |
| 3:00–6:00 | Chặng 2: luồng đơn mới tập trung hơn vào khu trung tâm. Đầu tư cá nhân/chung đã có thể sử dụng từ đầu phần thi đấu; chặng này không bất ngờ mở menu bắt buộc |
| 6:00–9:00 | Chặng 3: phí P tăng lên 4 xu/đơn mới đi qua cổng; tuyến và nâng cấp đã xây được giữ nguyên. Tranh đường và thay tuyến quyết định cơ hội cuối |
| 9:00–10:00 | Đóng phần tính điểm, hiện kết quả và MC chốt bài; màn kết quả tiếp tục hiện sau phút này |

Đổi chặng không đặt lại thế giới. Các sự kiện báo trước khoảng 10 giây bằng câu ngắn, âm báo và biểu tượng; không bắt dừng đọc. Biến đổi phân phối chỉ tác động đơn sinh mới, không hủy hay dời đơn đã nhận. Phí khởi đầu và lần đổi phí được giải thích trong chạy thử, không giấu như bẫy bất ngờ.

Không dùng nhân đôi điểm phút cuối hoặc sự kiện ngẫu nhiên đổi thẳng xu. Có thể thêm đợt đơn cao điểm trong chặng cuối nếu thử nghiệm cho thấy bản đồ bị vắng; bản đầu không phụ thuộc tính năng này.

## 8. Sinh đơn, điểm và chiến thắng

- Đơn có vị trí lấy, vị trí giao, giá trị và chủ sở hữu sau khi nhận. Đơn công khai được sinh luân phiên theo các cụm bản đồ với seed của phòng; không ưu ái tên người, thứ hạng hoặc một cửa hàng cụ thể.
- Mật độ đơn tăng theo số người, có giới hạn số đơn chờ và số đơn đang mang để kiểm soát tải. Thông số cụ thể thuộc cân chỉnh bản đồ, phải tránh một người vừa giao xong luôn có sẵn đơn ngay dưới chân.
- Nhiều người bấm nhận cùng một đơn: chỉ một người nhận thành công, những người còn lại thấy trạng thái đã có người nhận ngay khi cập nhật; không mất xu vì yêu cầu thất bại.
- Giao xong mới trả xu, đúng một lần. Tiêu xu cho đầu tư làm giảm số xu đang giữ; không hoàn vốn giả khi hết trận. Việc mua sớm/muộn là một phần quyết định của người chơi.
- Hết 9:00, hệ thống khóa hành động tính điểm theo cùng một đồng hồ. Đơn chưa giao không cộng tiền; một yêu cầu đến sau hạn không được tính chỉ vì máy người chơi còn hiện đang chạy.
- Xếp hạng theo số xu còn lại, cao hơn đứng trước. Đồng xu cùng hạng, không phân thắng bằng ping hoặc bốc thăm.
- Thống kê phụ: đơn đã giao, phí P đã trả, số xu góp tuyến chung, có mở kênh riêng hay chưa. Các danh hiệu phụ không sửa điểm chính.
- Kết quả là thành tích trong một game mô phỏng; không dùng nó làm điểm kiến thức hay khẳng định ai hiểu lý luận hơn.

## 9. Màn hình và tổ chức lớp

Màn laptop: camera giữ nhân vật mình dễ thấy, bản đồ nhỏ hoặc chỉ hướng cho khách đang giao, xu, tiền thực nhận của đơn, hồi Space, đồng hồ và thông báo sự kiện ngắn. Tên/màu/biểu tượng giúp nhận diện; không chỉ dùng màu để phân biệt. Lựa chọn camera chi tiết thuộc người xây dựng nhưng phải thấy trước đủ đường để né/cản, không che đối thủ bằng UI.

Màn máy chiếu: toàn cảnh hoặc góc tổng quan đủ nhận ra các nút tranh chấp, bảng thứ hạng gọn, đồng hồ, sự kiện và tiến độ mở lối chung. Không cần đọc toàn bộ văn bản từ máy chiếu mới điều khiển được.

Màn MC: sảnh, tên và trạng thái kết nối, bắt đầu, tạm dừng/tiếp tục, kết thúc và chơi lại. MC không trực tiếp điều khiển P để ưu ái một người. Chơi lại giữ người tham gia còn ở phòng nhưng tạo ván và seed mới, xóa xu/nâng cấp của ván cũ theo luật khởi tạo.

Solo và nhóm cùng dùng một nhân vật/thiết bị, cùng xuất phát và luật điểm; không nhân xu theo số người trong nhóm. Không bổ sung người chơi mới khi trận đã bắt đầu; người đã có phiên được kết nối lại.

## 10. Đồng bộ nhiều người và tích hợp

Đây là game hành động trực tuyến có vị trí và va chạm, không thể mặc định dùng nhịp đồng bộ của game trả lời câu hỏi hiện có. Trước triển khai đầy đủ cần chứng minh một bản thử tối thiểu với di chuyển, xô đẩy và quy mô lớp dự kiến. Công nghệ cụ thể do bước lập kế hoạch chọn sau khi kiểm tra môi trường hosting; không coi hạ tầng hiện tại đã đáp ứng.

Các ràng buộc cho người xây dựng:

- Một máy chủ có thẩm quyền xác nhận vị trí hợp lệ, va chạm, lượt lướt, đơn, xu, phí, thời hạn và góp vốn. Client gửi thao tác; không được tự quyết xu hoặc nhận đơn hai lần.
- Tách cập nhật hành động thời gian thực khỏi lưu dữ liệu lâu dài. Không ghi cơ sở dữ liệu bền vững từng khung hình của mọi nhân vật.
- Client có thể dự đoán/làm mượt hình ảnh nhưng phải hòa giải với trạng thái chung. Không lấy FPS máy người chơi làm tốc độ di chuyển.
- Đánh giá bằng độ trễ input, độ lệch vị trí, nhận/giao đồng thời và xô đẩy ở quy mô mục tiêu; không coi số phiên trình duyệt đứng trong sảnh là thử tải game hành động.
- Khi mất input, nhân vật dừng; khi mất kết nối khoảng 3 giây, thân không còn chặn người khác. Xu và đơn đã xác nhận được giữ. Kết nối lại trở về vị trí hợp lệ gần vị trí cuối, không tự dịch chuyển tới cửa hàng hay giao đơn hộ; tránh cho reload thành đường tắt.
- Khi MC tạm dừng, đồng hồ sự kiện, di chuyển, lực đẩy, hồi kỹ năng, sinh đơn và tính xu đều dừng. Tiếp tục không tạo một đợt sinh đơn bù hoặc lực đẩy dồn.
- Phân quyền MC/người chơi, phục hồi phiên, tách phòng và yêu cầu lặp lại phải giữ được tính đúng đắn. Mất focus/tab phải ngừng phím đang giữ để không tạo nhân vật tự chạy.
- Bản đầu không yêu cầu phục hồi một trận hành động đang chạy sau khi máy chủ mất toàn bộ trạng thái. Khi lỗi loại này xảy ra phải báo rõ trận gián đoạn và cho MC mở ván mới; không công bố bảng điểm một phần như kết quả hoàn tất. Phải ưu tiên xử lý kết nối lại trước khi coi là sự cố mất trạng thái.

Đề xuất tích hợp trong dự án `web-game` thành chế độ mới, tận dụng sảnh/nhận diện/MC khi phù hợp. Giữ nguyên nội dung, dữ liệu và khả năng mở game câu hỏi hiện có trong thời gian phát triển; không đổi ứng dụng công khai hoặc xóa phòng đang tồn tại để làm bản thử. Các quyết định về phát hành thuộc bước tiếp theo, chưa thực hiện trong tài liệu này.

## 11. Phạm vi bản đầu và giới hạn

Bao gồm: sảnh nhiều người, điều khiển bàn phím, nhận/giao đơn, thân va chạm và lướt xô, tuyến P có phí, đường ngoài P, ít khoản phát triển nêu trên, chặng và sự kiện, bảng xếp hạng, màn MC, phục hồi kết nối thông thường.

Chưa cần: tài khoản cá nhân, chat, AI runtime, thanh toán, bản đồ do người dùng tạo, nhiều loại nhân vật có chỉ số khác nhau, vũ khí, máu, cướp đơn đã nhận, nhiều nhân công, chế độ thi kiến thức, lịch sử xếp hạng toàn cầu.

Phong cách đề xuất: 2D nhìn từ trên, nhân vật rõ hình khối, màu vui, ít chữ; nền đủ đơn giản để thấy đường và người cản. Ưu tiên khả năng đọc và phản hồi thao tác hơn trang trí. Hướng hình ảnh cụ thể do người xây dựng đề xuất trước khi sản xuất tài nguyên.

## 12. Điều kiện kiểm tra trước khi dùng trong lớp

1. Người mới hoàn thành được một đơn trong chạy thử chỉ với hướng dẫn trên màn hình.
2. WASD/mũi tên, E, Space hoạt động trên laptop; focus, giữ phím và chuyển tab không gây lướt lặp hay tự chạy.
3. Hai người không thể nhận hoặc được trả tiền cho cùng một đơn; nhiều đóng góp đồng thời không làm hụt tiền hoặc thu vượt giá mở lối.
4. Đi chéo không nhanh hơn, FPS khác nhau không đổi tốc độ, client không thể tự tăng xu/di chuyển xuyên bản đồ.
5. Thân va chạm, xô nhẹ, khoảng bảo vệ và đường thay thế cho phép thoát khi bị chặn; không xuyên tường hoặc kẹt vĩnh viễn tại điểm giao.
6. Mọi người thấy thống nhất ai đang mang đơn, tuyến đã mở, mức phí và kết quả. Thử nhận đơn cùng lúc, đẩy liên tiếp, mất mạng rồi quay lại và tạm dừng giữa lượt lướt.
7. Kiểm tra ít nhất các phòng 3, 6 và khoảng 26 nhân vật đang thực sự di chuyển/giao/xô; diễn tập thêm trên mạng lớp với laptop thực. Nếu không đạt quy mô mục tiêu phải báo giới hạn và giải pháp trước khi dùng, không âm thầm áp trần sáu.
8. Chạy đủ ván với đồng hồ; kết quả chạy thử được đặt lại, đổi chặng không mất tiến độ, phí đã ghi không đổi hồi tố và hết giờ không nhận giao hàng muộn.
9. Chơi thử để đo số đơn/người, thời gian bị cản, chênh lệch xu và mức sử dụng các tuyến; điều chỉnh nếu một chiến thuật luôn thắng hoặc người mới thường xuyên không thể tham gia.
10. Rà nội dung chốt: tiện ích và rủi ro phụ thuộc cùng tồn tại; kênh riêng không mặc định luôn tốt nhất; cản đường không phải một câu định nghĩa độc quyền; không suy diễn kết luận pháp lý về doanh nghiệp thật từ luật hư cấu.

## 13. Phần chốt của MC

Trong khoảng một phút cuối, chỉ vào những gì vừa xảy ra:

- Cổng P: một bên nắm tuyến tiếp cận thuận tiện và điều kiện sử dụng.
- Giao dịch và đơn tập trung: vòng lặp có thể khiến khu vực/nền tảng càng hấp dẫn.
- Phí và phân phối đơn đổi: bên phụ thuộc phải điều chỉnh theo luật do bên khác đặt.
- Kênh riêng và lối chung: các phương án tăng quyền lựa chọn, cũng có chi phí và đánh đổi.

Lời chốt đề xuất: “P giúp các cửa hàng kiếm khách và giao nhanh, nên mọi người có lý do để sử dụng. Nhưng khi nhiều hoạt động cùng phụ thuộc vào một tuyến, thay đổi phí hay cách phân phối có thể ảnh hưởng lớn. Điều cần là hiểu cơ chế, tận dụng cơ hội và giữ khả năng lựa chọn.”

## 14. Handoff

Đây là bản đặc tả hành vi và trải nghiệm. Chưa có mã game hành động, bản demo, kết quả thử tải hoặc bằng chứng cân bằng. Sau khi người dùng xem và duyệt bản này, lập kế hoạch thực hiện theo thứ tự: kiểm chứng khả năng đồng bộ hành động trên môi trường phù hợp; vòng chơi tối thiểu; phát triển nền tảng/kinh tế; hoàn thiện tổ chức lớp và chơi thử. Kế hoạch phải ghi rõ những phần có thể tái sử dụng từ dự án hiện tại và phần phải thay đổi.
