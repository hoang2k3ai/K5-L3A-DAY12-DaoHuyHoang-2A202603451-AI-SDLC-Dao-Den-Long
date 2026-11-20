# Bằng chứng trình duyệt Phase 3

Kiểm tra Chrome trên Windows ở 1280×720, DPR 1. Dùng fixture DevTools để đặt trạng thái đèn và tick bình minh. Fixture chỉ tồn tại trong phiên kiểm tra.

| Kiểm tra | Kết quả | Ảnh |
|---|---|---|
| Đèn dầu cao, đèn dầu thấp và đèn tắt | Hai đèn sáng có thanh theo tỷ lệ dầu. Thanh dầu thấp qua pha sáng và tối của chu kỳ 1 Hz. Thân đèn tắt còn 80% kích thước, có vết rách và ẩn thanh dầu. HUD hiển thị `3/14`. | [Bảng màu thường](screens/fuel-standard.png) |
| Bảng màu dễ phân biệt | Tùy chọn tạm dừng được giữ sau khi tải lại. Viền và mắt Bóng Mực đổi từ `#7A3CFF` sang `#00B3FF`. Cảnh báo dầu thấp đổi từ `#FF5A5F` sang `#FFFFFF` và có biểu tượng ⚠. | [Cài đặt](screens/palette-setting.png), [Bảng màu dễ phân biệt](screens/fuel-accessible.png) |
| Bình minh | Fixture đặt ba đèn sáng ở Đêm 1. Game tiếp tục đến khi hết giờ rồi hiển thị kết quả giữ đảo sáng. | [Kết quả](screens/dawn-survived.png) |

Đo `requestAnimationFrame` trong 5 giây đầu trên bản chơi thông thường với camera mặc định, sau khoảng một giây làm nóng.

| Đêm | FPS trung bình |
|---|---:|
| 1 | 66,1 |
| 2 | 103,7 |
| 3 | 66,1 |
