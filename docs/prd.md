---
stepsCompleted: [merged-from-ba-kit-prd]
classification:
  projectType: Desktop Application / AI Productivity Tool
  domain: Business Analysis / Software Engineering Tools
  complexity: Medium-High
  projectContext: brownfield
inputDocuments: ["ba-kit/docs/03 prd.md", "ba-kit/docs/product-brief.md", "ba-kit/docs/04. architecture.md"]
---

# Product Requirements Document — Nexus Hub

**Author:** Lucas
**Date:** 2026-02-27
**Version:** 1.0
**Project Type:** Desktop Application (Tauri) / AI Productivity Tool
**Project Context:** Brownfield (MVP features migrated from BSA Kit)
**Source:** Merged from BSA Kit PRD v2.1

---

## Executive Summary

**Nexus Hub** là phiên bản desktop local-first của BSA Kit — bộ công cụ AI-First giúp Business System Analyst (BSA) tự động hóa quy trình phân tích yêu cầu phần mềm. Chuyển đổi PRD + Design context thành User Stories, Function List, SRS, ERD, SQL và nhiều artifacts khác với năng suất gấp 10 lần.

| Attribute | Value |
|---|---|
| **Platform** | Tauri 2.x (Rust + WebView) |
| **Frontend** | React + TypeScript + Vite |
| **Database** | SQLite (local, embedded) |
| **AI** | Multi-provider (Google AI, OpenAI, Custom endpoint) |
| **Architecture** | Local-first, zero-server, offline-capable |
| **Security** | Local data only, no cloud dependency |

### Khác Biệt So Với BSA Kit (Web)

| Aspect | BSA Kit (Web) | Nexus Hub (Desktop) |
|---|---|---|
| Deployment | Monorepo (Next.js + Express) | Single Tauri binary |
| Database | SQLite → PostgreSQL (Prisma) | SQLite embedded (tauri-plugin-sql) |
| Auth | Better Auth (v0.2) | Not needed (single-user local) |
| AI | Server-side AI routing | Client-side direct API calls |
| MCP | Server-side MCP Protocol | Local connection configs |
| Monetization | Credit-based SaaS | Free (personal tool) |

### Đối Tượng Tài Liệu

| Vai trò | Sử dụng PRD để |
|---|---|
| **Developer** | Implement features theo specifications |
| **QA/Tester** | Viết test cases từ acceptance criteria |
| **Product Owner** | Validate requirements coverage |
| **BSA (Primary)** | Self-serve tool để tạo artifacts |

### Thuật Ngữ (Glossary)

| Viết tắt | Đầy đủ |
|---|---|
| **BSA** | Business System Analyst |
| **PRD** | Product Requirements Document |
| **ERD** | Entity-Relationship Diagram |
| **DBML** | Database Markup Language |
| **SRS** | Software Requirements Specification |
| **FL** | Function List |
| **FR** | Functional Requirement |
| **NFR** | Non-Functional Requirement |
| **BMAD** | Build Measure Analyze Deliver |

---

## Success Criteria

### User Success

- **Efficiency:** Giảm 70-80% thời gian tạo tài liệu. Full artifact set từ PRD hoàn thành dưới 30 phút.
- **Quality:** Artifacts bao phủ ≥90% edge cases. Tỷ lệ artifact không cần major revision >70%.
- **Usability:** Developer có thể implement và QA viết test case trực tiếp từ spec. App khởi động < 3s.
- **Offline:** Hoạt động hoàn toàn offline (trừ AI calls). Dữ liệu lưu local, không cần internet để xem/edit.

### Technical Success

- Core pipeline (PRD → 10 artifact types) chạy ổn định.
- Multi-provider AI switching trơn tru (Google AI, OpenAI, Custom).
- TypeScript strict mode: 0 errors across toàn bộ codebase.
- SQLite database migrations chạy tự động khi app start.

### Measurable Outcomes

| Metric | Target |
|---|---|
| Time-to-artifact (single) | < 60s |
| App cold start | < 3s |
| UI interaction latency | < 100ms |
| Database query time | < 50ms |
| Full pipeline (10 types) | < 10 phút |

---

## User Journeys

### 1. Minh (Senior BSA) — Artifact Factory

**Scenario:** Minh đang dí deadline viết spec cho sprint kế tiếp — 2 projects cùng lúc.

**Flow:**
1. Mở Nexus Hub → Repo page → Create Project "Cart Service"
2. PRD tab → Paste PRD text hoặc upload .md file
3. Artifacts tab → Tạo Features + Functions theo structure PRD
4. Click "Generate Artifacts" → Chọn 10 loại artifact → AI generate tuần tự
5. Review, chỉnh sửa nhỏ → Xuất báo cáo

**Value:** "Ngày trước mất 2 ngày, giờ mất 30 phút"

### 2. Hà (Junior BSA) — AI Mentor

**Scenario:** Hà mới vào nghề, chả biết viết SRS thế nào cho chuẩn.

**Flow:**
1. Mở project đã có PRD → Analysis tab → Start "Product Brief" session
2. AI hướng dẫn từng bước: Vision, Personas, Features, Metrics
3. Compile & Save → Dùng analysis docs làm input cho artifact generation
4. PRD tab → AI Chat → Hỏi AI review và suggest improvements

**Value:** Có "mentor" kề vai sát cánh 24/7

### 3. Nam (Dev Lead) — Spec Consumer

**Scenario:** Nam nhận spec từ BSA, cần ERD và SQL để deploy.

**Flow:**
1. Mở project → Artifacts tab → Xem ERD (preview mode)
2. Xem SQL Script → Copy paste để deploy local testing
3. Xem User Stories → Check acceptance criteria

**Value:** "Spec làm gì còn kẽ hở"

---

## Product Scope

### MVP Features (v1.0 — Implemented ✅)

| # | Feature | Status |
|---|---|---|
| 1 | **Project CRUD + PRD Storage** | ✅ |
| 2 | **10 Artifact Generation Pipeline** | ✅ |
| 3 | **AI Engine (multi-provider)** | ✅ |
| 4 | **Feature/Function Management** | ✅ |
| 5 | **PRD Chat (6-step BMAD)** | ✅ |
| 6 | **5 Analysis Types (BMAD)** | ✅ |
| 7 | **MCP Connection Management** | ✅ |
| 8 | **Artifact Viewer (preview/raw)** | ✅ |
| 9 | **Dark Mode UI** | ✅ |
| 10 | **Traceability Headers** | ✅ |

### Post-MVP Features (v1.1)

| # | Feature | Priority |
|---|---|---|
| 1 | Skills Library page | P1 |
| 2 | Sidebar project quick-nav | P1 |
| 3 | AI-powered PRD Validation | P2 |
| 4 | Export to Markdown/JSON | P2 |
| 5 | MCP tool execution (Figma data pull) | P2 |
| 6 | Artifact diff/versioning | P3 |
| 7 | Custom prompt templates | P3 |
| 8 | Project export/import | P3 |

---

## Functional Requirements

### Project Management (FR-100)

- **FR-101:** BSA can tạo project mới với tên và mô tả tùy chọn.
- **FR-102:** BSA can liệt kê projects, sắp xếp theo ngày cập nhật.
- **FR-103:** BSA can xem project chi tiết (6 tabs: Overview, PRD, Artifacts, Analysis, Connections, Settings).
- **FR-104:** BSA can cập nhật thông tin project (tên, mô tả, PRD content).
- **FR-105:** BSA can xóa project (cascade xóa artifacts, features, functions, analysis docs).
- **FR-106:** BSA can lưu trữ PRD content dạng text/markdown w/ upload support (.txt, .md).

### Feature & Function Management (FR-200)

- **FR-201:** BSA can tạo Feature groups (module lớn) trong project.
- **FR-202:** BSA can tạo Functions (chức năng cụ thể) trong Feature.
- **FR-203:** Features và Functions hỗ trợ inline editing (tên, mô tả).
- **FR-204:** BSA can xóa Features (cascade xóa Functions + Artifacts liên quan).
- **FR-205:** BSA can xóa Functions (cascade xóa Artifacts liên quan).
- **FR-206:** Hiển thị artifact count badge trên mỗi Function.

### Artifact Generation Pipeline (FR-300)

- **FR-301:** BSA can chọn generate từ 1-10 loại artifact: User Story, Function List, SRS, ERD, SQL, Flowchart, Sequence Diagram, Use Case, Activity Diagram, Screen Description.
- **FR-302:** BSA can chỉ định Feature/Function scope cho generation.
- **FR-303:** Pipeline chạy tuần tự — ERD output feeds into SQL generation.
- **FR-304:** Mỗi artifact bao gồm traceability header (timestamp, AI model, source PRD hash).
- **FR-305:** BSA can xem kết quả (success/fail) sau generation.
- **FR-306:** BSA can xem, preview, và xóa artifacts.
- **FR-307:** Artifact viewer hỗ trợ 2 chế độ: Preview (formatted) và Raw (source).

### AI Engine (FR-400)

- **FR-401:** BSA can cấu hình AI provider qua Settings (API key + endpoint).
- **FR-402:** Hệ thống hỗ trợ 3 providers: Google AI (Gemini), OpenAI, Custom endpoint.
- **FR-403:** AI streaming cho chat responses (PRD Chat + Analysis Chat).
- **FR-404:** AI non-streaming cho artifact generation (higher token limit: 8192).
- **FR-405:** BSA can test API key connectivity trước khi sử dụng.

### PRD Chat (FR-500)

- **FR-501:** BSA can chat với AI để tạo PRD mới theo BMAD 6-step workflow.
- **FR-502:** Chat hỗ trợ streaming responses real-time.
- **FR-503:** Step navigation: BSA can di chuyển giữa 6 sections (Executive Summary → NFR).
- **FR-504:** Compile function: AI tổng hợp conversation thành PRD markdown.
- **FR-505:** Save function: Lưu compiled PRD vào project.
- **FR-506:** BSA can chat với AI để edit PRD hiện có.

### Analysis & Research (FR-600)

- **FR-601:** BSA can chọn 1 trong 5 loại analysis: Brainstorming, Market Research, Domain Research, Technical Research, Product Brief.
- **FR-602:** Mỗi loại có system prompt chuyên biệt (BMAD methodology).
- **FR-603:** Free-form AI chat — không giới hạn bước.
- **FR-604:** Compile & Save: AI tổng hợp conversation thành report → lưu vào DB.
- **FR-605:** BSA can xem danh sách saved analysis documents.
- **FR-606:** BSA can preview và xóa analysis documents.

### Data Connections (FR-700)

- **FR-701:** BSA can thêm connection tới 4 loại nguồn: Confluence, Figma, Notion, Web URL.
- **FR-702:** Mỗi connection lưu: tên, type, URL, API token (encrypted).
- **FR-703:** BSA can toggle connection status (connected/disconnected).
- **FR-704:** BSA can xóa connection.
- **FR-705:** Hiển thị status indicator và tool count trên mỗi connection.

### Dashboard & Navigation (FR-800)

- **FR-801:** Sidebar navigation với 4 sections: AI Chat, Kanban, Repo, Settings.
- **FR-802:** Repo page hiển thị project grid (Active/New sections).
- **FR-803:** Project Detail page 6-tab layout: Overview, PRD, Artifacts, Analysis, Connections, Settings.
- **FR-804:** Overview tab hiển thị stats (PRD status, feature/function/artifact counts) và quick actions.
- **FR-805:** Dark mode UI mặc định.

---

## Non-Functional Requirements

### Performance (NFR-100)

| ID | Requirement | Target |
|---|---|---|
| NFR-101 | App cold start time | < 3s |
| NFR-102 | UI interaction latency | < 100ms |
| NFR-103 | Database query time | < 50ms |
| NFR-104 | Single artifact generation | < 60s |
| NFR-105 | Full pipeline (10 types) | < 10 phút |

### Security (NFR-200)

| ID | Requirement | Target |
|---|---|---|
| NFR-201 | Data storage | Local SQLite only |
| NFR-202 | API keys | Stored in local DB, not transmitted |
| NFR-203 | No cloud dependency | All data stays on device |
| NFR-204 | Input validation | TypeScript strict mode |

### Reliability (NFR-300)

| ID | Requirement | Target |
|---|---|---|
| NFR-301 | AI provider failover | Multi-provider switching |
| NFR-302 | Offline capability | All non-AI features work offline |
| NFR-303 | Data persistence | SQLite with auto-migrations |
| NFR-304 | Graceful degradation | Generate artifacts dù thiếu AI context |

### Maintainability (NFR-400)

| ID | Requirement | Target |
|---|---|---|
| NFR-401 | TypeScript strict mode | 0 errors |
| NFR-402 | Code organization | Component-based architecture |
| NFR-403 | DB migrations | Auto-run on app start (v1, v2, v3) |
| NFR-404 | CSS design system | CSS variables, consistent tokens |

---

## Domain-Specific Requirements

### 1. AI Accuracy & Hallucination Mitigation

- **Zero-Hallucination:** Output SRS/SQL phải tuân thủ nghiêm ngặt PRD và Feature/Function definitions.
- **Traceability:** Mọi artifact sinh ra có metadata header (timestamp, AI model, source hash).
- **Context chaining:** ERD output feeds into SQL generation để đảm bảo consistency.

### 2. Local-First Architecture

- **Data sovereignty:** Toàn bộ project data lưu local. Không gửi dữ liệu lên cloud (trừ AI API calls).
- **Portable:** Single binary, không cần install Node.js, PostgreSQL, hay Docker.
- **Cross-platform:** macOS (primary), Windows, Linux support qua Tauri.

### 3. AI Integration

- **Multi-provider:** Support nhiều AI providers cùng lúc, user tự chọn.
- **Token management:** Max 8192 tokens output cho artifact generation.
- **Streaming:** Real-time streaming cho chat, non-streaming cho generation.

---

## Technical Architecture

### Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Tauri 2.x (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Database | SQLite (tauri-plugin-sql) |
| AI | Direct API calls (fetch) |
| Styling | Vanilla CSS (dark mode) |
| Icons | Lucide React |
| Routing | React Router DOM |

### Database Schema (7 tables)

```
repo_projects → repo_features → repo_functions → repo_artifacts
                                                → repo_analysis_docs
                                                → repo_mcp_connections
                                                → repo_skills
```

All FK cascades enabled. Indexes on project_id, feature_id, function_id.

### File Structure

```
src/
├── pages/          Repo.tsx, ProjectDetail.tsx
├── components/
│   └── repo/       PrdEditor, FeatureTree, ArtifactPanel,
│                   GenerateModal, PrdChat, AnalysisTab,
│                   ConnectionsTab
├── lib/
│   ├── ai.ts       Multi-provider AI (chat + completion)
│   ├── repo-db.ts  25+ CRUD functions
│   └── pipeline/   templates.ts, orchestrator.ts
└── index.css       Design system (~2600 lines)
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| AI output quality inconsistent | High | Allow re-generate, user review before accept |
| AI provider rate limits | Medium | Multi-provider switching, response caching |
| Large PRD exceeds token limit | Medium | Chunking strategy, scope to Feature/Function |
| SQLite concurrent access | Low | Single-user local app |

---

*PRD generated via BMAD Workflow — Merged from BSA Kit PRD v2.1*
*Author: Lucas | Platform: Nexus Hub (Tauri)*
*Date: 2026-02-27*
