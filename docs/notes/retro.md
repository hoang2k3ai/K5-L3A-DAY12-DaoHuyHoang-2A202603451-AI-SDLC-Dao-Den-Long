# Retro — Đảo Đèn Lồng, Phase 1–4

## Đánh giá theo phase

| Phase | Kết quả kiểm chứng | Bài học |
|---|---|---|
| 1 · Lõi 60 Hz | 33 test, 9 ca headless. Hai lượt cùng seed cho JSONL giống hệt. | Chạy CLI với và không có scenario. Bản đầu từng thiếu thực thể ở đường mặc định dù fixture chạy đúng. |
| 2 · Ba đêm | 62 test, 27 ca headless. Đã kiểm tra luồng thử lại, chuyển đêm, cộng điểm và lưu cài đặt trong Chrome. | Test lõi không phát hiện được màn Bình Minh và HUD bị thiếu. Giữ giả định về bảng RGB/tuning còn thiếu trong spec. |
| 3 · Đèn cạn dầu | 72 test, 31 ca headless. Chrome xác nhận thanh dầu, hình đèn tắt và lưu bảng màu. | Thứ tự tick phải được thể hiện trong fixture. Đèn đầy ở snapshot đầu có thể hao dầu trước khi E được xử lý, khiến fixture cũ tương tác với đèn khác. |
| 4 · Release | 77 test, 31 ca hồi quy. Soak 10 đêm, 0 crash, RSS tăng khoảng 8,5%. Benchmark 149,556 FPS và 37,796 FPS ở nhóm 1% thấp nhất trên máy cục bộ. | Nhìn FPS trung bình không đủ. Cần buộc GPU hoàn tất khung để số đo phản ánh nhịp dựng thực tế, và đọc cả phân vị. |

## Làm việc với AI

AI hiệu quả nhất khi ticket có thứ tự tick, đầu vào mẫu và tiêu chí có thể chạy. Dùng cùng mô phỏng cho trình duyệt và CLI giúp kiểm chứng thay đổi luật bằng scenario nhỏ. AI cũng hữu ích khi nối các mảnh dễ bị quên như cập nhật snapshot, changelog, cảnh báo và công cụ phát hành.

Lỗi điều khiển A/D ở Phase 1 lộ ra khi xoay camera và chơi thật. Phase 2 ban đầu có đường chọn trực tiếp từng đêm và thiếu tổng điểm chiến dịch. Kiểm thử trình duyệt bắt các lỗi đó dù test headless xanh. Phase 3 có test dùng vị trí hai đèn trùng nhau, dẫn đến châm đèn đang sáng vừa hụt dầu thay vì thắp đèn cuối. Sửa fixture để chỉ còn một đèn hợp lệ trong phạm vi. Phase 4 số 1% thấp lúc đầu không đạt dù FPS trung bình cao. Gom hình học theo lô và đo cả thời gian GPU hoàn tất mới đem lại kết quả ổn định hơn.

## Harness hiệu quả nhất

`AGENTS.md` giữ các bất biến như 60 Hz, seed, trục camera và đường sinh bằng chứng. Skill `verify-game` nhắc ngắn gọn các bước cho mỗi phase. Hook pre-commit hữu ích để chặn test đỏ và giữ các commit nhỏ. Công cụ `npm run verify` giúp đối chiếu luồng thực qua CLI. Kiểm thử Chrome bổ sung những gì các kiểm tra lõi không thấy, gồm nhãn, cài đặt lưu lại và luồng xếp hạng.

## Token và chi phí

Ước tính Phase 1 trong nhật ký là khoảng 54k token vào và 50k ra. Ước lượng theo khối lượng trao đổi và log công cụ cho Phase 2–4 đưa tổng bốn phase vào khoảng **138k–199k token vào**, **88k–117k ra**. Với giả định minh họa 2 USD/triệu token vào và 8 USD/triệu token ra, chi phí quy đổi khoảng **0,98–1,33 USD**. Đây là mức quy đổi theo giả định, vì repo không có số liệu billing hoặc cache thực.

Tiết kiệm token bằng cách giữ các quy tắc trong repo, dùng ca tối thiểu để tái hiện lỗi, chỉ đọc phần cuối log khi kiểm tra lại và ưu tiên số liệu tự động trước ảnh.

## Nếu làm lại

Viết fixture ở các mốc sát biên ngay khi đọc ticket. Chạy một bài Chrome nhỏ ngay từ Phase 1 cho bàn phím, HUD và ảnh ánh sáng. Đo cả 1% thấp ngay từ lần đầu dựng cảnh đông đối tượng. Chốt nội dung và đích phát hành trước, đồng thời duy trì một bản ZIP có thể chạy và kiểm chứng hoàn toàn cục bộ.
