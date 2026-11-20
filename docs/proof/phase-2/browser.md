# Bằng chứng trình duyệt Phase 2

Chrome trên Windows, vùng hiển thị 1280×720 CSS pixel, DPR 1. Đo bản chơi với `?play=1`, `?play=2` và `?play=3`. Sau một giây làm nóng, tính số khung `requestAnimationFrame` trung bình trong cửa sổ 5 giây với camera mặc định.

| Cảnh | FPS trung bình | Ảnh |
|---|---:|---|
| Đêm 1 | 73,6 | [Đảo Bến](screens/night-1.png) |
| Đêm 2 | 87,4 | [Đảo Cau](screens/night-2.png) |
| Đêm 3 | 68,7 | [Đảo Chuông](screens/night-3.png) |

- Menu mở giới thiệu Đảo Bến có lời Ông Đăng. Hai thanh Âm lượng và Độ nhạy chuột giữ giá trị 35% và 145% sau khi tải lại. [Ảnh menu](screens/menu.png)
- Escape mở màn tạm dừng, đồng hồ giữ nguyên sau hơn một giây, nút Tiếp tục quay về HUD có đủ 10 ô đom đóm.
- Dùng fixture trình duyệt đặt số lửa về 0 để kiểm tra Thử lại và đánh dấu các đèn đã sáng để kích hoạt xử lý thắng của game. Đêm 2 và Đêm 3 đều mở phần giới thiệu, màn Bình Minh cộng đúng 748 + 808 + 868 = 2.424 điểm. [Ảnh Bình Minh](screens/binh-minh.png)

Các ảnh ba đêm lấy từ bản đang chạy. Phép đo phản ánh đoạn đầu đêm trên máy kiểm tra.
