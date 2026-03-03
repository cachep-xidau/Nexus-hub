# PLAN: Create Prototype — Split Panel + Local Dev Server

**Phương án:** Option C (từ Brainstorm session)
**Ngày:** 2026-03-02
**Effort ước tính:** ~8 ngày

---

## Tóm tắt

Thêm tab "Prototype" vào ProjectDetail. BSA nhấn "Generate Prototype" → AI sinh multi-file React code → Tauri shell tạo Vite project trên filesystem, chạy `npm run dev` → render kết quả trong iframe split panel ngay bên trong app.

## Phases

### Phase 1: Tauri Shell Plugin (1 ngày)
- Cài `tauri-plugin-shell` (Rust + JS)
- Update capabilities + CSP cho localhost iframe

### Phase 2: AI Prototype Pipeline (2.5 ngày)
- Thêm `'prototype'` artifact type vào `templates.ts`
- Viết `prototype-orchestrator.ts`:
  - AI gen → parse JSON files → write to disk → npm install → npm run dev
- Hàm `checkNodeInstalled()` cho graceful fallback

### Phase 3: Split Panel UI (2.5 ngày)
- `PrototypePanel.tsx` — iframe preview + toolbar (device size, regenerate, export)
- Update `ProjectDetail.tsx` — tab "Prototype" + `react-resizable-panels` split layout
- Update `ArtifactPanel.tsx` + `GenerateModal.tsx`

### Phase 4: Process Management (1 ngày)
- `prototype-manager.ts` — port allocation, auto-kill, cleanup on close

### Phase 5: CSS + Polish (0.5 ngày)
- Resize handle, iframe styling, status bar, device selector

### Phase 6: DB Migration (0.5 ngày)
- `repo_prototypes` table cho persistent state

## Verification
- Manual: Node.js detection, generate flow, split panel resize, process cleanup, HTML export
- Automated: Defer to v2 (no test suite currently)

---

## Dependencies Mới

| Package | Type | Mục đích |
|---|---|---|
| `tauri-plugin-shell` | Rust crate | Chạy shell commands (npm, node) |
| `@tauri-apps/plugin-shell` | npm | JS binding cho shell plugin |
| `react-resizable-panels` | npm | Split panel UI |

---

*Xem chi tiết đầy đủ tại:* [implementation_plan.md](file:///Users/lucasbraci/.gemini/antigravity/brain/f5e2452d-166f-4790-a42b-0e37ed6a6f3b/implementation_plan.md)
