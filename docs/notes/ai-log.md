# Nhật ký dùng AI — Phase 1

Công cụ: OpenCode (agent lập trình) + model DeepSeek V4.1 Flash. Không dùng công cụ tạo ảnh/âm thanh; toàn bộ asset là hình học và âm thanh tổng hợp trong code.

## Ước tính token

Không có số đo chính xác từ nhà cung cấp trong phiên này, nên đây là ước tính theo độ dài hội thoại và số file sinh ra:

| Hoạt động | Token vào (ước tính) | Token ra (ước tính) |
|---|---:|---:|
| Đọc PRD-0 + Test Contract, đọc tài liệu lab | 8.000 | 500 |
| Viết lõi sim + CLI + test | 18.000 | 22.000 |
| Viết renderer + HUD + âm thanh | 10.000 | 14.000 |
| Chạy thử, sửa lỗi, chụp ảnh kiểm tra | 12.000 | 6.000 |
| Viết tài liệu, harness, bằng chứng | 6.000 | 8.000 |
| **Tổng Phase 1 (ước tính)** | **~54.000** | **~50.000** |

Cách tiết kiệm đã dùng:
- Đọc contract một lần, chốt toàn bộ giả định vào file trước khi code.
- Viết sim bằng JavaScript thuần để headless không cần build/GPU, tránh vòng sửa engine.
- Test bằng `node:test` (không thêm dependency), chạy nhanh để sửa sớm.
- Chỉ chụp ảnh khi cần kiểm tra ánh sáng/bố cục, không chụp lặp lại.
- Không đưa toàn bộ tài liệu lab vào ngữ cảnh lần thứ hai.

## Những lần AI sai và cách phát hiện

| Lần | AI làm gì | Phát hiện thế nào | Sửa gì |
|---|---|---|---|
| 1 | Khi không có `scenario`, hàm dựng thế giới return sớm nên **không sinh đom đóm/Bóng Mực mặc định** | Chạy CLI smoke với `--ticks 120`, thấy `motes_active: 0`, `shades: []` | Bỏ return sớm, coi scenario rỗng là `{}`; thêm ghi chú vào `AGENTS.md` |
| 2 | Test an toàn của Bóng Mực khẳng định khoảng cách **bằng đúng** `safe_radius`, trong khi bất biến là **lớn hơn hoặc bằng** | `npm test` đỏ | Sửa test theo bất biến, không sửa code cho vừa test |
| 3 | Ảnh chụp đầu tiên quá tối và người chơi đứng yên chết sau ~13 s | Chụp màn hình thật bằng Chrome headless | Tăng sáng nền/trăng, giảm sương, đẩy khoảng cách spawn Bóng Mực ra ≥ 18 m |
| 4 | Case proof `06-fall` đọc snapshot cuối nhưng `--snapshot-every` mặc định 10 nên chỉ có snapshot tick 0 | `npm run verify` báo FAIL "respawn at origin" | Cho case chạy đủ 10 tick để có snapshot sau khi hồi sinh |

Bài học: chạy thật (CLI + ảnh chụp) bắt lỗi nhanh hơn đọc lại code; test phải viết theo bất biến, không theo giá trị tình cờ.

## Phase 2

- Đối chiếu phần triển khai đang có với ticket, ghi tiêu chí nghiệm thu và các bảng dữ liệu còn thiếu.
- Hoàn thiện luồng chiến dịch, tổng điểm, HUD, cảnh báo gió và âm thanh. Cập nhật hướng dẫn tái tạo bằng chứng v1.1.
- Kiểm tra hồi chiêu, thứ tự va chạm và lịch sinh bằng CLI. Kiểm tra tạm dừng, dữ liệu cài đặt, chuyển đêm và tổng điểm bằng Chrome, lưu ảnh và số đo FPS.

## Phase 3

- Viết ADR về đơn vị dầu, thứ tự cập nhật và luật bình minh. Đồng bộ contract với tuning và thêm test cho hút dầu, thắp lại, vùng an toàn và kết quả tick cuối.
- Nối thanh dầu và dấu hiệu đèn tắt vào cảnh 3D. Thêm tùy chọn bảng màu dùng chung giữa HUD và cảnh, lưu cùng cấu hình hiện có.

## Phase 4

- Bổ sung công cụ đo benchmark và soak, kiểm tra bảng điểm dùng chung giữa bản chơi và lệnh xuất.
- Dùng lô hình học cho cảnh đông đối tượng và đồng bộ phần dựng GPU để đưa thời gian hoàn tất khung vào phép đo.
- Kiểm tra đổi phím, chế độ dễ tiếp cận và lưu điểm qua lượt chơi trong Chrome. Ghi demo và đóng gói bản web để chạy trực tiếp với Node.
