# Ghi nguồn (CREDITS)

## Mã nguồn và thư viện

| Thành phần | Giấy phép | Nguồn |
|---|---|---|
| Three.js | MIT | https://threejs.org |
| Vite | MIT | https://vite.dev |
| Phần còn lại của game | MIT (xem `LICENSE`) | Tự viết trong repo này |

## Hình ảnh, mô hình, âm thanh

- **Không dùng asset bên ngoài.** Toàn bộ hình khối (đảo, đá, cỏ, đèn, nhân vật, Bóng Mực, sao, mây) được tạo bằng hình học Three.js trong `src/render/scene.js`.
- Texture quầng sáng và lá bay được vẽ bằng Canvas 2D trong code.
- Âm thanh được tổng hợp bằng WebAudio (oscillator + gain), không dùng file âm thanh hay mẫu có sẵn.

## Công cụ AI

| Công cụ | Dùng để |
|---|---|
| OpenCode (agent lập trình) + model DeepSeek V4.1 Flash | Hỗ trợ viết mã, test, tài liệu; con người đặt yêu cầu, duyệt kế hoạch và kiểm chứng |
| OpenAI Codex | Triển khai, kiểm tra hồi quy, viết tài liệu và tự động ghi hình bản chạy Phase 2–4 |
| Không dùng công cụ sinh ảnh/âm thanh | — |

Nhật ký dùng AI và ước tính token: `docs/notes/ai-log.md`.

Ảnh và video demo Phase 4 ghi từ trình duyệt chạy game. Không dùng hình, giọng đọc hoặc nhạc do AI sinh.

## Nhân vật và bối cảnh

Mây, Đảo Đèn Lồng, Bóng Mực, Đèn Lồng Lớn là nội dung gốc của lab Day 12. Không dùng nhân vật, thương hiệu hay tài sản của game/phim khác.

- Mái ngói, đèn giấy và sắc hổ phách tham khảo không khí lễ hội đèn lồng Hội An. [Vietnam Tourism](https://vietnam.travel/things-to-do/the-best-ways-to-explore-the-ancient-town-of-hoi-an/)
- Nhịp đối lập giữa bóng ma lướt và phép ánh sáng phòng vệ tham khảo phần Ngục nhân Azkaban. Mây, mặt nạ Bóng Mực và bộ phép dùng hình học, tên và hiệu ứng tự tạo. [Dementor](https://www.harrypotter.com/fact-file/creatures/dementor) · [Patronus](https://www.harrypotter.com/features/what-is-a-patronus)
