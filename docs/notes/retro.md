# Retro — Phase 1

## Kết quả

- 33 unit/CLI test PASS (`npm test`).
- 9/9 case bằng chứng PASS (`npm run verify`), gồm một lượt chơi thật nhặt 15 đom đóm và thắp 5 đèn để thắng.
- Tất định: hai lần chạy cùng seed cho sha256 giống nhau.
- Headless chạy không GPU, đúng 60 tick/giây, exit code 0/2 đúng contract.

## Yêu cầu đạt / chưa đạt

| Yêu cầu | Trạng thái |
|---|---|
| Một màn Đêm 1, đảo tròn, 5 đèn | Đạt |
| Đi lại, nhảy, camera 3D xoay được | Đạt |
| Đom đóm rải rác, nhặt, mang tối đa 5 | Đạt |
| Nạp đủ 3 đom đóm để thắp đèn | Đạt |
| Bóng Mực đuổi, gây sát thương, sợ đèn | Đạt |
| Tỏa sáng xua Bóng Mực, tốn ánh sáng, hồi chiêu | Đạt |
| Thắng/thua, điểm số, HUD | Đạt |
| Chơi lại sau khi thắng/thua | Đạt (nút + phím R) |
| Âm thanh | Đạt (tổng hợp WebAudio, có thể tắt bằng M) |
| Đồ họa "đơn giản nhưng đẹp" | Đạt ở mức đủ; chưa có animation phong phú cho Bóng Mực |

Không có yêu cầu nào của Phase 1 bị bỏ dở. Chưa có video demo vì video thuộc Phase 4.

## AI sai ở đâu

Xem bảng trong [ai-log.md](ai-log.md). Hai lỗi đáng nhớ:

1. **Quên đường mặc định**: AI chỉ sinh thực thể khi có scenario, nên bản chạy mặc định rỗng. Chỉ phát hiện khi chạy CLI thật.
2. **Test theo giá trị tình cờ** thay vì theo bất biến. Đã sửa test, không sửa code để chiều test.

## Harness đã chỉnh

- Thêm `AGENTS.md` với bất biến contract và danh sách lỗi đã gặp.
- Thêm `npm test`, `npm run verify` để kiểm chứng không phụ thuộc trí nhớ.
- Thêm CI chạy test + verify mỗi lần push; pre-commit hook chạy test.
- Thêm skill `verify-game` để nhắc lại quy trình kiểm chứng.

## Nếu làm lại

- Viết `scenario` mẫu cho từng yêu cầu **trước** khi code, dùng luôn làm test.
- Dựng một ảnh chụp tự động sớm hơn để bắt lỗi ánh sáng, thay vì chỉnh sau.
- Giữ `flames = 5` nhưng cân nhắc cho đèn sáng hồi 1 lửa ở phase sau nếu người chơi thấy quá khó.

## Token

Ước tính Phase 1: ~54k token vào, ~50k token ra. Cách tiết kiệm: chốt giả định trước khi code, test bằng `node:test`, chỉ chụp ảnh khi cần.
