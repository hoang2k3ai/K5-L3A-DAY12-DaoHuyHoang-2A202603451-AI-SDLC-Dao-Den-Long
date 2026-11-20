# Thiết kế Mây và đũa tre

Mây là người giữ đèn học phép của Ông Đăng. Áo xanh chàm, khăn đỏ, nón lá và đèn tay tạo nhận diện khi nhìn từ sau lưng. Bóng Mực dùng mặt nạ bầu dục và tà áo rách để có dáng lướt. Cảnh dùng đường đá, mái ngói, đèn treo, đồi xa và mặt đất có họa tiết. Nguồn tham khảo được ghi trong [CREDITS](../../CREDITS.md).

Tỏa Sáng, Lướt Gió và Dẫn Lửa lấy hiệu ứng từ sự kiện mô phỏng hiện có. Tầm Đom và Dẫn Đăng chỉ đọc vị trí để tạo chỉ đường, dùng một nhịp chờ hiển thị chung 72 tick và hỗ trợ đổi phím. Tùy chọn Giảm chuyển động giữ thông báo và ẩn hiệu ứng phép. Asset và hiệu ứng mới chỉ được tạo trong cảnh chơi, ngoài cảnh benchmark chuẩn.

Thiểm Lôi quy đổi 8 bước thành 8 m theo đơn vị của bản đồ. Hình quạt mở 30° mỗi bên, có giới hạn chênh cao 2 m, tốn 2 đom đóm và choáng 90 tick. Chổi Bay cất cánh từ mặt đất, nâng tối đa 3,5 m trong cửa sổ 150 tick rồi trở về trọng lực thường. Mây vẫn lái theo hướng camera. Cả hai đi qua input trực tiếp của trình duyệt, ngoài schema input headless và cảnh benchmark.
