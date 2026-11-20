# Changelog

## Phase 3 — Đèn cạn dầu (Test Contract v1.2)

Thay đổi phá vỡ tương thích:

- Thời lượng ba đêm đổi thành 240, 270 và 300 giây. Thắng ở bình minh cần còn Ngọn Lửa và giữ đủ 3/5, 4/6 hoặc 5/7 đèn. Lý do thắng `dawn_survived` thay cho `all_lit`.
- Đèn sáng nhận châm dầu, tự hao, có thể tắt và thắp lại với 5 đom đóm. Dưới 30 dầu vùng an toàn mất hiệu lực và Bóng Mực có thể vào trạng thái `drain`. Sức chứa tăng theo số lần thắp thành công.
- Điểm thay đổi theo lần thắp, dầu, số đom đóm nạp và trạng thái Bóng Mực khi trúng Tỏa Sáng. Thưởng thời gian bị bỏ. Kỷ lục cục bộ bắt đầu lại theo thang điểm mới.
- Snapshot và scenario nhận thêm dữ liệu đèn, sức chứa và mục tiêu hút. Sự kiện `lantern_lit` thêm `relight`; bổ sung `refuel`, `lantern_out` và `fuel_drain`.

Giao diện thêm thanh dầu, hình đèn tắt có giấy rách, cảnh báo dầu thấp và tùy chọn bảng màu dễ phân biệt lưu cục bộ.

## Phase 2 — Ba đêm (Test Contract v1.1)

- Chuẩn hóa tuning và mở rộng bản đồ từ Đảo Bến sang Đảo Cau và Đảo Chuông.
- Thêm Lướt, Bùa Gió, Gió Lạc, bục nhảy, gió mạnh và chuỗi ba đêm với tổng điểm Bình Minh.
- Thêm tạm dừng, cài đặt lưu cục bộ, nhạc nền và HUD theo trạng thái mô phỏng.
- Mở rộng CLI, snapshot, scenario, test và bằng chứng headless cho cả ba đêm.
## Phase 1 — Đêm 1: Đảo Bến (tag `phase-1`)

- Thêm lõi mô phỏng 60 Hz tất định: di chuyển, nhảy, nhặt đom đóm, nạp đèn, tỏa sáng, Bóng Mực đuổi, vùng an toàn quanh đèn, rơi khỏi đảo, thắng/thua, điểm.
- Thêm `game.contract.json` và CLI headless `tools/headless.mjs` theo Test Contract v1.0 (snapshot/event/end, exit code 0/2).
- Thêm cảnh 3D Three.js: đảo, 5 Đèn Lồng Lớn, Mây đội nón lá, đom đóm, Bóng Mực, sương đổi màu theo số đèn, camera xoay bằng chuột.
- Thêm HUD, màn thắng/thua, chơi lại bằng R hoặc nút.
- Thêm 33 unit/CLI test và bộ 9 case bằng chứng sinh bằng `npm run verify`.
- Thêm `AGENTS.md`, skill kiểm chứng, pre-commit hook và CI.
