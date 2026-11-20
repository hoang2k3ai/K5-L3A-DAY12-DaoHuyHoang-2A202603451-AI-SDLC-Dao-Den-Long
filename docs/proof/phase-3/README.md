# Bằng chứng Phase 3 — Test Contract v1.2

Sinh tự động bằng `npm run verify` (chạy `tools/headless.mjs` thật, không sửa tay output).
Mỗi case có `scenario.json`, `inputs.json` (nếu cần) và `output.jsonl` trong `cases/<tên>/`.

| Kết quả | Case | Yêu cầu được chứng minh | Kết quả đo được |
|---|---|---|---|
| PASS | 01-movement-and-jump | Tốc độ chuẩn 6.0 m/s; nhảy 7.0 m/s với trọng lực 20 m/s² | apex>0.5m, walked 6m in 1s, grounded=true |
| PASS | 02-dash | Lướt 14 m/s trong 0.2 s (2.8 m) và hồi chiêu 1.5 s | dash distance=2.8m in 0.2s, cooldown blocks tick 50 |
| PASS | 03-pickup-radius-and-height | Nhặt trong 1.0 m ngang và 1.5 m cao; ngoài ngưỡng thì không | picked the 1.0 m and 1.5 m motes, rejected 1.01 m and 1.6 m |
| PASS | 04-carry-capacity | Sức chứa chuẩn 10 đom đóm | carried stays at 10/10, extra mote is not collected |
| PASS | 05-deposit-and-tiebreak | Nạp 10 đom đóm, chọn đèn hợp lệ gần nhất, bằng nhau thì chọn id nhỏ hơn | deposit 10 into L1, lit, score=150 |
| PASS | 06-pulse | Tỏa sáng tốn 3 đom, bán kính 5 m, choáng 120 tick, đẩy 4 m, +5 điểm | stun=120 ticks, push=4m, cost=3 motes, score=+5 |
| PASS | 07-safe-radius | Bóng Mực không vào được bán kính an toàn 6 m quanh đèn đã sáng | closest shade=6.033m, player flames=3 |
| PASS | 08-hit-and-drop | Trúng đòn mất 1 lửa, rơi floor(carried/2) đom, đom rơi TTL 8 s, bất tử 90 tick | dropped=3 (floor 7/2), ttl=8s, invuln=1.5s, carried=4 |
| PASS | 09-fall | Rơi dưới Y=-10 mất 1 lửa, mất hết đom, chờ 60 tick rồi hồi sinh | fall at tick 60, lost 5 motes, respawn at tick 120 |
| PASS | 10-mote-spawn-and-cap | 20 đom ban đầu, +1 mỗi 240 tick, trần 30 | 20 -> 21 -> 22 -> 23 |
| PASS | 11-mote-cap-30 | Không sinh thêm khi đã đủ 30 đom | motes stayed at 30/30 across 8 s |
| PASS | 12-wind-night3 | Gió Lạc bắt đầu tick 1800, đẩy người chơi 2 m/s | wind on at 1800, dir=145.988°, pushed 2.00m in 1s |
| PASS | 13-drifter-steal | Gió Lạc đuổi khi mang >=5 đom và lấy tối đa 3 | stole 3 at tick 33, player carried 2, drifter flees |
| PASS | 14-drifter-drop | Tỏa sáng trúng Gió Lạc đang chạy trốn làm nó rơi lại đom | drifter dropped 3 motes, 3 on the ground |
| PASS | 15-charm | Bùa Gió: 7.2 m/s, bỏ hồi chiêu lướt, hồi sau 45 s | charm picked, 10 s of speed, respawn 45 s |
| PASS | 16-charm-speed | Bùa Gió nâng tốc chạy lên 7.2 m/s và xoá hồi chiêu lướt | walked 2.4 m in 20 ticks (7.2 m/s), second dash accepted at tick 20 |
| PASS | 17-night2-bridge | Đêm 2: cầu nối hai đảo đi được, vực thì rơi | crossed the bridge to x=49.38 with all flames |
| PASS | 18-night2-jump-pad | Đêm 2: bệ phóng đưa người chơi sang đảo bên kia | pad launched player to x=51.237, y=0, grounded |
| PASS | 19-night3-tiers-and-pad | Đêm 3: ruộng bậc thang, dốc và bệ phóng lên tháp chuông | walked the ramp up to y=3 |
| PASS | 20-night3-tower-pad | Đêm 3: bệ phóng từ bậc 1 lên bậc 2 (tháp chuông) | pad landed at y=6 on the tier-2 platform |
| PASS | 21-pause | Tạm dừng: tick vẫn tăng, sim_tick/thời gian/hồi chiêu đứng yên | paused for ticks 1-4, tick=12, sim_tick=7 |
| PASS | 22-night-start-and-durations | night_start ở tick 0, Đêm 1 kéo dài 240 giây | night_start tick=0, duration=240 s |
| PASS | 23-win-order | Thắp đủ sớm và giữ đèn sáng đến tick bình minh | tick 1: deposit -> lantern_lit; tick 3: dawn_survived |
| PASS | 24-score-standard | Đèn thắp trong tick bình minh được tính điểm và tính vào ngưỡng thắng | score=703 = 5 + 100 + 2×149 + 150 + 3×50 |
| PASS | 25-full-night-under-30s | Một đêm đầy đủ chạy headless dưới 30 giây | 18000 ticks in 181 ms, state=lost |
| PASS | 26-determinism | Cùng seed + scenario + inputs cho output giống hệt trên cả 3 đêm | sha256 night1=2fd157832a0f…, night2=1e6b5667968f…, night3=5c9320353f0e… |
| PASS | 27-drifter-schedule | Gió Lạc sinh mỗi 1200 tick, tối đa hai con | D1 at 1200, D2 at 2400, still 2 at 3600 |
| PASS | 28-decay-and-relight | Đèn hết dầu trước tương tác, thắp lại với 5 đom đóm, tăng sức chứa | tick 60: out → relight, fuel 100, capacity 12, score 65 |
| PASS | 29-stacked-drain | Hai Bóng Mực cùng hút 10 dầu/giây, cộng 1 dầu/giây tự hao | 27 → 16 → 5 → 0; two reports per 60 ticks |
| PASS | 30-refuel-safe-zone | Châm dầu vượt ngưỡng 30, đẩy Bóng Mực khỏi vùng 6 m | fuel 38.9, shade expelled, +5 points |
| PASS | 31-pulse-drain | Tỏa Sáng ngắt hút và cộng 15 điểm | drain → stunned, +15 points |

Kiểm tra giao diện và FPS được ghi trong [bằng chứng trình duyệt](browser.md).

## Cách chạy lại

```bash
npm install
npm test        # unit + CLI test
npm run verify  # chạy lại toàn bộ bằng chứng này
```

Máy chạy: Windows 11, Node v24.22.2. Contract không phụ thuộc GPU ở chế độ headless.
