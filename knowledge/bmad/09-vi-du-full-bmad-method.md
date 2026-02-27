# Ví Dụ: Xây Dựng Sản Phẩm Mới (Full BMad Method)

[← Quy Tắc & Tính Năng](./08-quy-tac-va-tinh-nang-dac-biet.md) | [Tiếp: Ví Dụ Quick Flow →](./10-vi-du-quick-flow-va-brownfield.md)

---

**Bối cảnh:** Xây dựng nền tảng e-learning cho thị trường Đông Nam Á.

## Bước 1: Brainstorming (Phase 1 - Tùy chọn)

```
# Mở chat mới trong Claude Code
/bmad-brainstorming

→ Mary (Analyst): "Chào Lucas! Chủ đề brainstorm hôm nay là gì?"
→ Bạn: "Nền tảng e-learning cho Đông Nam Á, học viên 18-30 tuổi"
→ Mary gợi ý kỹ thuật: SCAMPER, Mind Mapping, Six Thinking Hats
→ Bạn chọn, Mary dẫn dắt qua từng bước
→ Output: brainstorming-report.md
```

## Bước 2: Market Research (Phase 1 - Tùy chọn)

```
# Chat MỚI
/bmad-bmm-market-research

→ Mary dẫn dắt qua 6 steps:
  Step 1: Init - xác định scope research
  Step 2: Customer Behavior - hành vi học viên SEA
  Step 3: Customer Pain Points - đau điểm khi học online
  Step 4: Customer Decisions - yếu tố chọn platform
  Step 5: Competitive Analysis - Coursera, Udemy, local
  Step 6: Research Synthesis - tổng hợp findings

→ Output: market-research.md (trong docs/)
```

## Bước 3: Product Brief (Phase 1 - Khuyến nghị)

```
# Chat MỚI
/bmad-bmm-create-product-brief

→ Mary dẫn dắt qua 6 steps:
  Step 1: Init - kiểm tra artifacts có sẵn
  Step 2: Vision - tầm nhìn, vấn đề giải quyết
  Step 3: Users - personas, user segments
  Step 4: Metrics - KPIs, success criteria
  Step 5: Scope - MVP scope, phases
  Step 6: Complete - lưu file

→ Output: product-brief.md
```

## Bước 4: Create PRD (Phase 2 - Bắt buộc)

```
# Chat MỚI
/bmad-bmm-create-prd

→ John (PM) load Product Brief + Research làm context
→ 12 steps:
  Step 1:  Init
  Step 2:  Discovery - yêu cầu chi tiết
  Step 3:  Success metrics - OKRs, KPIs
  Step 4:  User journeys
  Step 5:  Domain requirements - đặc thù education
  Step 6:  Innovation - tính năng khác biệt
  Step 7:  Project type (SaaS, marketplace...)
  Step 8:  Scoping - MVP vs full
  Step 9:  Functional requirements
  Step 10: Non-functional requirements
  Step 11: Polish - review & hoàn thiện
  Step 12: Complete - lưu PRD.md
```

## Bước 5: UX Design (Phase 2 - Tùy chọn)

```
# Chat MỚI
/bmad-bmm-create-ux-design

→ Sally (UX) load PRD làm context
→ 14 steps: Discovery → Core Experience → Emotional Response
  → Inspiration → Design System → Visual Foundation
  → Design Directions → User Journeys → Component Strategy
  → UX Patterns → Responsive + Accessibility → Complete

→ Output: ux-spec.md
```

## Bước 6: Architecture (Phase 3)

```
# Chat MỚI
/bmad-bmm-create-architecture

→ Winston (Architect) load PRD + UX spec
→ 8 steps: Init → Context → Starter Decisions
  → ADRs → Patterns → Structure → Validation → Complete

→ Output: architecture.md
```

## Bước 7: Epics & Stories (Phase 3)

```
# Chat MỚI
/bmad-bmm-create-epics-and-stories

→ John (PM) load PRD + Architecture + UX
→ 3 steps:
  Step 1: Validate prerequisites
  Step 2: Design Epics - nhóm features
  Step 3: Create Stories - chia thành user stories

→ Output: Epic files trong _bmad-output/planning-artifacts/epics/
```

## Bước 8: Implementation Readiness (Phase 3)

```
# Chat MỚI
/bmad-bmm-check-implementation-readiness

→ Winston review: PRD + Architecture + Epics
→ Kết quả: PASS / CONCERNS / FAIL
→ Nếu FAIL: quay lại sửa, chạy lại
```

## Bước 9: Sprint Planning (Phase 4)

```
# Chat MỚI
/bmad-bmm-sprint-planning

→ Bob (SM) tạo sprint-status.yaml
→ Liệt kê tất cả epics/stories, đánh priority
```

## Bước 10: Build Cycle (Lặp lại cho mỗi story)

```
# Chat MỚI - Tạo story
/bmad-bmm-create-story
→ Bob chuẩn bị story file

# Chat MỚI - Implement
/bmad-bmm-dev-story
→ Amelia (Dev) implement code + tests

# Chat MỚI - Code review
/bmad-bmm-code-review
→ Amelia review: tìm 3-10 issues
→ issues → quay lại dev-story
→ approved → story tiếp theo

# Sau khi hoàn thành epic:
/bmad-bmm-retrospective
→ Bob review epic, rút bài học
```

## Party Mode - Thảo luận quyết định

```
# Chat MỚI
/bmad-party-mode

→ Bạn: "Monolith hay microservices cho MVP e-learning?"

→ Winston: "Bắt đầu monolith. Microservices thêm
   complexity không cần thiết khi 1000 users."

→ John: "Đồng ý. Time to market > scalability lý thuyết."

→ Amelia: "Monolith với clear module boundaries.
   Extract services sau khi cần."

→ Bạn: "Scale khi reach 100K users?"

→ Winston: "Bounded contexts rõ ràng. Extract service
   theo traffic pattern thực tế."
```
