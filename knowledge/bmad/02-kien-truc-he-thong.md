# Kiến Trúc Hệ Thống

[← Tổng Quan](./01-tong-quan-bmad-method.md) | [Tiếp: Ba Track →](./03-ba-track-lap-ke-hoach.md)

---

## Cấu trúc 2 lớp module

```
_bmad/
├── core/                    ← Nền tảng cốt lõi
│   ├── agents/              ← BMad Master (orchestrator)
│   ├── workflows/           ← Brainstorming, Party Mode, Advanced Elicitation
│   ├── tasks/               ← Help, Editorial Review, Shard Doc...
│   └── config.yaml          ← Cấu hình ngôn ngữ, tên user
│
├── bmm/                     ← BMad Method Module (vòng đời sản phẩm)
│   ├── agents/              ← 9 agent chuyên biệt
│   ├── workflows/           ← 34+ workflow theo 4 phase
│   │   ├── 1-analysis/      ← Research, Product Brief
│   │   ├── 2-plan-workflows/← PRD, UX Design
│   │   ├── 3-solutioning/   ← Architecture, Epics & Stories
│   │   ├── 4-implementation/← Sprint, Dev, Code Review
│   │   └── bmad-quick-flow/ ← Quick Spec, Quick Dev
│   ├── data/                ← Templates
│   └── teams/               ← Cấu hình team
│
├── _config/                 ← Manifests & Agent customization
│   ├── workflow-manifest.csv
│   ├── agent-manifest.csv
│   ├── task-manifest.csv
│   └── agents/*.customize.yaml
│
├── _memory/                 ← Agent memory (persistent context)
└── _bmad-output/            ← Output artifacts
    ├── planning-artifacts/  ← PRD, Architecture, Epics
    └── implementation-artifacts/ ← Stories, Sprint Status
```

## Bốn giai đoạn phát triển (4 Phases)

BMAD xây dựng context theo kiểu **progressive** -- mỗi phase tạo ra tài liệu (artifact) làm input cho phase tiếp theo:

```
Phase 1: ANALYSIS (Tùy chọn)
    │  Brainstorming → Research → Product Brief
    ▼
Phase 2: PLANNING (Bắt buộc)
    │  PRD (Yêu cầu sản phẩm) → UX Design (nếu có UI)
    ▼
Phase 3: SOLUTIONING (Khuyến nghị)
    │  Architecture → Epics & Stories → Implementation Readiness Check
    ▼
Phase 4: IMPLEMENTATION
    │  Sprint Planning → [Create Story → Dev Story → Code Review] × N
    │  → Retrospective → Tiếp tục Epic tiếp theo
    ▼
    Sản phẩm hoàn chỉnh
```

## Context Management

PRD nói cho Architect biết ràng buộc gì quan trọng. Architecture nói cho Dev agent patterns nào phải tuân theo. Story files cung cấp context đầy đủ, tập trung cho implementation.

**Không có cấu trúc này → agents đưa ra quyết định không nhất quán.**

| Workflow | Context tự động load |
|----------|---------------------|
| `create-story` | epics, PRD, architecture, UX |
| `dev-story` | story file |
| `code-review` | architecture, story file |
| `quick-spec` | planning docs (nếu có) |
| `quick-dev` | tech-spec |

Tất cả implementation workflows đều load `project-context.md` nếu tồn tại.

## Tại sao Solutioning quan trọng?

**Không có Solutioning:**
```
Agent 1 implement Epic 1 dùng REST API
Agent 2 implement Epic 2 dùng GraphQL
→ Kết quả: API design không nhất quán, tích hợp nightmare
```

**Có Solutioning:**
```
Architecture workflow quyết định: "Dùng GraphQL cho tất cả APIs"
Tất cả agents tuân theo architecture decisions
→ Kết quả: Implementation nhất quán, tích hợp suôn sẻ
```

Phát hiện alignment issues trong solutioning nhanh gấp **10x** so với phát hiện khi đang implementation.
