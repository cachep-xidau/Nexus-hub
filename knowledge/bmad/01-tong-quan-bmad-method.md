# Tổng Quan BMAD Method

[← Mục Lục](./README.md) | [Tiếp: Kiến Trúc Hệ Thống →](./02-kien-truc-he-thong.md)

---

## BMAD là gì?

**BMAD** (**B**reakthrough **M**ethod of **A**gile AI **D**riven Development) là một framework phát triển phần mềm dựa trên AI, cung cấp hệ thống agent chuyên biệt, workflow có hướng dẫn, và khả năng lập kế hoạch thông minh tự điều chỉnh theo độ phức tạp của dự án.

**Triết lý cốt lõi:** Các công cụ AI truyền thống "nghĩ thay" bạn và tạo ra kết quả trung bình. BMAD agent hoạt động như **cộng tác viên chuyên gia** -- hướng dẫn bạn qua quy trình có cấu trúc để kích thích tư duy tốt nhất của bạn trong sự phối hợp với AI.

## Đặc điểm chính

| Đặc điểm | Mô tả |
|-----------|-------|
| **Scale-Domain-Adaptive** | Tự động điều chỉnh độ sâu planning theo độ phức tạp dự án. Một ứng dụng hẹn hò SaaS có nhu cầu khác với hệ thống chẩn đoán y tế |
| **Structured Workflows** | Dựa trên best practices agile: phân tích, lập kế hoạch, kiến trúc, triển khai |
| **Specialized Agents** | 9+ agent chuyên gia (PM, Architect, Developer, UX, Scrum Master, QA...) |
| **Party Mode** | Đưa nhiều agent vào cùng một phiên để thảo luận, lập kế hoạch, troubleshoot |
| **Complete Lifecycle** | Từ brainstorming đến deployment, BMAD đồng hành mọi bước |

## Module mở rộng

Ngoài BMM (core agile), BMAD có thêm các module tùy chọn:

| Module | Mục đích |
|--------|---------|
| **BMad Builder (BMB)** | Tạo agent, workflow, module tùy chỉnh |
| **Test Architect (TEA)** | Test strategy cấp enterprise, quality gates |
| **Game Dev Studio (BMGD)** | Phát triển game cho Unity, Unreal, Godot |
| **Creative Intelligence Suite (CIS)** | Innovation, design thinking, brainstorming nâng cao |

## Cài đặt

```bash
npx bmad-method install
```

Chọn module **BMad Method** khi được hỏi. Installer tạo 2 thư mục:
- `_bmad/` -- agents, workflows, tasks, cấu hình
- `_bmad-output/` -- nơi lưu artifacts

Mở AI IDE (Claude Code, Cursor, Windsurf) trong project folder, gõ `/bmad-help` để bắt đầu.
