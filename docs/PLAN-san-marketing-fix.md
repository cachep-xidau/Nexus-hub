# PLAN: Fix All SAN Marketing Issues

> Fix API 401, CSS mismatches, TrendBadge delta, and style gaps between S Group and Nexus Hub Tổng quan screens.

## Root Cause Analysis

### 🔴 Issue 1: No Data (API 401 Unauthorized)
- **URL discovered**: `https://san-marketing-web.vercel.app/api/marketing` → HTTP 401
- **Root cause**: S Group Next.js middleware (`middleware.ts`) requires JWT cookie `mh_session` for ALL `/api/marketing` requests
- **Impact**: All 3 screens show "Đang tải..." with no data

### 🟡 Issue 2: Font Size Mismatch
| Token | S Group | Nexus Hub | Delta |
|-------|---------|-----------|-------|
| xs | 0.65rem (10px) | 0.8125rem (13px) | +46% |
| sm | 0.75rem (12px) | 0.9375rem (15px) | +25% |
| base | 0.80rem (13px) | 1.0625rem (17px) | +33% |
| md | 0.85rem (14px) | — | — |
| lg | 1.00rem (16px) | 1.1875rem (19px) | +19% |
| xl | 1.125rem (18px) | 1.3125rem (21px) | +17% |
| 2xl | 1.50rem (24px) | 1.5625rem (25px) | +4% |

**Decision**: Keep Nexus Hub sizes (designed for desktop Tauri app, not web). No action needed.

### 🟡 Issue 3: TrendBadge delta = 0
- S Group: `useMarketingData` hook calculates `delta.leads` and `delta.spend` by comparing current vs previous period
- Nexus Hub: hardcoded `delta: { leads: 0, spend: 0 }` → TrendBadge never renders

### 🟡 Issue 4: Inline Style Gaps
- Missing hover shadow on cards
- Bar chart label width 100px vs 80px
- ChartCard icons: plain `<span>` vs S Group SVG icons
- Page wrapper `maxWidth: 1200` vs no constraint

---

## Proposed Fixes

### Fix 1: API — Make `/api/marketing` public (S Group middleware)

#### [MODIFY] `middleware.ts` in S Group web
Add `/api/marketing` to `PUBLIC_PATHS` array:
```diff
-const PUBLIC_PATHS = ['/', '/api/auth/login', '/api/auth/logout'];
+const PUBLIC_PATHS = ['/', '/api/auth/login', '/api/auth/logout', '/api/marketing'];
```
Also add CORS headers in the API route for cross-origin Tauri requests.

#### [MODIFY] `san-marketing-api.ts` in Nexus Hub
```diff
-const API_BASE = 'https://marketing-hub-web.vercel.app';
+const API_BASE = 'https://san-marketing-web.vercel.app';
```

> [!WARNING]
> Making `/api/marketing` public exposes read-only marketing data without auth. This is acceptable for internal dashboards but the user should confirm this is OK.

---

### Fix 2: CORS headers in API route

#### [MODIFY] `route.ts` in S Group `/api/marketing`
Add CORS headers + OPTIONS handler:
```typescript
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
// Add CORS to existing NextResponse.json() calls
```

---

### Fix 3: TrendBadge delta calculation

#### [MODIFY] `SanOverview.tsx` — compute delta
- Fetch previous period data (e.g., if `this_month`, also fetch `last_month`)
- Calculate `deltaLeads = ((current - prev) / prev * 100)` 
- Pass delta to each card and ChartCard

---

### Fix 4: CSS/Style alignment

#### [MODIFY] `SanOverview.tsx` — minor style fixes
- Add hover `boxShadow: 'var(--shadow-card)'` on card mouseEnter
- Change bar chart label width from `100px` to `80px`
- Remove `maxWidth: 1200` from page wrapper (match S Group)

---

## Execution Order

```
1. Fix API_BASE URL → immediate effect
2. Fix middleware + CORS → requires S Group deploy
3. Fix TrendBadge delta → local calculation  
4. Fix CSS alignment → minor style tweaks
```

## Verification

- [ ] `curl "https://san-marketing-web.vercel.app/api/marketing?start=2025-12-01&end=2026-02-28"` → 200 with JSON
- [ ] SanOverview shows data cards with numbers
- [ ] TrendBadge shows ↑/↓ percentages
- [ ] Visual side-by-side match with S Group
