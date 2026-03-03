# PLAN: Knowledge Hub Replace-in-Place Sidebar (Option B)

> When clicking a Knowledge Hub domain, the **entire sidebar replaces** with the domain's article tree + back button. One context at a time.

## UX Flow

```
State 1: Normal sidebar          State 2: Domain selected
┌──────────────────┐             ┌──────────────────┐
│ N  Nexus Hub     │             │ ← Knowledge Hub  │
│ ─────────────    │             │ ─────────────    │
│ MAIN             │   click     │ BMAD Method      │
│ ▸ Dashboard      │  "BMAD"    │ ═══════════════  │
│ ▸ Knowledge Hub  │ ────────▶  │ ▾ GIỚI THIỆU    │
│ ▸ Repo           │             │   Tổng Quan ●   │
│ ▸ Kanban Board   │             │   Kiến Trúc     │
│ ▸ Inbox          │             │ ▾ HƯỚNG DẪN     │
│ ▸ AI Agent       │             │   Workflow Ref  │
│ CHANNELS         │             │ ▾ VÍ DỤ        │
│   Slack          │             │   Quick Ref     │
│   Gmail          │             │                  │
│ SYSTEM           │   click     │                  │
│ ▸ Settings       │  "← Back"  │                  │
│ ▸ SAN Marketing  │ ◀────────  │                  │
└──────────────────┘             └──────────────────┘
```

## Files Modified

| File | Change |
|---|---|
| `src/components/layout/Sidebar.tsx` | Add replace-in-place mode: detect `/knowledge/:domain` route → render article tree instead of nav |
| `src/index.css` | CSS for `.sidebar-replace` back button header |

## Implementation

### Step 1: Sidebar State Machine (Sidebar.tsx)

Two modes based on route:
- **Normal mode** (`/knowledge` or other routes) → show full nav as usual
- **Domain mode** (`/knowledge/:domainSlug` or `/knowledge/:domainSlug/:articleSlug`) → replace sidebar content with:
  1. Back button header: `← Knowledge Hub`
  2. Domain name as title
  3. Collapsible section tree with articles

### Step 2: CSS for Replace Mode

```css
.sidebar-replace-header   → back button row
.sidebar-replace-title     → domain name
/* Reuse existing: */
.knowledge-tree-section-toggle
.knowledge-tree-items
.knowledge-tree-item
```

### Step 3: Clean Up

- Remove `KnowledgeSubTree` component from current Sidebar.tsx (Option C code)
- Keep Knowledge Hub as simple nav-item link (no collapsible group)
- Remove unused `.knowledge-sidebar-*` CSS classes

## Verification

- [ ] Normal routes show full sidebar
- [ ] `/knowledge` landing shows full sidebar + domain cards
- [ ] `/knowledge/bmad-method` replaces sidebar with article tree
- [ ] Back button returns to full sidebar
- [ ] Active article highlighted
- [ ] Vite build passes
- [ ] Commit + push
