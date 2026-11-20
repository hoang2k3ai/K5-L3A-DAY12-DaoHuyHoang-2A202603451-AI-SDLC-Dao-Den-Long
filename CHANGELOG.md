# Changelog

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
