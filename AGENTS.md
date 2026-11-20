# AGENTS.md — Đảo Đèn Lồng

Hướng dẫn cố định cho agent. Ngắn, chỉ những gì lặp lại mỗi lần chạy.

## Dự án

- Game 3D web: Three.js + Vite. Lõi mô phỏng là JavaScript thuần, chạy được bằng Node.
- Hợp đồng bắt buộc: `game.contract.json` + `docs/notes/phase-1-assumptions.md`.
- Yêu cầu gốc của phase nằm trên lab board, không nằm trong repo.

## Lệnh

```bash
npm install                 # cài dependency
npm test                    # unit + CLI test (node:test)
npm run verify              # sinh lại bằng chứng docs/proof/phase-1/
npm run dev                 # chơi thử ở http://localhost:5173
npm run build               # kiểm tra bundle
node tools/headless.mjs --seed 1 --night 1 --ticks 600 --out out.jsonl
```

## Bất biến của Test Contract

- Mô phỏng cố định **60 tick/giây**; `--ticks N` chạy đúng N bước.
- Snapshot tick 0 là trạng thái **trước** khi áp input; bước k đọc input tick k và tạo trạng thái k+1; sự kiện ghi `tick = k+1`.
- Toạ độ làm tròn 3 chữ số thập phân. `time_left_s = thời lượng − tick/60`.
- `src/sim/` **không** được import `three`, DOM hay bất cứ thứ gì cần GPU.
- Mọi ngẫu nhiên đi qua `world.rng` (mulberry32). Không dùng `Math.random()` trong `src/sim/`.
- `game.contract.json` và `TUNING` trong `src/sim/config.js` phải khớp; test sẽ fail nếu lệch.
- CLI: lỗi định dạng/đối số → mã `2`; lỗi runtime → `1`; thành công → `0`.
- Không sửa tay `docs/proof/**/output.jsonl`. Bằng chứng phải sinh lại được bằng `npm run verify`.

## Quy ước

- Comment tiếng Anh trong code, tài liệu tiếng Việt.
- Commit nhỏ, mỗi commit một việc; không force push sau khi đã tag.
- Không thêm dependency vào phần sim. Dependency mới cho render phải thật cần thiết.
- Mọi thay đổi hành vi phải kèm test và cập nhật `docs/notes/`.
- Nếu yêu cầu mơ hồ: ghi giả định vào `docs/notes/`, không tự bịa yêu cầu mới.

## Quy trình mỗi phase

1. Đọc ticket, liệt kê yêu cầu bắt buộc và chỗ mơ hồ.
2. Viết tiêu chí nghiệm thu + cách kiểm chứng trước khi code.
3. Code theo bước nhỏ, chạy `npm test` sau mỗi bước.
4. Chạy `npm run verify`, lưu bằng chứng, ghi nhật ký AI.
5. Cập nhật README/CHANGELOG, tag `phase-N`, push.

## Lỗi đã từng gặp (đừng lặp lại)

- Quên sinh đom đóm/Bóng Mực mặc định khi không có scenario → luôn chạy thử CLI với và không có scenario.
- Test khẳng định "bằng đúng" trong khi bất biến là "lớn hơn hoặc bằng" → viết test theo đúng bất biến.
- Cảnh quá tối và Bóng Mực tới quá sớm → chỉnh sáng/spawn sau khi xem ảnh chụp thật, đừng đoán.
