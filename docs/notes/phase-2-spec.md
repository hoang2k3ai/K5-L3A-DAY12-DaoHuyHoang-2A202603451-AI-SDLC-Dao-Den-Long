# Tiêu chí nghiệm thu Phase 2

| Mục | Điều kiện đạt | Cách kiểm chứng |
|---|---|---|
| Gió Lạc | Đêm 2–3 sinh ở tick 1200, 2400… với tối đa hai con. Đuổi khi Mây mang ít nhất 5 đom đóm trong 15 m, cướp tối đa 3 rồi chạy trốn. Tỏa Sáng ngăn cướp hoặc thu hồi đồ đã cướp. | Scenario sinh, cướp và thả trong bộ bằng chứng, test thứ tự va chạm. |
| Bùa Gió | Nhặt đúng phạm vi, chạy 7,2 m/s và lướt không hồi chiêu trong 600 tick. Bùa hồi sau 2700 tick. | Scenario 15 và 16. |
| Chuỗi ba đêm | Bắt đầu ở Đảo Bến, mỗi đêm có lời Ông Đăng. Thắng mở giới thiệu đêm tiếp theo, thua cho thử lại. Thắng Đêm 3 hiện Bình Minh với tổng điểm các đêm thắng. | Scenario thời lượng, thắng/thua và phép tính điểm. Kiểm tra luồng màn hình trong trình duyệt. |
| Tạm dừng | Esc/P và nút Tiếp tục bật/tắt tạm dừng. Màn tạm dừng cho chơi lại, mở cài đặt và về menu. | Scenario 21 kiểm tra đồng hồ mô phỏng, kiểm tra các nút trong trình duyệt. |
| Cài đặt | Âm lượng và độ nhạy chuột có hiệu lực ngay và khôi phục khi tải lại. | Đổi hai thanh trượt rồi tải lại trang. |
| Âm thanh | Có nhạc nền và tín hiệu cho nhặt đom đóm, thắp đèn, Tỏa Sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện và mỗi giây từ 10 đến 1. | Scenario xác thực hành vi lõi; kiểm tra Web Audio trên bản chơi. |
| HUD | Ngọn Lửa góc trái, đồng hồ giữa đỏ và nhấp nháy từ 30 s, đèn và điểm góc phải, 10 ô đom đóm dưới giữa, hồi chiêu dưới phải, nhắc E và mũi tên đến đèn chưa sáng ngoài khung. | Scenario xác thực trạng thái lõi; kiểm tra bố cục và chỉ dẫn trong trình duyệt. |
| Màu và ánh sáng | Cường độ môi trường bằng 0,15 + 0,55 × tỷ lệ đèn sáng. Mỗi kênh RGB trong sai số 10% so với bảng chuẩn khi có dữ liệu đối chiếu. | Kiểm tra công thức ở lớp cảnh và ảnh của ba đêm. |

## Giả định từ ticket đính kèm

- Bản đính kèm thiếu bảng giá trị RGB và bảng tuning Phần 1. Giữ bảng màu và tuning v1.1 đã có trong repo, đồng thời áp dụng công thức ánh sáng được ghi rõ.
- Mốc sinh Bóng Mực đầu tiên ở Đêm 2–3 và các điểm sương dùng quy ước hiện có trong map vì ticket chỉ ghi chu kỳ sinh và không liệt kê điểm sương.
- Scenario headless kiểm chứng trạng thái mô phỏng. Các yêu cầu chỉ thuộc giao diện hoặc âm thanh được kiểm tra trong trình duyệt.
