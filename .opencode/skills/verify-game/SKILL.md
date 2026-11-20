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
   Phải `9/9 passed`. Bằng chứng nằm ở `docs/proof/phase-1/cases/*/output.jsonl` và được sinh lại từ CLI thật.

3. Kiểm tra contract:
   - `game.contract.json` khớp `TUNING` (đã có test).
   - Chạy tay một lần không scenario và một lần có scenario:
     ```bash
     node tools/headless.mjs --seed 1 --night 1 --ticks 300 --out tmp/a.jsonl
     node tools/headless.mjs --seed 1 --night 1 --ticks 300 \
       --scenario docs/proof/phase-1/cases/01-pickup/scenario.json \
       --inputs docs/proof/phase-1/cases/01-pickup/inputs.json --out tmp/b.jsonl
     ```
   - Dòng đầu là snapshot tick 0, dòng cuối là `{"type":"end",...}`.

4. Nếu sửa hành vi: cập nhật `docs/notes/` (giả định, nhật ký AI, retro) và `CHANGELOG.md`.

## Không được làm

- Sửa tay file `output.jsonl` hoặc dán kết quả mong đợi vào bằng chứng.
- Đổi `TUNING` mà quên `game.contract.json`.
- Thêm `import` Three.js/DOM vào `src/sim/`.
- Báo xong khi `npm test` hoặc `npm run verify` còn đỏ.
