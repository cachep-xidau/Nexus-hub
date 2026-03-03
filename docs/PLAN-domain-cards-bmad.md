# PLAN: Fix Domain Cards (BMAD Issues)

> Fix all 11 issues from BMAD review of Knowledge Hub domain cards.

## Files Modified

| File | Changes |
|---|---|
| `src/pages/KnowledgeHub.tsx` | aria-label, per-domain colors, expanded icon map, data-testid |
| `src/index.css` | Badge pill, icon hover glow, active state, min-height, grid max-width, line-height |
| `src/lib/knowledge-db.ts` | Add `color` field to domain data (if applicable) |

---

## Phase 1: CSS Fixes (B3, B4, B5, D1, D2, A2) — 20 min

```
B3: .knowledge-domain-badge → pill shape (background, padding, border-radius)
B4: .knowledge-domain-card p → line-height: var(--leading-relaxed)
B5: .knowledge-domain-grid → max column width 320px
D1: .knowledge-domain-card:hover .knowledge-domain-card-icon → glow/scale
D2: .knowledge-domain-card:active → transform: scale(0.98)
A2: .knowledge-domain-card → min-height: 140px
```

## Phase 2: TSX Fixes (A1, B1, M1, M2) — 25 min

```
A1: aria-label={d.name} on <button>
B1: Per-domain color prop → use d.color or assign from palette
M1: Expand ICON_MAP with 10+ Lucide icons
M2: data-testid={`domain-card-${d.slug}`}
```

## Phase 3: Verification — 5 min

- [ ] `vite build` passes
- [ ] Each card has unique color identity
- [ ] Keyboard navigation works (focus-visible)
- [ ] Commit + push
