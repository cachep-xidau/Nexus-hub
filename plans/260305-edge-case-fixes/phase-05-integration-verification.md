# Phase 05: Integration Verification

> Parent plan: [plan.md](./plan.md)  
> Dependencies: Phases 01, 02, 03, 04 (ALL must complete first)  
> Parallelization: Group B — sequential, runs after all Group A phases

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-03-05 |
| Priority | P1 |
| Status | pending |
| Effort | 0.5h |

## File Ownership (Exclusive)

- `tests/` (all test files)
- No production source files modified

## Verification Steps

### Step 1: TypeScript Compilation Check

```bash
cd /Users/lucasbraci/Desktop/Antigravity/projects/nexus-tauri
npx tsc -b --noEmit
```

Expected: Zero type errors.

### Step 2: ESLint Check

```bash
npm run lint
```

Expected: Zero new lint errors.

### Step 3: Existing Unit Tests

```bash
npm run test:run
```

Expected: All existing tests pass (onboarding tests).

### Step 4: Rust Build Check

```bash
cd src-tauri && cargo check 2>&1
```

Expected: Zero compilation errors.

### Step 5: Vite Build

```bash
npm run build
```

Expected: Clean build with no warnings.

### Step 6: Manual Smoke Test Checklist

> **For the user to verify after implementation:**

- [ ] App launches without white screen
- [ ] Login flow works (enter credentials → see dashboard)
- [ ] Kanban board loads cards correctly
- [ ] Creating a new board creates 4 default columns
- [ ] Creating a card positions correctly
- [ ] AI chat responds when API key is configured
- [ ] Settings page: adding/removing AI connections works
- [ ] TablePlus: can connect to a SQLite database
- [ ] TablePlus: `db_query` blocks `DROP TABLE` attempt
- [ ] Gmail: OAuth flow opens browser (if configured)
- [ ] Offline banner shows when network is off

## Success Criteria

- [ ] `tsc -b --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:run` passes (all existing tests)
- [ ] `cargo check` passes
- [ ] `npm run build` produces clean output
- [ ] Manual smoke test checklist passes
