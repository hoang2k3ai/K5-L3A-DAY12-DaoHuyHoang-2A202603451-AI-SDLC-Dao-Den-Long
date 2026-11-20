---
name: verify-game
description: Chạy kiểm chứng Đảo Đèn Lồng (test + bằng chứng headless) trước khi báo xong hoặc trước khi commit/tag.
---

# Kiểm chứng Đảo Đèn Lồng

Dùng khi: sắp báo "đã xong", sắp commit/tag, hoặc sau khi sửa `src/sim/`, `tools/headless.mjs`, `game.contract.json`.

## Các bước

1. Chạy test:
   ```bash
   npm test
   ```
   Phải PASS toàn bộ. Nếu đỏ: sửa nguyên nhân, **không** sửa test cho vừa code, trừ khi test đang khẳng định sai bất biến.

2. Sinh lại bằng chứng:
   ```bash
   npm run verify
   ```
   Bằng chứng hồi quy nằm ở `tmp/phase-4-regression/` và được sinh từ CLI thật. Mọi case phải PASS, gồm so sánh byte trên cả ba đêm và lượt 18.000 tick dưới 30 giây.

3. Kiểm tra contract:
   - `game.contract.json` khớp `TUNING` (đã có test).
   - Chạy mặc định ở cả ba đêm và chạy thêm một lượt có scenario:
     ```bash
     node tools/headless.mjs --seed 1 --night 1 --ticks 1200 --out tmp/night1.jsonl
     node tools/headless.mjs --seed 1 --night 2 --ticks 1200 --out tmp/night2.jsonl
     node tools/headless.mjs --seed 1 --night 3 --ticks 1200 --out tmp/night3.jsonl
     node tools/headless.mjs --seed 1 --night 1 --ticks 60 --scenario docs/proof/phase-3/cases/28-decay-and-relight/scenario.json --inputs docs/proof/phase-3/cases/28-decay-and-relight/inputs.json --out tmp/relight.jsonl
     ```
   - Dòng đầu là snapshot tick 0, dòng cuối là `{"type":"end",...}`.

4. Chạy `npm run build`. Đo `npm run bench -- --seed 42 --duration 30 --out bench.json` và `npm run soak -- --seed 7 --nights 10 --out soak.json`. Kiểm tra bảng điểm xuất JSON, đổi phím và lưu cài đặt trong trình duyệt.
5. Nếu sửa hành vi: cập nhật `docs/notes/` và `CHANGELOG.md`.

## Không được làm

- Sửa tay file `output.jsonl` hoặc dán kết quả mong đợi vào bằng chứng.
- Đổi `TUNING` mà quên `game.contract.json`.
- Thêm `import` Three.js/DOM vào `src/sim/`.
- Báo xong khi `npm test` hoặc `npm run verify` còn đỏ.
