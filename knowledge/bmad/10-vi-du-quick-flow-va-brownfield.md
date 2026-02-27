# Ví Dụ: Quick Flow Và Brownfield

[← Ví Dụ Full BMad](./09-vi-du-full-bmad-method.md) | [Tiếp: Quick Reference →](./11-quick-reference-card.md)

---

## Ví Dụ 1: Fix bug / Feature nhỏ (Quick Flow)

**Bối cảnh:** Thêm chức năng "forgot password" vào hệ thống đã có.

```
# Chat MỚI
/bmad-bmm-quick-spec

→ Barry (Quick Flow Solo Dev):
  1. Hỏi mô tả thay đổi cần làm
  2. Scan codebase hiện tại (nếu có)
  3. Tạo tech-spec.md với stories

→ Output: tech-spec.md

# Chat MỚI
/bmad-bmm-quick-dev

→ Barry implement theo tech-spec
→ Code + tests

# (Tùy chọn) Chat MỚI
/bmad-bmm-code-review

→ Barry review code vừa viết
```

## Ví Dụ 2: Dự án brownfield (đã có code)

**Bối cảnh:** Codebase Next.js đã chạy, cần thêm module thanh toán.

```
# Bước 1: Document dự án hiện tại
/bmad-bmm-document-project

→ Mary scan toàn bộ codebase, tạo documentation
→ Output: docs/project-documentation.md

# Bước 2: Generate project context cho AI agents
/bmad-bmm-generate-project-context

→ Mary tạo project-context.md (lean, optimized cho LLM)
→ Chứa: conventions, patterns, critical rules
→ Tất cả implementation workflows auto-load file này

# Bước 3: Tùy theo scope
# Scope nhỏ → Quick Flow
/bmad-bmm-quick-spec

# Scope lớn → Full BMad Method
/bmad-bmm-create-prd   # Agent đọc project docs tự động
```

## Ví Dụ 3: Dùng Help khi không biết phải làm gì

```
/bmad-help

→ BMAD Help detect trạng thái dự án:
  ✅ Research đã có (RESEARCH-bluebelt-miyauchi.md)
  ❌ Product Brief chưa có
  ❌ PRD chưa có
  ❌ Architecture chưa có

→ Gợi ý: "Bạn đã có research. Bước tiếp theo khuyến nghị
   là /bmad-bmm-create-product-brief.
   Hoặc nhảy thẳng vào /bmad-bmm-create-prd."
```

## Ví Dụ 4: Tùy chỉnh agent cho dự án Việt Nam

```yaml
# File: _bmad/_config/agents/bmm-pm.customize.yaml

agent:
  metadata:
    name: 'Minh'

persona:
  role: 'Product Manager chuyên SaaS B2B tại Việt Nam'
  identity: 'Hiểu sâu thị trường APAC, đặc biệt SEA'
  communication_style: 'Trực tiếp, dùng data, mix Việt-Anh'
  principles:
    - 'Ưu tiên mobile-first cho thị trường VN'
    - 'Xem xét payment gateway local (VNPay, MoMo, ZaloPay)'
    - 'Compliance PDPA/cybersecurity law VN'

memories:
  - 'Dự án Antigravity targeting Vietnamese SMEs'
  - 'Competitors: Base.vn, Lark, 1Office'
  - 'Budget constraint: bootstrap, optimize cost'
```

Sau đó chạy `npx bmad-method install` → Chọn "Rebuild Agents".
