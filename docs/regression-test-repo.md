---
title: Regression Test Manual — Repo Feature
version: 1.0
date: 2026-02-27
tester: _________________
environment: Nexus Hub (Tauri) — macOS
source: PRD v1.0 (docs/prd.md)
---

# Regression Test Manual — Repo Feature

## Test Environment

| Item | Value |
|------|-------|
| Application | Nexus Hub (Tauri Desktop) |
| OS | macOS |
| AI Provider | Google AI / OpenAI / Custom (cần có API key hợp lệ) |
| Database | SQLite (embedded, auto-migration) |

### Pre-conditions

- App đã được build và chạy thành công (`npm run tauri dev`)
- Ít nhất 1 AI provider đã được cấu hình trong Settings
- API key đã test thành công

---

## TC-100: Project Management

### TC-101: Tạo Project Mới

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Navigate to Repo page (sidebar) | Repo page hiển thị project grid | ☐ |
| 2 | Click "New Project" button | Modal tạo project hiện ra | ☐ |
| 3 | Nhập tên project "Test Project" | Input nhận text | ☐ |
| 4 | Nhập mô tả "Test description" | Textarea nhận text | ☐ |
| 5 | Click "Create" | Modal đóng, project card xuất hiện trong grid | ☐ |
| 6 | Kiểm tra project card | Hiển thị tên, mô tả, timestamp | ☐ |

### TC-102: Tạo Project — Validation

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Mở modal tạo project | Modal hiện | ☐ |
| 2 | Để trống tên, click Create | Không tạo được (button disabled hoặc error) | ☐ |
| 3 | Nhập chỉ tên, bỏ trống mô tả | Tạo thành công (mô tả optional) | ☐ |

### TC-103: Xem Danh Sách Projects

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Tạo 3 projects (A, B, C) | 3 cards hiển thị trong grid | ☐ |
| 2 | Cập nhật project B | B di chuyển lên đầu (sort by updated_at DESC) | ☐ |
| 3 | Kiểm tra counter badges | Feature/Artifact/Connection counts hiển thị đúng | ☐ |

### TC-104: Xóa Project

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click delete trên project card | Confirmation prompt hiện | ☐ |
| 2 | Confirm delete | Project biến mất khỏi grid | ☐ |
| 3 | Navigate vào project cũ (nếu có URL) | Hiển thị "Project not found" | ☐ |

### TC-105: Cascade Delete

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Tạo project → thêm Feature → thêm Function → generate artifact | All entities exist | ☐ |
| 2 | Xóa project | Tất cả features, functions, artifacts bị xóa theo | ☐ |
| 3 | Verify trong DB (nếu accessible) | Không còn records orphan | ☐ |

---

## TC-200: Project Detail — Tab Navigation

### TC-201: 6-Tab Layout

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click vào project card từ Repo page | ProjectDetail page load, Overview tab active | ☐ |
| 2 | Click tab "PRD" | PRD editor hiển thị | ☐ |
| 3 | Click tab "Artifacts" | Feature tree + Artifact panel hiển thị | ☐ |
| 4 | Click tab "Analysis" | Analysis cards grid hiển thị | ☐ |
| 5 | Click tab "Connections" | Connections list hiển thị | ☐ |
| 6 | Click tab "Settings" | Settings form hiển thị | ☐ |
| 7 | Click back arrow | Navigate về Repo page | ☐ |

### TC-202: Overview Tab — Stats & Actions

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Xem Overview tab | Stats cards: PRD status, feature count, function count, artifact count | ☐ |
| 2 | Click "Edit PRD" action card | Switch to PRD tab | ☐ |
| 3 | Click "Manage Features" action card | Switch to Artifacts tab | ☐ |
| 4 | Nếu PRD có + features > 0: "Generate Artifacts" button | Visible, click opens GenerateModal | ☐ |
| 5 | PRD preview section | Hiển thị 500 ký tự đầu của PRD content | ☐ |

---

## TC-300: PRD Editor

### TC-301: Nhập PRD Text

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Navigate to PRD tab | Editor hiển thị (textarea hoặc editor) | ☐ |
| 2 | Nhập/paste PRD text | Text xuất hiện trong editor | ☐ |
| 3 | Click Save | PRD content lưu vào DB | ☐ |
| 4 | Refresh page → PRD tab | PRD content vẫn hiển thị đúng | ☐ |

### TC-302: Upload File

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click Upload button | File picker hiện | ☐ |
| 2 | Chọn file .txt | File content load vào editor | ☐ |
| 3 | Chọn file .md | File content load vào editor | ☐ |
| 4 | Save → Refresh → Verify | Content persisted | ☐ |

### TC-303: Preview Mode

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Nhập PRD text có markdown | Text hiển thị trong editor | ☐ |
| 2 | Click Preview toggle | Rendered markdown view | ☐ |
| 3 | Click Edit toggle | Quay lại editor mode | ☐ |

### TC-304: AI Chat Button

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Trên PRD tab, thấy "AI Chat" button | Button visible ở góc phải | ☐ |
| 2 | Click "AI Chat" | PrdChat panel slide vào từ bên phải | ☐ |
| 3 | Close PrdChat panel | Panel biến mất | ☐ |

---

## TC-400: Feature & Function Management

### TC-401: Tạo Feature

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Navigate to Artifacts tab | Feature tree hiển thị | ☐ |
| 2 | Click "Add Feature" | Inline input xuất hiện | ☐ |
| 3 | Nhập tên "User Management" → Enter/Submit | Feature node xuất hiện trong tree | ☐ |
| 4 | Tạo thêm 2 features | 3 features trong tree, đúng thứ tự | ☐ |

### TC-402: Tạo Function

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Expand Feature node | Add Function button hiện | ☐ |
| 2 | Click Add Function | Inline input xuất hiện | ☐ |
| 3 | Nhập tên "Login" → Submit | Function node xuất hiện dưới Feature | ☐ |
| 4 | Tạo thêm functions | Multiple functions hiển thị đúng hierarchy | ☐ |

### TC-403: Inline Edit

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click edit icon trên Feature | Tên chuyển thành input editable | ☐ |
| 2 | Sửa tên → Confirm | Tên cập nhật | ☐ |
| 3 | Click edit icon trên Function | Tên chuyển thành input editable | ☐ |
| 4 | Sửa tên → Confirm | Tên cập nhật | ☐ |

### TC-404: Delete Feature (Cascade)

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Tạo Feature + 3 Functions + generate artifacts | All entities exist | ☐ |
| 2 | Delete Feature | Feature, Functions, và Artifacts liên quan bị xóa | ☐ |

### TC-405: Delete Function

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Delete Function | Function bị xóa, Feature vẫn còn | ☐ |
| 2 | Artifact badge count update | Count giảm tương ứng | ☐ |

### TC-406: Artifact Count Badge

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Function chưa có artifact | Badge hiển thị "0" hoặc ẩn | ☐ |
| 2 | Generate 3 artifacts cho Function | Badge hiển thị "3" | ☐ |
| 3 | Xóa 1 artifact | Badge giảm | ☐ |

---

## TC-500: Artifact Generation Pipeline

### TC-501: Mở GenerateModal

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Có PRD + ≥1 Feature | "Generate Artifacts" button visible | ☐ |
| 2 | Click button | GenerateModal opens | ☐ |
| 3 | Modal hiển thị: provider info, scope selectors, type checkboxes | All elements present | ☐ |

### TC-502: Scope Selection

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Feature dropdown | Liệt kê tất cả features | ☐ |
| 2 | Chọn Feature → Function dropdown | Liệt kê functions của Feature đã chọn | ☐ |
| 3 | Chọn Function | Scope set đúng | ☐ |

### TC-503: Artifact Type Selection

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | 10 artifact type checkboxes hiển thị | All 10 types visible | ☐ |
| 2 | Check/uncheck individual types | Toggle works | ☐ |
| 3 | Không chọn type nào → Generate | Button disabled hoặc error | ☐ |

### TC-504: Generation Flow

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Chọn 2-3 types → Click Generate | Progress bar hiển thị | ☐ |
| 2 | Trong quá trình generate | Progress text cập nhật (e.g., "Generating ERD...") | ☐ |
| 3 | Hoàn thành | Results summary: success count + fail count | ☐ |
| 4 | Từng result item | Icon ✅/❌ + tên artifact type | ☐ |

### TC-505: ERD → SQL Chaining

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Chọn cả ERD và SQL types | Generate starts | ☐ |
| 2 | ERD generate trước | ERD content cached | ☐ |
| 3 | SQL generate sau | SQL uses ERD output as context input | ☐ |
| 4 | SQL output | Consistent với ERD entities/relationships | ☐ |

### TC-506: Traceability Headers

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Generate artifact bất kỳ | Artifact created | ☐ |
| 2 | Xem artifact content (raw view) | YAML header có timestamp, AI model | ☐ |

---

## TC-600: Artifact Viewer

### TC-601: Artifact Tree

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Artifacts tab → ArtifactPanel | Tree structure: Feature → Function → Artifacts | ☐ |
| 2 | Expand/collapse nodes | Toggle works | ☐ |
| 3 | Click artifact | Viewer opens | ☐ |

### TC-602: Preview / Raw Toggle

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Open artifact | Default view (preview or raw) | ☐ |
| 2 | Toggle to Raw | Source markdown visible | ☐ |
| 3 | Toggle to Preview | Formatted content visible | ☐ |

### TC-603: Delete Artifact

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click delete trên artifact | Confirmation | ☐ |
| 2 | Confirm | Artifact removed từ tree | ☐ |

---

## TC-700: PRD Chat

### TC-701: Open/Close Chat Panel

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | PRD tab → "AI Chat" button | PrdChat panel slides in từ phải | ☐ |
| 2 | Panel width = 420px | Correct width | ☐ |
| 3 | Click X button | Panel closes | ☐ |

### TC-702: Initial Greeting

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Open chat (project chưa có PRD) | Greeting "Tôi sẽ giúp bạn tạo PRD..." | ☐ |
| 2 | Hiển thị 6 steps | Executive Summary → NFR listed | ☐ |
| 3 | Open chat (project đã có PRD) | Greeting "chỉnh sửa PRD" | ☐ |

### TC-703: Step Indicators

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | 6 step circles hiển thị | All 6 visible | ☐ |
| 2 | Current step highlighted (active) | Purple/accent color | ☐ |
| 3 | Click Next Step button | Step indicator advances | ☐ |

### TC-704: Chat Conversation

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Nhập message → Send | User bubble (phải, accent color) | ☐ |
| 2 | AI responds | Assistant bubble (trái, card bg) + streaming | ☐ |
| 3 | Shift+Enter trong textarea | Newline (không gửi) | ☐ |
| 4 | Enter trong textarea | Gửi message | ☐ |
| 5 | Trong lúc AI đang trả lời | "Đang suy nghĩ..." indicator + input disabled | ☐ |

### TC-705: Compile & Save PRD

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Chat qua đủ 6 steps | Next step advances to compile | ☐ |
| 2 | Compile triggers | AI tổng hợp PRD markdown | ☐ |
| 3 | Compiled preview hiển thị | PRD markdown visible | ☐ |
| 4 | Click "Save PRD" | PRD lưu vào project | ☐ |
| 5 | Đóng chat → PRD tab | PRD content hiển thị đúng | ☐ |

---

## TC-800: Analysis Tab

### TC-801: Analysis Type Cards

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Navigate to Analysis tab | 5 analysis type cards: Brainstorming, Market Research, Domain Research, Technical Research, Product Brief | ☐ |
| 2 | Cards có icon, name, description | All elements present | ☐ |
| 3 | Hover card | Hover effect (border highlight, lift) | ☐ |

### TC-802: Start Analysis Session

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click "Brainstorming" card | Chat view mở, greeting hiển thị | ☐ |
| 2 | Greeting text | "...thực hiện Brainstorming cho project..." | ☐ |
| 3 | Chat input visible | Textarea + Send button | ☐ |

### TC-803: Analysis Chat

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Send message | User bubble + AI streaming response | ☐ |
| 2 | Multiple messages | Conversation flows naturally | ☐ |
| 3 | Scroll behavior | Auto-scroll to latest message | ☐ |

### TC-804: Compile & Save Document

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Chat ≥2 messages → "Compile & Save" button | Button enabled | ☐ |
| 2 | Click Compile & Save | AI compiles report → saved to DB | ☐ |
| 3 | Returns to Analysis tab | Document visible in "Saved Documents" | ☐ |

### TC-805: Document Management

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Saved Documents list | Shows type badge, title | ☐ |
| 2 | Click eye icon | Preview panel opens with content | ☐ |
| 3 | Click trash icon | Document deleted | ☐ |
| 4 | Close preview | Preview panel closes | ☐ |

### TC-806: Close Analysis Chat

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click X trên analysis chat | Returns to analysis cards view | ☐ |
| 2 | Conversation discarded | No document saved | ☐ |

---

## TC-900: Data Connections

### TC-901: Empty State

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Navigate to Connections tab (no connections) | Empty state: Plug icon + "No Connections" message | ☐ |
| 2 | "Add Connection" button visible | Button present | ☐ |

### TC-902: Add Connection

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click "Add Connection" | Modal opens | ☐ |
| 2 | 4 connection types visible | Confluence, Figma, Notion, Web URL | ☐ |
| 3 | Select "Confluence" | Card highlighted, name auto-fills | ☐ |
| 4 | Fill URL + Token | Inputs accept text | ☐ |
| 5 | Click Create | Connection created, modal closes | ☐ |
| 6 | Connection item in list | Name, type badge, status (disconnected) | ☐ |

### TC-903: Toggle Connection Status

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click toggle button (disconnected→connected) | Status changes to "connected" (green) | ☐ |
| 2 | Click toggle again | Status changes to "disconnected" | ☐ |

### TC-904: Delete Connection

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click trash icon | Confirmation prompt | ☐ |
| 2 | Confirm | Connection removed from list | ☐ |

### TC-905: Multiple Connections

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Add 3 connections (different types) | All 3 visible in list | ☐ |
| 2 | Each has correct icon (FileText/Figma/Database/Globe) | Icons match type | ☐ |

---

## TC-1000: Settings Tab

### TC-1001: Edit Project Info

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Navigate to Settings tab | Form pre-filled with current name/description | ☐ |
| 2 | Change name → "Save Changes" | Name updated | ☐ |
| 3 | Change description → "Save Changes" | Description updated | ☐ |
| 4 | Navigate away → back | Changes persisted | ☐ |

### TC-1002: Delete Project from Settings

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click "Delete Project" button | Confirmation | ☐ |
| 2 | Confirm | Redirect to Repo page, project gone | ☐ |

---

## TC-1100: Navigation & Routing

### TC-1101: Sidebar Nav

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Sidebar shows "Repo" item | Visible with Database icon | ☐ |
| 2 | Click "Repo" | Navigate to /repo | ☐ |
| 3 | URL shows /repo | Correct route | ☐ |

### TC-1102: Project Deep Link

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Click project card | Navigate to /repo/{id} | ☐ |
| 2 | URL shows /repo/{uuid} | Correct route | ☐ |
| 3 | Back arrow | Navigate back to /repo | ☐ |

---

## TC-1200: Cross-Cutting Concerns

### TC-1201: CSS / Visual

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Check dark mode styling | All components follow design system | ☐ |
| 2 | Modals | Overlay, proper z-index, click-outside closes | ☐ |
| 3 | Buttons | Hover effects, disabled states | ☐ |
| 4 | Scrollable content | Overflow handling correct | ☐ |
| 5 | Loading states | Spinner/loader hiển thị khi cần | ☐ |
| 6 | Error states | Error messages hiển thị rõ ràng | ☐ |

### TC-1202: Data Persistence

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | Tạo data (project, features, artifacts) | Data persists | ☐ |
| 2 | Close app → Reopen | All data still intact | ☐ |
| 3 | SQLite migrations | Auto-run on startup (v1, v2, v3) | ☐ |

### TC-1203: AI Integration

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1 | No API key configured | Appropriate error/warning shown | ☐ |
| 2 | Invalid API key | Error message displayed | ☐ |
| 3 | AI provider unavailable | Graceful degradation, error message | ☐ |
| 4 | Long AI response | No timeout, response completes | ☐ |

---

## Test Summary

| Section | Test Cases | Priority |
|---------|-----------|----------|
| TC-100: Project Management | 5 | P0 (Critical) |
| TC-200: Tab Navigation | 2 | P0 |
| TC-300: PRD Editor | 4 | P0 |
| TC-400: Feature/Function | 6 | P0 |
| TC-500: Artifact Pipeline | 6 | P0 |
| TC-600: Artifact Viewer | 3 | P1 |
| TC-700: PRD Chat | 5 | P1 |
| TC-800: Analysis Tab | 6 | P1 |
| TC-900: Connections | 5 | P2 |
| TC-1000: Settings | 2 | P2 |
| TC-1100: Navigation | 2 | P1 |
| TC-1200: Cross-Cutting | 3 | P0 |
| **Total** | **49 test cases** | |

### Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Tester | | | |
| Reviewer | | | |
| PM Approval | | | |
