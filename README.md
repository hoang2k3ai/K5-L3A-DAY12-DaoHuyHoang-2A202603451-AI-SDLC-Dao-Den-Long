# Đảo Đèn Lồng — Đêm 1

> Video demo: *sẽ đính kèm ở Release `v1.0.0` (Phase 4)*.

Game 3D góc nhìn thứ ba. Bạn là **Mây**, người giữ đèn nhỏ tuổi trên hòn đảo giữa biển mây. Đêm nay sương đen đã nuốt hết ánh sáng: hãy gom đom đóm, thắp lại 5 Đèn Lồng Lớn và né những Bóng Mực trong sương.

Công nghệ: **Three.js + Vite** (JavaScript thuần). Chế độ headless chạy bằng **Node.js**, không cần GPU.

## Chơi ngay

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Cần Node.js 20 trở lên; chạy được trên macOS, Linux và Windows (game là web nên giảng viên chỉ cần trình duyệt).

### Điều khiển

| Phím | Việc |
|---|---|
| `W A S D` / phím mũi tên | Di chuyển theo hướng camera |
| `Space` | Nhảy |
| `E` | Nạp đom đóm vào Đèn Lồng Lớn gần nhất |
| `Q` / `Shift` | Tỏa sáng: đẩy lùi và làm choáng Bóng Mực (tốn 1 lửa) |
| Kéo chuột / lăn chuột | Xoay và thu phóng camera |
| `R` | Chơi lại |
| `M` | Bật/tắt âm thanh |

## Luật chơi và cách tính điểm

- **Thắng:** thắp sáng cả 5 Đèn Lồng Lớn (`all_lit`).
- **Thua:** hết lửa (`no_flames`) hoặc hết đêm (`dawn`).
- Mỗi đèn cần **3 đom đóm**. Mây mang tối đa **5**.
- Bị Bóng Mực chạm: mất **1 lửa**, đánh rơi **50%** đom đóm đang mang, bất tử **1,5 s**.
- Tỏa sáng: tốn **1 lửa**, làm choáng **3 s**, đẩy lùi **3 m**, hồi chiêu **2 s**.
- Bóng Mực không dám vào trong bán kính **4 m** quanh một đèn đã sáng.
- Rơi khỏi đảo: mất **1 lửa**, hồi sinh ở tâm đảo, bất tử **2 s**.

Điểm:

```
điểm = 10 × đom đóm nhặt được
      + 100 × đèn thắp sáng
      + 15 × Bóng Mực bị làm choáng
      + (khi thắng) 2 × số giây còn lại (làm tròn xuống)
      + (khi thắng) 50 × số lửa còn lại
```

Ví dụ lượt chơi trong `docs/proof/phase-1/cases/08-win-walkthrough`: nhặt 15 đom đóm, thắp 5 đèn, thắng ở giây 17,6 → **1464 điểm**.

## Thông số (tuning)

`game.contract.json` ở gốc repo là nguồn chuẩn; `src/sim/config.js` phải khớp và có test tự động so sánh hai file.

| Tham số | Giá trị | Ghi chú |
|---|---:|---|
| `player_speed` | 6 m/s | |
| `carry_capacity` | 5 | |
| `lantern_cost` | 3 | |
| `lantern_count_night1` | 5 | |
| `pickup_radius` | 1,2 m | |
| `interact_radius` | 2,5 m | |
| `pulse_cost` | 1 | lửa |
| `pulse_radius` | 6 m | |
| `night1_duration_s` | 300 | 5 phút |
| `flames` | 5 | vừa là ánh sáng, vừa là máu |
| `invuln_s` | 1,5 | |
| `hit_drop_ratio` | 0,5 | làm tròn xuống |
| `pulse_stun_s` | 3 | |
| `pulse_push_m` | 3 | |
| `pulse_cooldown_s` | 2 | |
| `safe_radius` | 4 | quanh đèn đã sáng |
| `shade_speed` | 2,5 m/s | |
| `shade_hit_radius` | 0,9 m | |
| `fall_enabled` | true | |
| `score.per_mote` | 10 | |
| `score.per_lantern` | 100 | |
| `score.per_stun` | 15 | |
| `score.per_second_left` | 2 | chỉ khi thắng |
| `score.per_flame_left` | 50 | chỉ khi thắng |

Các hằng số ngoài contract (bán kính đảo 28 m, trọng lực, số đom đóm/Bóng Mực ban đầu…) nằm trong `src/sim/config.js` mục `WORLD` và được giải thích trong [docs/notes/phase-1-assumptions.md](docs/notes/phase-1-assumptions.md).

## Chế độ headless (Test Contract v1.0)

```bash
node tools/headless.mjs --seed 7 --night 1 --ticks 600 --out out.jsonl
node tools/headless.mjs --seed 7 --night 1 --ticks 600 \
  --scenario docs/proof/phase-1/cases/02-deposit-and-light/scenario.json \
  --inputs docs/proof/phase-1/cases/02-deposit-and-light/inputs.json \
  --snapshot-every 10 --out out.jsonl
```

- Chạy đúng 60 tick/giây, không cần cửa sổ/GPU, thoát mã `0` khi xong.
- File scenario/inputs sai định dạng → thoát mã `2`, báo lỗi ra `stderr`.
- Dừng sớm khi thắng/thua; dòng cuối luôn là `{"type":"end",...}`.
- Cùng `--seed` + scenario + inputs → output giống hệt (đã kiểm bằng sha256 trong bộ proof).

## Kiểm chứng

```bash
npm test        # 33 unit + CLI test (node:test, không cần dependency ngoài)
npm run verify  # chạy lại toàn bộ bằng chứng Phase 1, ghi vào docs/proof/phase-1/
```

Bằng chứng Phase 1: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md) — mỗi case có `scenario.json`, `inputs.json`, `output.jsonl` và một dòng kết quả đo được. CI chạy cả hai lệnh ở mỗi lần push.

## Cấu trúc

```
index.html              giao diện + HUD
src/sim/                lõi game tất định (không import three, không DOM)
  config.js             tuning + hằng số thế giới
  world.js              vòng lặp 60 Hz, sự kiện, snapshot
  contract.js           kiểm tra scenario/inputs
src/render/             Three.js: cảnh, HUD, âm thanh
tools/headless.mjs      CLI theo Test Contract v1.0
tools/verify.mjs        sinh + kiểm tra bằng chứng
tests/                  unit test và test CLI
docs/notes/             giả định, nhật ký AI, retro
docs/proof/phase-1/     bằng chứng (tái tạo bằng npm run verify)
```

## Sáng tạo của tôi

Những phần thêm chỉ nằm ở lớp hiển thị/âm thanh, **không** đổi mô phỏng headless (đã chứng minh: `npm test` và `npm run verify` cho cùng kết quả; `src/sim/` không import Three.js):

- Đảo, đá, cỏ, biển mây, sao và trăng được sinh thủ tục — không dùng asset ngoài.
- Sương và ánh sáng đổi dần từ tím đen sang vàng cam theo số đèn đã thắp; vòng sáng trên mặt đất cho thấy vùng an toàn quanh đèn.
- Camera góc nhìn thứ ba xoay/thu phóng bằng chuột; Mây có nón lá, đèn nhỏ lúc lắc và ánh sáng tăng theo số đom đóm đang mang.
- Âm thanh tổng hợp bằng WebAudio (không file âm thanh): tiếng nhặt đom đóm, nạp đèn, tỏa sáng, va chạm, thắng/thua.
- Chế độ `?photo=1` chỉ để chụp ảnh minh hoạ (đứng yên, không mô phỏng) — không dùng làm bằng chứng gameplay.

Bằng chứng ngắn rằng phần lõi vẫn đúng: toàn bộ 9 case trong `docs/proof/phase-1/` chạy qua đúng CLI của contract và đều PASS.

## Giấy phép và ghi nguồn

Mã nguồn: [MIT](LICENSE). Nguồn thư viện, công cụ AI và xác nhận không dùng asset ngoài: [CREDITS.md](CREDITS.md).
