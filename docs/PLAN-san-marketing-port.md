# PLAN: Full Port S Group Marketing → Nexus Hub SAN Marketing

> Port all 3 S Group marketing screens (CMODashboard, ReportPage, StaffDashboard)
> into Nexus Hub with **pixel-level fidelity**.

## Source Files

| Screen | S Group Source | Nexus Hub Target |
|--------|---------------|-----------------|
| Tổng quan | `cmo/page.tsx` (529 lines) | `SanOverview.tsx` |
| Báo cáo | `cmo/reports/page.tsx` (482 lines) | `SanReports.tsx` |
| Dữ liệu | `staff/page.tsx` (608 lines) | `SanData.tsx` |
| API hook | `use-marketing-data.ts` (326 lines) | `san-marketing-api.ts` |

---

## Phase 1: Tổng quan — Full Port (SanOverview.tsx)

### 1.1 Company Selector Cards (2×2 grid)
- [ ] Port 2×2 metrics grid: Leads / Chi tiêu / CPL / Chiến dịch
- [ ] `borderTop: 3px solid ${card.color}` + `outline: 2px solid` when active
- [ ] Opacity toggle: active=1, inactive=0.55
- [ ] Hover lift: `translateY(-1px)` + `boxShadow`
- [ ] "Đang chọn" badge pill
- [ ] Company logos (`/logos/san-dentist.png`, etc.) with fallback initial
- [ ] TrendBadge (↑/↓ % delta)

### 1.2 Sparkline Chart Cards (3 columns)
- [ ] Port `Sparkline` SVG component (area chart + gradient fill)
- [ ] Interactive tooltip on hover (circle dot + dashed vertical line + label)
- [ ] X-axis labels (month format: T1/2025)
- [ ] Port `ChartCard` wrapper: side-by-side layout (35% value / 65% chart)
- [ ] 3 cards: Tổng Leads / Tổng chi tiêu / CPL trung bình
- [ ] Port `TrendBadge` component

### 1.3 Top Channel Bar Chart
- [ ] Horizontal bar chart: top 5 channels
- [ ] Colored dots + CHANNEL_LABELS mapping
- [ ] Bar width proportional to lead count

### 1.4 Channel Performance Table
- [ ] Sortable columns (click header → asc/desc) with sort arrow indicator
- [ ] Colored channel dots (●) with CHANNEL_LABELS
- [ ] Totals row with bold border
- [ ] Inline bar visualization for Leads/Chất lượng columns

---

## Phase 2: Báo cáo — Full Port (SanReports.tsx)

### 2.1 Company Selector Cards
- [ ] Same 2×2 grid as Phase 1 but: Leads / Chốt / Tỷ lệ chốt% / Chiến dịch
- [ ] Close rate color coding: ≥20% green, ≥10% yellow, <10% red

### 2.2 Funnel Visualization
- [ ] 7-stage funnel: Lead → Tiềm năng → Chất lượng → Đặt hẹn → Đến PK → Chốt → Bill
- [ ] Stage labels + values + step conversion %
- [ ] Gradient bar (each stage proportional width, colored, with number inside)
- [ ] Legend: "X% = tỷ lệ chuyển đổi so với bước trước"

### 2.3 Channel Filter
- [ ] Channel dropdown with CHANNEL_LABELS
- [ ] Count display: "X chiến dịch"
- [ ] Custom SVG chevron for select

### 2.4 Detail Table
- [ ] Sticky first 3 columns (#, Kênh, Chiến dịch)
- [ ] Color-coded headers: Lead=primary, Spam=red, Chốt=green
- [ ] Row number column
- [ ] Totals row with company color tint background
- [ ] "Xuất Excel" button (placeholder)

---

## Phase 3: Dữ liệu — Full Port (SanData.tsx)

### 3.1 Data Entry Form
- [ ] Add new row form: date picker + campaign selector + all funnel fields
- [ ] Save/Cancel buttons
- [ ] POST to API

### 3.2 Inline Edit
- [ ] Click row to edit
- [ ] PATCH to API

### 3.3 CSV Upload
- [ ] File upload button
- [ ] Parse CSV with campaign name mapping
- [ ] Bulk insert via API

### 3.4 Date Picker
- [ ] Port or create calendar-based date picker component
- [ ] Integration with time range filter

---

## Phase 4: Shared Components

### 4.1 Shared Constants
- [ ] Port `CHANNEL_LABELS` and `CHANNEL_COLORS` to `san-marketing-api.ts`
- [ ] Port company logos (copy to `public/logos/`)
- [ ] Port `TimeFilterBar` component (with custom date range)

### 4.2 API Enhancement
- [ ] Add `daily` series data to fetch (for sparklines)
- [ ] Add `channels` breakdown endpoint support
- [ ] Add CRUD endpoints (POST/PATCH/DELETE entries)
- [ ] Handle CORS for cross-origin fetch

---

## Phase 5: Polish

- [ ] Loading skeleton (not just "Đang tải...")
- [ ] `fadeIn` animation on page mount
- [ ] Responsive: collapse grid to 2 cols on narrow screens
- [ ] Error handling with retry button

---

## Execution Order

```
Phase 4.1 (Constants)     →  shared foundation
Phase 1.1-1.2 (Cards+Charts) →  heaviest visual gap
Phase 2.2 (Funnel)         →  unique feature
Phase 1.3-1.4 (Bars+Table) →  medium effort
Phase 2.1-2.4 (Reports)    →  reuses Phase 1 cards
Phase 3.1-3.4 (CRUD)       →  backend-dependent
Phase 5 (Polish)           →  final pass
```

## Effort Estimate

| Phase | Files | Lines (est.) | Time |
|-------|-------|-------------|------|
| 1 | 1 | ~300 | 15 min |
| 2 | 1 | ~250 | 12 min |
| 3 | 1 | ~200 | 10 min |
| 4 | 2 | ~100 | 5 min |
| 5 | 3 | ~50 | 5 min |
| **Total** | **~8** | **~900** | **~47 min** |

---

## Verification

- [ ] TypeScript: `npx tsc --noEmit` = 0 errors
- [ ] Visual: side-by-side comparison with S Group screens
- [ ] Data: verify API responses match expected format
- [ ] Interaction: hover states, sorting, filtering, CRUD all work
