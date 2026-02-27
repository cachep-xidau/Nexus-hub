# Danh Sách Workflows Theo Phase

[← Danh Sách Agents](./05-danh-sach-agents.md) | [Tiếp: Tùy Chỉnh Agent →](./07-tuy-chinh-agent.md)

---

## Phase 1: Analysis (Tùy chọn)

| Workflow | Lệnh | Agent | Output |
|----------|-------|-------|--------|
| **Brainstorming** | `/bmad-brainstorming` | Mary | `brainstorming-report.md` |
| **Market Research** | `/bmad-bmm-market-research` | Mary | Research documents |
| **Domain Research** | `/bmad-bmm-domain-research` | Mary | Research documents |
| **Technical Research** | `/bmad-bmm-technical-research` | Mary | Research documents |
| **Create Product Brief** | `/bmad-bmm-create-product-brief` | Mary | `product-brief.md` |

## Phase 2: Planning (Bắt buộc)

| Workflow | Lệnh | Agent | Output |
|----------|-------|-------|--------|
| **Create PRD** | `/bmad-bmm-create-prd` | John | `PRD.md` |
| **Validate PRD** | `/bmad-bmm-validate-prd` | John | Validation report |
| **Edit PRD** | `/bmad-bmm-edit-prd` | John | Updated `PRD.md` |
| **Create UX Design** | `/bmad-bmm-create-ux-design` | Sally | `ux-spec.md` |

## Phase 3: Solutioning (Khuyến nghị)

| Workflow | Lệnh | Agent | Output |
|----------|-------|-------|--------|
| **Create Architecture** | `/bmad-bmm-create-architecture` | Winston | `architecture.md` + ADRs |
| **Create Epics & Stories** | `/bmad-bmm-create-epics-and-stories` | John | Epic files |
| **Implementation Readiness** | `/bmad-bmm-check-implementation-readiness` | Winston | PASS / CONCERNS / FAIL |

## Phase 4: Implementation

| Workflow | Lệnh | Agent | Output |
|----------|-------|-------|--------|
| **Sprint Planning** | `/bmad-bmm-sprint-planning` | Bob | `sprint-status.yaml` |
| **Sprint Status** | `/bmad-bmm-sprint-status` | Bob | Status summary |
| **Create Story** | `/bmad-bmm-create-story` | Bob | `story-[slug].md` |
| **Dev Story** | `/bmad-bmm-dev-story` | Amelia | Working code + tests |
| **Code Review** | `/bmad-bmm-code-review` | Amelia | Approved / Changes |
| **QA Automate** | `/bmad-bmm-qa-automate` | Quinn | Test files |
| **Retrospective** | `/bmad-bmm-retrospective` | Bob | Lessons learned |
| **Correct Course** | `/bmad-bmm-correct-course` | Bob | Change proposal |

## Quick Flow (Parallel Track)

| Workflow | Lệnh | Agent |
|----------|-------|-------|
| **Quick Spec** | `/bmad-bmm-quick-spec` | Barry |
| **Quick Dev** | `/bmad-bmm-quick-dev` | Barry |

## Anytime Workflows

| Workflow | Lệnh | Mô tả |
|----------|-------|-------|
| **Help** | `/bmad-help` | Gợi ý bước tiếp theo |
| **Party Mode** | `/bmad-party-mode` | Multi-agent discussion |
| **Document Project** | `/bmad-bmm-document-project` | Scan codebase → docs |
| **Generate Project Context** | `/bmad-bmm-generate-project-context` | Tạo `project-context.md` |
| **Index Docs** | `/bmad-index-docs` | Index cho LLM scanning |
| **Shard Document** | `/bmad-shard-doc` | Chia document lớn |
| **Editorial Review - Prose** | `/bmad-editorial-review-prose` | Review clarity, tone |
| **Editorial Review - Structure** | `/bmad-editorial-review-structure` | Đề xuất restructure |
| **Adversarial Review** | `/bmad-review-adversarial-general` | Tìm 10+ issues |

## Core Tasks (Utility)

| Task | Mô tả |
|------|-------|
| `help` | Help thông minh, detect trạng thái dự án |
| `workflow.xml` | Engine xử lý YAML workflow files |
| `editorial-review-prose.xml` | Copy-editing lâm sàng |
| `editorial-review-structure.xml` | Structural editing |
| `review-adversarial-general.xml` | Review đối nghịch >= 10 issues |
| `shard-doc.xml` | Chia document theo heading |
| `index-docs.xml` | Tạo index.md cho thư mục |
