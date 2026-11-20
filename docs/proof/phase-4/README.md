# Bằng chứng Phase 4 — Test Contract v1.3

| Kiểm tra | Kết quả cục bộ |
|---|---|
| `npm test` | 77/77 test |
| `npm run verify` | 31/31 ca CLI. 36 tệp JSONL trùng với bằng chứng Phase 3 sau khi chuẩn hóa xuống dòng. |
| Bench seed 42 | 4.487 khung trong khoảng đo 30 s, sau 3 s khởi động. Trung bình 149,556 FPS, 1% thấp nhất 37,796 FPS, p95 11,9 ms, tải 1.820 ms. [bench.json](bench.json) |
| Soak seed 7 | 10 đêm, 0 crash. RSS 52,23 → 56,69 MiB, tăng 8,5%. [soak.json](soak.json) |
| ZIP web | Giải nén vào thư mục tạm và khởi chạy bằng Node mà không cài dependency. Kiểm tra HTTP cho game, benchmark, module JS và API bảng điểm. |

Benchmark chạy Chrome cửa sổ, viewport 1280×720 DPR 1, GPU Intel UHD Graphics qua ANGLE/D3D11 trên Windows. Cờ GPU vsync và giới hạn khung của Chromium được tắt, mỗi khung đợi WebGL hoàn tất công việc GPU. Kết quả chấm phụ thuộc máy chuẩn của giảng viên.

## Kiểm tra trong trình duyệt

- Chơi thật Đêm 1 bằng bàn phím. Xác nhận thông báo Bóng Mực và mũi tên hướng xuất hiện. [HUD](gameplay.png)
- Đổi Nhảy từ Space sang J, báo trùng khi thử W, lưu qua tải lại và khôi phục. Chữ giao diện đo 18 px mặc định và 22,5 px ở chế độ chữ lớn. [Đổi phím](controls.png)
- Dùng fixture trình duyệt để kiểm tra cùng lúc thông báo gió sắp thổi, dầu thấp và 10 giây cuối, đồng thời xác nhận Giảm chuyển động tắt chớp khi bị đánh. [Các chỉ báo](visual-warnings.png)
- Sau lần thua thực tế, lưu tên thử và đối chiếu màn xếp hạng với JSON xuất từ kho đĩa. Fixture Bình Minh kiểm tra form lưu và tổng điểm ba đêm thắng. [Bảng xếp hạng](leaderboard.png)
- Demo MP4/H.264 dài 50,82 giây, ghi lượt chơi thật, lưu điểm, cảnh benchmark và số đo đã chạy. [Video](../../demo/demo.mp4)
