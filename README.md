# Đảo Đèn Lồng

Game 3D góc nhìn thứ ba bằng Three.js và Vite. Hóa thân thành Mây, gom đom đóm và thắp lại Đèn Lồng Lớn qua ba đêm ở Đảo Bến, Đảo Cau và Đảo Chuông.

## Chơi ngay

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Dùng Node.js 22.12+ hoặc 20.19+.

| Điều khiển | Hành động |
|---|---|
| WASD / phím mũi tên | Di chuyển theo hướng camera |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp đom đóm vào đèn gần nhất |
| Q | Tỏa Sáng |
| Kéo / lăn chuột | Xoay / thu phóng camera |
| Esc / P | Tạm dừng |
| R / M | Chơi lại / tắt tiếng |

Đêm 1–3 có lần lượt 5, 6 và 7 đèn, với thời lượng 300, 330 và 360 giây. Mây mang tối đa 10 đom đóm, mỗi đèn cần 10. Tỏa Sáng tốn 3 đom đóm. Bóng Mực làm mất Ngọn Lửa, còn Gió Lạc cướp đom đóm. Bùa Gió tăng tốc chạy và bỏ hồi chiêu Lướt trong 10 giây.

Điểm mỗi đêm gồm 10 điểm mỗi đom đóm nạp, 100 điểm mỗi đèn thắp và 5 điểm mỗi Bóng Mực trúng Tỏa Sáng. Khi thắng, cộng thêm 2 điểm mỗi giây còn lại (làm tròn xuống) và 50 điểm mỗi Ngọn Lửa còn lại. Bình Minh hiển thị tổng điểm của ba đêm đã thắng.

## Headless và kiểm chứng

```bash
node tools/headless.mjs --seed 7 --night 3 --ticks 21600 --out out.jsonl
npm test
npm run verify
npm run build
```

CLI Test Contract v1.1 nhận đêm 1, 2 hoặc 3 và tùy chọn `--scenario`, `--inputs`, `--snapshot-every`. Snapshot tick 0 đứng trước mọi input. CLI dừng khi thắng/thua hoặc đạt số bước yêu cầu, ghi dòng `end` cuối và trả mã 0 (thành công), 1 (lỗi runtime) hoặc 2 (đối số/dữ liệu sai). Cùng seed, scenario và input cho kết quả giống hệt.

- [Test Contract v1.1](game.contract.json)
- [Tiêu chí nghiệm thu Phase 2](docs/notes/phase-2-spec.md)
- [Bằng chứng Phase 2](docs/proof/phase-2/README.md)
- [Bằng chứng lưu trữ Phase 1](docs/proof/phase-1/README.md)

Lõi mô phỏng nằm ở `src/sim/`. Cảnh Three.js, HUD và nhạc tổng hợp Web Audio nằm ở `src/render/`. Dùng `?photo=1&night=3` để xem cảnh minh họa tĩnh hoặc `?play=3` để kiểm tra riêng Đêm 3.

Giấy phép [MIT](LICENSE). Nguồn và công cụ được ghi trong [CREDITS.md](CREDITS.md).
