---
title: "Company → Project Hierarchy Implementation"
description: "Add 2-level hierarchy (Company → Project) to Repo section with sidebar tree navigation"
status: in_progress
priority: P2
effort: 3h
issue: repo-hierarchy
branch: feat/company-project-hierarchy
tags: [frontend, backend, schema, navigation]
created: 2026-03-05
---

# Company → Project Hierarchy Implementation

## Overview

Transform Repo from flat project list → 2-level hierarchy (Company → Project) with expandable sidebar tree navigation.

**Scope:**
- Personal folders (per-user grouping)
- 2 levels only (Company → Project)
- Sidebar tree like Knowledge Hub
- Click Company → `/repo/:companyId` page
- Auto-migrate existing projects → "My Projects" company

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Schema & Migration | Completed | 30m | [phase-01](./phase-01-schema-migration.md) |
| 2 | Backend API | Completed | 45m | [phase-02](./phase-02-backend-api.md) |
| 3 | Frontend Sidebar | Completed | 45m | [phase-03](./phase-03-frontend-sidebar.md) |
| 4 | Frontend Repo Page | Completed | 45m | [phase-04](./phase-04-frontend-repo-page.md) |
| 5 | Testing & Polish | In Progress | 15m | [phase-05](./phase-05-testing.md) |

## Dependencies

- Backend: `nexus-backend` (NestJS + Prisma)
- Frontend: `nexus-tauri` (React + Tauri)
- DB: PostgreSQL

## Architecture Summary

```
User
  └── Company[] (personal folders)
        └── Project[] (existing model, add companyId)
```

**Routes:**
- `/repo` → redirect to first company or show empty state
- `/repo/:companyId` → projects list for company
- `/repo/:companyId/:projectId` → existing project detail

**Sidebar:**
```
Repo ▼
├── Company A ▼
│   ├── Project A
│   └── Project B
├── Company B
└── + Add Company
```

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Data loss in migration | Low | Transaction + backup before migration |
| Existing features break | Medium | Keep Project model backward compatible during transition |
| Sidebar performance | Low | Lazy load projects per company |

## Success Criteria

- [x] Companies visible in sidebar tree
- [x] Projects nested under companies
- [x] Create companies
- [x] Create projects under company
- [x] Existing local projects migrated to "My Projects" fallback
- [x] Backend phases 1-2 implemented in `nexus-backend`
