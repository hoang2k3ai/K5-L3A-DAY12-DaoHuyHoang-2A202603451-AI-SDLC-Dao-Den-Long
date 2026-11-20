# ADR Phase 3 — Giữ đảo sáng tới bình minh

Đèn lưu nhiên liệu bằng số nguyên, mỗi đơn vị nội bộ bằng 1/60 đơn vị dầu. Trạng thái tắt xóa lượng đom đóm đã nạp và giữ lịch sử thắp. Lịch sử quyết định ngưỡng thắp lại; bộ đếm thắp thành công của Mây chỉ tăng khi chơi. Tại bình minh, mô phỏng xét Ngọn Lửa trước rồi dùng số đèn và dầu còn lại sau toàn bộ cập nhật của tick cuối.

- Nghiệm thu nhiên liệu: kiểm tra hao, châm, tắt, thắp lại, vùng an toàn tại ngưỡng 30 và sức chứa từ 10 đến 20.
- Nghiệm thu Bóng Mực: kiểm tra chọn mục tiêu, cộng dồn hút dầu, ngắt hút khi châm dầu hoặc Mây đến gần, và thưởng Tỏa Sáng.
- Nghiệm thu bình minh: kiểm tra đủ và thiếu ngưỡng từng đêm, thắp đủ trước hạn, thắp hoặc hết dầu ở tick cuối, và ưu tiên hết Ngọn Lửa.
- Nghiệm thu hiển thị: kiểm tra thanh dầu và nhấp nháy 1 Hz, hình đèn tắt, viền/mắt Bóng Mực, cảnh báo và lưu bảng màu.

Hút dầu bắt đầu ở bước 2 của tick kế sau khi Bóng Mực vào `drain`. Mỗi con báo sau mỗi 60 tick thực sự hút liên tục. Nếu nhiều con báo cùng tick, các sự kiện dùng cùng mức dầu sau khi trừ tổng. Tương tác xét lượng dầu sau bước hao, nên đèn đầy ở snapshot trước đó có thể nhận dầu ở tick kế tiếp.

Ngưỡng vùng an toàn và phần nguyên dầu thưởng được tính trên số nguyên nội bộ trước khi làm tròn. Snapshot một chữ số thập phân có thể hiển thị 30,0 ngay sau khi dầu đã xuống dưới ngưỡng. Bóng Mực giữ quy tắc phát hiện Mây từ Phase 2 khi đang đi lang thang; mục tiêu đèn chỉ áp dụng khi nó vẫn ở `wander`.

Các test cũ về bỏ qua mọi đèn đã sáng, thắng ngay khi thắp đèn cuối, thời lượng và thưởng theo giây được cập nhật theo luật mới. Bộ bằng chứng Phase 1–2 được lưu theo phiên bản.
