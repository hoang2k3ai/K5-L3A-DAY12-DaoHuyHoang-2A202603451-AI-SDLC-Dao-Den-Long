# Bằng chứng Phase 1 — Test Contract v1.0

Sinh tự động bằng `npm run verify` (chạy `tools/headless.mjs` thật, không sửa tay output).
Mỗi case có `scenario.json`, `inputs.json` và `output.jsonl` trong `cases/<tên>/`.

| Kết quả | Case | Yêu cầu được chứng minh | Kết quả đo được |
|---|---|---|---|
| PASS | 01-pickup | Nhặt đom đóm khi đi qua (pickup_radius, per_mote) | mote_picked tick=49, score=10 |
| PASS | 02-deposit-and-light | Nạp đủ lantern_cost thì đèn sáng (interact_radius, deposit, lantern_lit) | deposit=3, L1 lit, score=100 |
| PASS | 03-pulse-stun | Tỏa sáng đẩy lùi và làm choáng Bóng Mực trong pulse_radius | stunned S1, pushed to 7.00m, flames=4 |
| PASS | 04-hit-and-invuln | Bị chạm mất 1 lửa, rơi hit_drop_ratio đom đóm, invuln_s chặn đòn thứ hai | 1 hit, dropped=2, flames=4, carried=2 |
| PASS | 05-safe-radius | Bóng Mực không vào được safe_radius quanh đèn đã sáng (dù người chơi đứng trong vùng an toàn) | shade pressed at 4.00m from lit lantern, player unharmed |
| PASS | 06-fall | Rơi khỏi đảo bị phạt 1 lửa và hồi sinh ở tâm (fall_enabled) | fall hit, flames=4, respawn=(0,0,0) |
| PASS | 07-dawn | Hết night1_duration_s mà chưa thắng thì thua (reason dawn) | lost/dawn at tick 30, end.ticks=30 |
| PASS | 08-win-walkthrough | Đi bộ nhặt đủ 15 đom đóm, nạp 5 đèn, thắng (all_lit) và cộng điểm cuối đêm | won at tick 1056 (17.6s), score=1464, collected=15, lit=L1,L2,L3,L4,L5 |
| PASS | 09-determinism | Cùng seed + scenario + inputs cho output giống hệt (sha256) | sha256=ace530777f924c79… |

## Cách chạy lại

```bash
npm install
npm test        # 33 unit + CLI test
npm run verify  # chạy lại toàn bộ bằng chứng này
```

Máy chạy: Windows 11, Node v24.22.2. Contract không phụ thuộc GPU ở chế độ headless.
