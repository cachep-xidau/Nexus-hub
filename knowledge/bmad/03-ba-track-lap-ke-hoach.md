# Ba Track Lập Kế Hoạch

[← Kiến Trúc](./02-kien-truc-he-thong.md) | [Tiếp: Workflow-Agent-Skill →](./04-workflow-agent-skill-reference.md)

---

## So sánh 3 tracks

| Track | Phù hợp cho | Documents tạo ra | Phases sử dụng |
|-------|-------------|-------------------|----------------|
| **Quick Flow** | Bug fix, feature nhỏ, scope rõ ràng (1-15 stories) | Tech-spec | 2 → 4 |
| **BMad Method** | Sản phẩm, platform, feature phức tạp (10-50+ stories) | PRD + Architecture + UX | 1 → 2 → 3 → 4 |
| **Enterprise** | Compliance, multi-tenant (30+ stories) | PRD + Architecture + Security + DevOps | 1 → 2 → 3 → 4 |

> Story counts là hướng dẫn, không phải định nghĩa. Chọn track dựa trên nhu cầu planning.

## Quick Flow

```
/bmad-bmm-quick-spec → /bmad-bmm-quick-dev → /bmad-bmm-code-review
```

- Bỏ qua Phase 1, 2, 3
- 3 lệnh, 1 agent (Barry - Quick Flow Solo Dev)
- Phù hợp: bug fix, refactoring, feature nhỏ, prototyping

## BMad Method (Full)

```
/brainstorming → /create-product-brief
→ /create-prd → /create-ux-design
→ /create-architecture → /create-epics-and-stories
→ /check-implementation-readiness
→ /sprint-planning
→ [/create-story → /dev-story → /code-review] × N
→ /retrospective
```

- Đầy đủ 4 phases
- 9 agents phối hợp
- Phù hợp: sản phẩm mới, major features, multi-team

## Khi nào dùng track nào?

| Tình huống | Track |
|-----------|-------|
| Fix 1 bug cụ thể | Quick Flow |
| Thêm nút "Export PDF" | Quick Flow |
| Xây module thanh toán | BMad Method |
| Rebuild toàn bộ frontend | BMad Method |
| Hệ thống HIPAA compliance | Enterprise |
| MVP cho startup | BMad Method |
