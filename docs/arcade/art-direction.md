# Cuộc đua giành khách — hướng hình ảnh và bộ asset

Ngày: 27/10/2026. Trạng thái: đặc tả sản xuất asset, chưa phải bộ hình ảnh đã tạo.

Thiết kế gameplay: [game design](2026-10-27-cuoc-dua-gianh-khach-design.md).
Danh mục máy đọc được: [asset catalogue](../plans/2026-10-27-cuoc-dua-gianh-khach-assets.json).

## 1. Hướng hình ảnh đề xuất

Một thành phố đồ chơi nhiều màu, nhìn từ trên xuống theo phép chiếu trực giao; nhân vật chibi có đầu lớn, thân nhỏ, bóng mềm và chuyển động nảy nhẹ. Cảm giác hội chợ giao hàng, vui và nhanh. Đây là lựa chọn của người thiết kế để đáp ứng yêu cầu bắt mắt; không phải phong cách đã được người dùng xác nhận riêng.

Nhân vật chính đề xuất là robot bưu tá đồ chơi: mũ giao hàng, thân tròn, mặt kính với mắt rõ, túi nhỏ và bộ vỏ trung tính có thể tint trong renderer. Cùng một bộ chuyển động phục vụ mọi người, tám màu kết hợp bốn hình dấu chân và nhãn số/tên phân biệt ít nhất 26 nhân vật. Màu và trang phục không thay đổi tốc độ hoặc thân va chạm. Không cần tạo 26 spritesheet độc lập.

Tất cả tài nguyên dùng cùng góc nhìn, hướng sáng trên trái, viền mực xanh đậm vừa phải và chất liệu mịn. Mặt đất ít chi tiết hơn vật tương tác. Dùng sprite sắp xếp theo vị trí chân để tạo chiều sâu; mô phỏng vẫn là mặt phẳng 2D, không dựng thế giới isometric hoặc 3D.

| Vai trò | Màu đề xuất |
| --- | --- |
| Nền kem | `#FFF4DB` |
| Mực/chữ chính | `#183C48` |
| Tuyến và thương hiệu P | `#5964D8` |
| Giao thành công/kênh riêng | `#18A999` |
| Tiền và điểm đến | `#FFC857` |
| Va chạm/cảnh báo ngắn | `#F26B5E` |
| Mặt đường | `#E3D5BD` |
| Nước/kênh | `#8ED4E5` |

Trạng thái luôn có biểu tượng hoặc chữ ngắn ngoài màu. P có hình cổng và chữ P giả tưởng; không dùng logo Google, ảnh lãnh đạo, huy hiệu chính trị hoặc nhãn pháp lý để gợi ý đây là tái hiện doanh nghiệp thật.

## 2. Ngôn ngữ UI

- Tiêu đề: Baloo 2; nội dung và chữ số: Be Vietnam Pro. Host và HUD dùng chữ tiếng Việt thật trong DOM, không bake chữ dài vào ảnh. Tự lưu font kèm giấy phép khi triển khai.
- Bề mặt: biển hiệu phố, thẻ giấy bo nhẹ, nút dày có bóng ngắn; không dùng lưới card dashboard bao quanh sân chơi.
- Laptop 1366×768 là kích thước thiết kế chính; kiểm tra thêm 1280×720, 1920×1080 và zoom trình duyệt 125%. Canvas chiếm phần lớn màn hình, HUD thường trực mục tiêu không quá 20% diện tích.
- Cụm chính ở góc trên trái: xu, đơn đang mang và thực nhận sau phí. Góc trên phải: đồng hồ và thứ hạng gọn. Hồi Space thể hiện bằng vòng quanh biểu tượng hoặc nhân vật; gợi ý E chỉ xuất hiện khi đứng gần mục tiêu.
- Giữa màn hình và lối chạy phía dưới giữ thoáng. Bảng thứ hạng đầy đủ, hướng dẫn dài và cài đặt nằm sau phím Tab hoặc menu. Mở menu chặn thao tác của nhân vật cục bộ, không tự dừng cả phòng.
- Các overlay có kiểu riêng: đang tải, sảnh, chạy thử, báo trước đổi luật, tạm dừng, đang kết nối lại, trận gián đoạn và kết quả. Không dùng cùng một modal generic cho tất cả.
- Màn MC mặc định có toàn cảnh, bảng top gọn và tiến độ lối chung; danh sách 26 người có vùng cuộn, không lấp sân.
- Mobile: vào sảnh, xem hướng dẫn/kết quả hoặc xem trận; bản này tập trung bàn phím laptop, không cam kết điều khiển cảm ứng tương đương khi chưa có thiết kế riêng.

## 3. Quy cách sprite và môi trường

| Hạng mục | Quy cách giao hàng |
| --- | --- |
| Nhân vật bưu tá | PNG RGBA + JSON atlas; frame 96×96; 4 hướng N/E/S/W; origin tại chân `(48,88)` |
| Animation mỗi hướng | idle 2, run 6, dash 2, bump 2, celebrate 6; tổng 72 frame |
| Kiện hàng mang theo | 4 frame theo hướng, cùng anchor; overlay phụ thuộc hướng/độ sâu, không cần nhân đôi toàn bộ 72 frame |
| Bóng và dấu nhận diện | 1 bóng mềm, 4 hình marker; tint màu lúc render, số/tên bằng text |
| Khách hàng NPC | 4 mẫu × 2 frame idle = 8 frame; marker tương tác riêng |
| Mặt đất/đường | 64 tile, mỗi tile 64×64: nền 12, đường 20, mép 12, nước 8, cầu 12 |
| Vật trang trí | 32 frame 128×128: cây, chậu, đèn, ghế, thùng, biển, cọc, ô; mỗi loại 4 biến thể |
| Công trình | 14 frame 256×256: cửa hàng 4, kho 1, tháp P 1, cổng P 2 trạng thái, cầu chung 2, kênh riêng 2, trạm khuyến mãi 2 |
| UI | 24 icon, 12 panel/9-slice, 12 keycap, 6 huy hiệu; thống nhất hình dáng và palette |
| FX | 10 strip: dash 4, bump 6, delivery 6, coin 6, gate 4, unlock 8, promo 6, immunity 4, spawn 4, warning 4 |
| Ảnh màn hình | 5 ảnh/đồ họa: key art, lobby, loading, results, logo; không dùng ảnh concept làm nền bản đồ tương tác |
| Âm thanh | 16 cue SFX + 2 loop nhạc; âm thanh menu/nhạc tắt mặc định, bật sau thao tác người dùng |

Số lượng kiểm tra: 305 frame hình trong các atlas, 5 asset màn hình, 2 font, 16 SFX và 2 music loop. Đây là định mức sản xuất của bản đầu, không phải số file đã tồn tại. Một atlas cần cả ảnh và dữ liệu vùng frame. Biến thể màu runtime không được báo thành những ảnh đã sinh riêng.

Thân va chạm khai báo trong dữ liệu bản đồ/mô phỏng, không suy từ toàn bộ bounding box hình ảnh. Mái nhà/trang trí không che vị trí đứng hoặc làm người chơi hiểu nhầm chỗ đi được. Bàn giao kèm overlay collision debug và bản chụp so sánh.

## 4. Pipeline theo Game Studio

1. Tạo style sheet và seed bưu tá N/E/S/W với `image_gen` tích hợp. Mỗi hướng dùng cùng mẫu nhân vật tham chiếu. Không cần API key cho đường công cụ tích hợp; không cài SDK tạo ảnh hoặc yêu cầu khóa trong bước lập kế hoạch.
2. Chọn seed đạt silhouette, góc nhìn, palette và khả năng đọc ở kích thước render khoảng 64 pixel. Xem seed trong một cảnh có đường/cổng và HUD trước khi mở rộng toàn bộ bộ ảnh.
3. Dùng `build_sprite_edit_canvas.py` của Game Studio để đặt seed vào canvas tham chiếu. Mỗi request edit tạo trọn một strip cho một hướng và một chuyển động; giữ nhân dạng, trang phục, góc nhìn và frame count. Không tạo từng frame bằng các request rời.
4. Dùng `normalize_sprite_strip.py` để cắt và căn; bổ sung wrapper dự án cho calibration toàn bộ bộ animation. Script gốc tính scale theo từng strip, nên chạy riêng từng strip chưa đủ bảo đảm nhân vật cùng kích thước giữa idle/run/dash. Wrapper phải tính scale chung trên mọi strip hoặc ghép các slot vào một strip chuẩn hóa chung rồi tách metadata. Không sửa bản plugin đã cài.
5. Xuất frame đúng 96×96, alpha thật, anchor chân chung và khoảng an toàn chống cắt mũ/túi khi đẩy. Chỉ lock frame đầu khi chuyển động thực sự bắt đầu từ pose seed; không ép run bắt đầu bằng idle nếu gây khựng.
6. Đóng atlas PNG + JSON với padding/extrusion 2 pixel, giữ từng ảnh atlas không quá 2048×2048. Hiệu ứng, tile và UI có atlas riêng để nạp theo màn.
7. Dùng `render_sprite_preview_sheet.py` để xuất contact sheet; xem cả animation chạy trong Phaser, mang hàng, đi sau công trình và đứng cạnh nhiều màu khác nhau. Contact sheet đẹp chưa đủ để duyệt animation.
8. Lưu raw, seed, prompt, bản chọn và metadata trong workspace; chỉ file xuất cuối vào `public/arcade/assets/`. Manifest runtime dùng key ổn định, không rải đường dẫn ảnh trong gameplay.

Các script gốc nằm ở `C:/Users/DINH LOC/.codex/plugins/cache/openai-curated/game-studio/11c74d6b/scripts/`. Kế hoạch triển khai phải dùng đường dẫn được resolve từ phiên cài thực tế nếu plugin đổi phiên bản.

## 5. Bộ prompt dùng khi sản xuất

### Seed nhân vật

```text
Use case: stylized-concept.
Asset type: seed frame for a top-down 2D browser arcade courier game.
Subject: one friendly chibi toy courier robot, oversized delivery cap, rounded neutral light shell, dark readable visor eyes, small delivery satchel. Full body.
View: orthographic top-down three-quarter, facing SOUTH. Same camera will be used for N/E/W reference variants.
Style: polished playful cartoon game sprite, clean dark teal outlines, soft limited shading, light from upper left, crisp silhouette at 64px game size.
Composition: one centered character, visible feet, no ground plane, no lettering, no scenery, no watermark.
Background: genuinely transparent. Keep useful margin around the full silhouette.
Constraints: body must tint well in engine; no gameplay difference between colors; no real brand logos.
```

### Animation strip

```text
Edit the supplied transparent reference canvas into ONE horizontal SIX-frame RUN strip.
Preserve the seed robot's exact identity, outfit proportions, silhouette family, palette, lighting and SOUTH facing direction. Use six equal slots, left to right.
Action: readable rhythmic courier run cycle; body remains consistent, feet alternate, satchel moves slightly; no camera movement or baked travel across the canvas.
Transparent background; no labels, scenery, extra characters, dropped objects or poster composition.
All six frames are candidate production sprite frames, not concept art.
```

Thay hướng, tên chuyển động và số frame theo catalogue; giữ nguyên các invariant. Với bump: chỉ nghiêng/ngạc nhiên, không bị thương hay đánh nhau. Với dash: nghiêng người rõ nhưng không kéo giãn cơ thể thành hình khó nhận diện. FX tách khỏi sprite để cùng dùng cho mọi màu.

### Môi trường

```text
Create a coherent modular 2D toy-city game asset sheet matching the approved courier reference.
Orthographic top-down three-quarter, upper-left soft light, dark teal outlines, warm cream roads, clear walkable ground.
Generate only the listed objects for this sheet in equal separated transparent slots. No labels or baked UI.
Keep perspective, scale family and material consistent. Art edges must support clean atlas extraction.
Avoid photorealism, mixed camera angles, excessive pavement detail and real company logos.
```

Tạo từng nhóm tile/props/structures theo danh sách catalogue, không nhét mọi nhóm vào một ảnh lớn rồi coi là bộ asset hoàn chỉnh. Tile phải qua kiểm tra ghép mép 3×3 và các đoạn cong/ngã tư trong engine.

### Key art và lớp UI

```text
Create a wide illustrated title-screen backdrop for a playful 2D toy-city courier race.
Show the approved courier robots competing around a stylized fictional P gate, parcel deliveries and a wider alternative street.
Use the approved palette and same toy-cartoon materials. Preserve negative space for live Vietnamese title and menu, keep the menu area calm and high contrast.
No baked text, no realistic brand logo, no screenshot frame, no dashboard widgets.
```

Logo, keycap và icon đơn giản có thể dùng SVG/CSS theo cùng phong cách; chữ tiếng Việt vẫn là font sống. Không thay nhân vật/công trình minh họa bằng emoji hoặc hình chữ nhật rồi tuyên bố đã có asset cuối.

## 6. Audio, font và nguồn gốc

- SFX: chọn và biên tập từ [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) và [Impact Sounds](https://kenney.nl/assets/impact-sounds); các trang gốc công bố CC0. Phân công cue cụ thể ghi trong catalogue, chọn file cuối bằng nghe thử; không tự bịa tên file trong archive.
- Music đề xuất: [Menu Music](https://opengameart.org/content/menu-music-1) và [City Loop](https://opengameart.org/content/city-loop-0), tác giả wipics, các trang gốc ghi CC0. Nghe thử mức năng lượng và điểm nối trước khi chọn bản xuất.
- Font: [Baloo 2](https://github.com/google/fonts/tree/main/ofl/baloo2) và [Be Vietnam Pro](https://github.com/google/fonts/tree/main/ofl/bevietnampro). Lưu giấy phép gốc, subset Latin/Vietnamese nếu cần; kiểm tra đầy đủ dấu bằng chuỗi tiếng Việt, không chỉ bằng tên font.
- Không hotlink runtime tới trang asset. Khi triển khai, lưu bản đã chọn, nguồn, giấy phép, ngày truy xuất, prompt nếu là ảnh sinh và SHA-256 trong `assets/arcade/provenance.json`; bản này chưa chứa hash vì chưa tải/sinh tài nguyên.
- Xuất SFX ngắn, giảm chênh lệch âm lượng, tối đa vài tiếng va chạm đồng thời; âm quan trọng không bị tiếng bước chân lấn. Cung cấp master/music/SFX volume, mute và ghi nhớ lựa chọn. Bản laptop cá nhân giữ mute mặc định; MC có thể bật âm chung để tránh 26 máy cùng phát nhạc.

## 7. Điều kiện bộ asset hoàn chỉnh

- Mọi entry `required` trong catalogue đã có file cuối, nguồn gốc và trạng thái accepted; không có key thiếu ở màn loading, pause, reconnect hoặc kết quả.
- Đúng số frame, tên hướng/chuyển động, kích thước, alpha và anchor; không lẫn nền caro giả trong PNG.
- Toàn bộ chuyển động giữ tỷ lệ và đặc điểm nhân vật; overlay kiện hàng không nhảy/vào sai phía khi đổi hướng.
- Tất cả tile/props/công trình cùng phối cảnh, vật cản trùng vùng collider dễ hiểu.
- Có contact sheet, scene gallery, screenshot trong engine ở 1366×768 và màn đông người. Screenshot HUD tiếng Việt phải đọc được ở 125% zoom.
- Mục tiêu ngân sách: nhóm boot không quá 2 MiB nén; ảnh+font dùng trong trận không quá 8 MiB; audio nạp sau không quá 6 MiB. Đây là ngưỡng nghiệm thu đề xuất cần đo thực tế, không phải số hiện có.
- Hết trận không còn hình placeholder, âm beep tạm hoặc asset chỉ nằm trong thư mục mặc định ngoài dự án. Debug view của bản thử được phép dùng hình đơn giản nhưng không được trình bày thành bản hình ảnh cuối.
