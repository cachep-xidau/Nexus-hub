# Quick Reference Card

[← Ví Dụ Quick Flow](./10-vi-du-quick-flow-va-brownfield.md) | [Mục Lục](./README.md)

---

## Lệnh thường dùng nhất

| Mục đích | Lệnh |
|----------|------|
| Không biết làm gì | `/bmad-help` |
| Brainstorm ý tưởng | `/bmad-brainstorming` |
| Tạo Product Brief | `/bmad-bmm-create-product-brief` |
| Tạo PRD | `/bmad-bmm-create-prd` |
| Tạo Architecture | `/bmad-bmm-create-architecture` |
| Tạo Epics & Stories | `/bmad-bmm-create-epics-and-stories` |
| Kiểm tra sẵn sàng | `/bmad-bmm-check-implementation-readiness` |
| Sprint Planning | `/bmad-bmm-sprint-planning` |
| Tạo Story | `/bmad-bmm-create-story` |
| Dev Story | `/bmad-bmm-dev-story` |
| Code Review | `/bmad-bmm-code-review` |
| Quick Spec (nhỏ) | `/bmad-bmm-quick-spec` |
| Quick Dev (nhỏ) | `/bmad-bmm-quick-dev` |
| Thảo luận team | `/bmad-party-mode` |

## Flow chính

```
Ý tưởng → /brainstorming → /create-product-brief
       → /create-prd → /create-ux-design (nếu có UI)
       → /create-architecture → /create-epics-and-stories
       → /check-implementation-readiness
       → /sprint-planning
       → [/create-story → /dev-story → /code-review] × N
       → /retrospective
       → Sản phẩm hoàn chỉnh
```

## File cấu hình quan trọng

| File | Vị trí | Mục đích |
|------|--------|---------|
| Core config | `_bmad/core/config.yaml` | user_name, language |
| BMM config | `_bmad/bmm/config.yaml` | project_name, output paths |
| Agent customization | `_bmad/_config/agents/*.customize.yaml` | Tùy chỉnh agent |
| Workflow manifest | `_bmad/_config/workflow-manifest.csv` | Registry workflows |
| Agent manifest | `_bmad/_config/agent-manifest.csv` | Registry agents |

## Agent → Phase mapping

```
Phase 1 (Analysis):        Mary (Analyst)
Phase 2 (Planning):        John (PM), Sally (UX)
Phase 3 (Solutioning):     Winston (Architect), John (PM)
Phase 4 (Implementation):  Bob (SM), Amelia (Dev), Quinn (QA)
Anytime:                   Barry (Quick Flow), Paige (Writer)
```

## Tài liệu tham khảo

- [BMAD Method GitHub](https://github.com/bmad-code-org/BMAD-METHOD)
- [BMAD Documentation](http://docs.bmad-method.org)
- [Discord Community](https://discord.gg/gk8jAdXWmj)

---

*Antigravity Kit | BMAD 6.0.0-Beta.7 | 2026-02-11*
