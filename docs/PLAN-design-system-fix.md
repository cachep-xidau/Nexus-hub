# PLAN: Design System Full Compliance

> Fix all 351 inline styles and 141 hardcoded CSS values to use design tokens.

## Scope

| Category | Count | Method |
|---|---|---|
| CSS hardcoded padding | 64 | `sed` bulk replace |
| CSS hardcoded margin | 19 | `sed` bulk replace |
| CSS hardcoded gap | 34 | `sed` bulk replace |
| CSS hardcoded radius | 24 | `sed` bulk replace |
| CSS hardcoded hex colors | 16 | Manual replace |
| TSX inline styles | 351 | Manual → CSS classes |

---

## Phase 1: CSS Hardcoded Values (sed refactor)

**Target:** `index.css` — replace 141 hardcoded px/rem values with `var(--space-*)` and `var(--radius-*)`

### Mapping Table

```
padding/margin/gap:
  4px, 0.25rem  → var(--space-1)
  6px           → var(--space-1)
  8px, 0.5rem   → var(--space-2)
  10px          → var(--space-3)
  12px, 0.75rem → var(--space-3)
  16px, 1rem    → var(--space-4)
  20px, 1.25rem → var(--space-5)
  24px, 1.5rem  → var(--space-6)
  32px, 2rem    → var(--space-8)
  40px, 2.5rem  → var(--space-10)

border-radius:
  4px   → var(--radius-sm)
  6px   → var(--radius-sm)
  8px   → var(--radius-md)
  10px  → var(--radius-md)
  12px  → var(--radius-lg)
  16px  → var(--radius-xl)
  20px  → var(--radius-xl)
  24px  → var(--radius-2xl)
  50%, 9999px → var(--radius-pill)
```

**Verification:** `grep -c "padding.*[0-9]px" src/index.css` → 0

---

## Phase 2: TSX Pages (priority order)

### 2A: SanData.tsx (104 inline styles)
- Extract all inline styles into CSS classes in `index.css`
- Create `.san-*` namespace for SAN Marketing components

### 2B: SanReports.tsx (82 inline styles)
- Same approach — `.san-report-*` classes

### 2C: SanOverview.tsx (60 inline styles)
- Same approach — `.san-overview-*` classes

### 2D: Settings.tsx (43 inline styles)
- Extract into `.settings-*` classes
- Dynamic values (slider positions) can keep `style={{}}`

### 2E: Board.tsx (43 inline styles)
- Extract into `.kanban-*` classes  
- Column colors use dynamic `style={{}}` — acceptable

### 2F: Minor pages (Agent, Inbox, ProjectDetail, Repo)
- 3-5 inline styles each — quick fixes

---

## Phase 3: Verification

- [ ] `vite build` passes
- [ ] `grep -c "style={{" src/pages/*.tsx` — each page ≤ 5 (dynamic only)
- [ ] `grep -c "padding.*[0-9]px" src/index.css` → ≤ 5
- [ ] `grep -c "border-radius.*[0-9]px" src/index.css` → ≤ 5
- [ ] Visual spot-check: Dashboard, Board, Settings, SanData
- [ ] Commit + push

---

## Estimated Effort

| Phase | Effort |
|---|---|
| Phase 1 (CSS sed) | ~30 min |
| Phase 2A-C (SAN pages) | ~2 hours |
| Phase 2D-F (Settings/Board/minor) | ~1 hour |
| Phase 3 (Verification) | ~15 min |
| **Total** | **~4 hours** |
