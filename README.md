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

Mây phải sống tới bình minh và giữ ít nhất **3/5, 4/6, 5/7 đèn sáng** trong ba đêm dài lần lượt 240, 270 và 300 giây. Mỗi đèn cần 10 đom đóm để thắp lần đầu và 5 để thắp lại. Đèn tự hao 1 dầu mỗi giây. Nhấn E gần đèn đang sáng để châm dầu, mỗi đom đóm bổ sung tối đa 10 dầu. Mỗi lần thắp tăng sức chứa thêm 2, từ 10 đến tối đa 20.

Dưới 30 dầu, đèn nhấp nháy, mất vùng an toàn và có thể bị Bóng Mực hút dầu. Tỏa Sáng tốn 3 đom đóm. Gió Lạc cướp đom đóm, còn Bùa Gió tăng tốc chạy và bỏ hồi chiêu Lướt trong 10 giây. Chế độ **Bảng màu dễ phân biệt** nằm trong Cài đặt.

Mỗi đom đóm nạp được 5 điểm. Thắp lần đầu được 100, thắp lại được 40. Tỏa Sáng được 5 điểm mỗi Bóng Mực trúng đòn, hoặc 15 nếu con đó đang hút dầu. Khi thắng, mỗi đèn sáng được thêm 50 điểm cộng phần nguyên lượng dầu còn lại và mỗi Ngọn Lửa được thêm 50. Bình Minh hiển thị tổng điểm của ba đêm đã thắng.

## Headless và kiểm chứng

```bash
node tools/headless.mjs --seed 7 --night 3 --ticks 18000 --out out.jsonl
npm test
npm run verify
npm run build
```

CLI Test Contract v1.2 nhận đêm 1, 2 hoặc 3 và tùy chọn `--scenario`, `--inputs`, `--snapshot-every`. Snapshot tick 0 đứng trước mọi input. CLI dừng khi thắng/thua hoặc đạt số bước yêu cầu, ghi dòng `end` cuối và trả mã 0 (thành công), 1 (lỗi runtime) hoặc 2 (đối số/dữ liệu sai). Cùng seed, scenario và input cho kết quả giống hệt.

- [Test Contract v1.2](game.contract.json)
- [Quyết định thiết kế và tiêu chí nghiệm thu Phase 3](docs/notes/phase-3-adr.md)
- [Bằng chứng Phase 3](docs/proof/phase-3/README.md)
- [Bằng chứng Phase 2](docs/proof/phase-2/README.md)
- [Bằng chứng lưu trữ Phase 1](docs/proof/phase-1/README.md)

Lõi mô phỏng nằm ở `src/sim/`. Cảnh Three.js, HUD và nhạc tổng hợp Web Audio nằm ở `src/render/`. Dùng `?photo=1&night=3` để xem cảnh minh họa tĩnh hoặc `?play=3` để kiểm tra riêng Đêm 3.

Giấy phép [MIT](LICENSE). Nguồn và công cụ được ghi trong [CREDITS.md](CREDITS.md).
