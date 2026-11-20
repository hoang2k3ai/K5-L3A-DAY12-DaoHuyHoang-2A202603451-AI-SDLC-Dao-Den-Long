# Phase 1 — Giả định và tiêu chí nghiệm thu

PRD-0 cố ý mơ hồ ở nhiều chỗ. Dưới đây là giả định tôi đã chọn, lý do ngắn, và cách chứng minh.

## Giả định

| Chỗ mơ hồ | Giả định | Lý do |
|---|---|---|
| "Mất máu" và "tốn ánh sáng" | `flames` = 5 vừa là ánh sáng vừa là máu. Bị chạm hoặc tỏa sáng đều trừ 1. Hết lửa → thua `no_flames`. | Contract chỉ có `flames` làm tài nguyên bị mất khi bị chạm; dùng chung một tài nguyên giữ luật đơn giản, dễ kiểm chứng. |
| Tỏa sáng tốn gì | `pulse_cost = 1` lửa; chỉ dùng được khi còn đủ lửa và hết hồi chiêu. | "Tỏa sáng tốn ánh sáng" + `pulse_cost` nằm cạnh `flames` trong contract. |
| Hình dạng đảo | Đảo tròn bán kính 28 m, mặt đất Y = 0; ra ngoài → rơi. | PRD nói "hòn đảo tròn"; cần một biên rõ ràng cho `fall_enabled`. |
| Rơi khỏi đảo | Mất 1 lửa, hồi sinh tại (0,0,0), bất tử 2 s. | Không thể "rơi" mãi; cần trạng thái chơi tiếp được. |
| Vị trí 5 đèn mặc định | Vòng tròn bán kính 20 m, `L1`…`L5`, bắt đầu từ hướng −Z. | Chia đều đảo, đường đi giữa các đèn không quá dài. |
| Đom đóm ban đầu | 24 con rải ngẫu nhiên; nhặt xong hồi lại sau 8 s nếu `random_motes`. | Đủ cho 5 đèn (cần 15) mà vẫn có dư để thử. |
| Bóng Mực ban đầu | 2 con, tối đa 5, thêm mỗi 40 s, sinh cách người chơi ≥ 18 m nếu `random_shades`. | Không spawn ngay trên đầu người chơi; áp lực tăng dần. |
| Bóng Mực "sợ đèn" | Không được vào trong `safe_radius = 4` m quanh đèn **đã sáng**; bị đẩy ra biên. | Diễn giải trực tiếp "Bóng Mực sợ những chiếc đèn". |
| Nhảy | Nhảy cao 7 m/s, trọng lực 22 m/s²; va chạm tính trên mặt phẳng XZ. | PRD yêu cầu nhảy; contract đo khoảng cách ngang. |
| Nút bấm | Chỉ kích hoạt khi chuyển `false → true` (đúng contract). Giữ nút không lặp hành động. | Tránh deposit/pulse liên tục mỗi tick. |
| Đèn trong scenario có `deposited ≥ lantern_cost` | Tự coi là `lit: true`, nhưng **không** cộng điểm. | Nhất quán với luật "đủ 3 thì sáng", đồng thời tôn trọng "dựng scenario không cộng điểm". |
| Thứ tự ưu tiên khi cùng tick | Nạp đủ đèn cuối → thắng ngay; nếu không, hết lửa → thua; nếu không, hết giờ → thua `dawn`. | Người chơi không bị trừ oan khi vừa thắng vừa hết giờ. |
| Điểm khi thua | Không cộng thưởng giây/lửa còn lại. | Thưởng cuối đêm chỉ có nghĩa khi thắng. |
| `--night` | Phase 1 chỉ nhận `--night 1`; giá trị khác → thoát mã 2. | Contract Phase 1 chỉ có Đêm 1. |
| Tham số lạ | Bỏ qua tham số không biết thay vì lỗi, để không vỡ khi giảng viên thêm cờ mới. | Ưu tiên chạy được; các tham số bắt buộc vẫn được kiểm tra chặt. |

## Tiêu chí nghiệm thu → bằng chứng

| Yêu cầu PRD-0 | Cách kiểm chứng | Bằng chứng |
|---|---|---|
| Đi lại, nhảy, camera 3D | Unit test vector di chuyển theo `cam_yaw_deg`, test nhảy rơi về đất; chơi thật bằng `npm run dev` | `tests/contract.test.mjs`, ảnh `docs/proof/phase-1/gameplay.png` |
| Đom đóm rải rác, nhặt được | Test nhặt đúng biên `pickup_radius`, test ngoài biên không nhặt | `cases/01-pickup` |
| Nạp đủ thì đèn sáng | Test `deposit` + `lantern_lit`, kiểm tra `deposited` | `cases/02-deposit-and-light` |
| Bóng Mực đuổi và gây sát thương | Test hit, rơi đom đóm, `invuln_s` | `cases/04-hit-and-invuln` |
| Tỏa sáng xua Bóng Mực | Test `pulse` làm choáng, đẩy lùi, tốn lửa, hồi chiêu | `cases/03-pulse-stun` |
| Bóng Mực sợ đèn | Test Bóng Mực bị giữ ngoài `safe_radius` | `cases/05-safe-radius` |
| Thắng khi thắp hết đèn | Lượt chơi script đi bộ nhặt 15 đom đóm, nạp 5 đèn, thắng | `cases/08-win-walkthrough` |
| Thua khi hết máu / hết đêm | Test `no_flames` (rơi) và `dawn` | `cases/06-fall`, `cases/07-dawn` |
| Điểm số | Test từng mục điểm và công thức thưởng cuối đêm | `tests/contract.test.mjs` |
| HUD + chơi lại | Ảnh gameplay, nút "Chơi lại (R)" | `gameplay.png`, `README.md` |
| Headless theo contract | 9 case chạy qua đúng CLI, kiểm tra exit code, định dạng JSONL | `docs/proof/phase-1/README.md` |
| Tất định | Hai lần chạy cùng seed, so sha256 | `cases/09-determinism` |

## Ghi chú kỹ thuật

- `src/sim/` không import Three.js hay DOM, nên headless và browser chạy **cùng một logic**.
- Ảnh `gameplay.png` được chụp từ chế độ `?photo=1` (dàn cảnh, đứng yên). Nó chỉ dùng để cho thấy phần hiển thị; bằng chứng hành vi là các file `output.jsonl` do CLI sinh ra.
