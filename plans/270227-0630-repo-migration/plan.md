# Full Repo Migration: ba-kit → Nexus Hub

> **Type:** plan:hard | **Created:** 2026-02-27 06:30 | **Est:** 8 phases, ~2 weeks

## Objective
Full port of ba-kit Repo feature (BSA project management + AI artifact generation) into Nexus Hub desktop app (Tauri + React + SQLite).

## Source Analysis
- **Frontend:** ~200K lines across 7 pages (project detail alone: 4,390 lines)
- **API:** 26 route files (~180K), pipeline (orchestrator + templates), services
- **Data:** 9 Prisma models (7 to migrate, skip Payment + UserPlan)
- **AI:** ai-engine package (aiRouter) + prompt templates

## Phases

| # | Phase | Files | Est |
|---|---|---|---|
| 1 | SQLite Schema + DB Layer | `lib/repo-db.ts` + `lib.rs` migration | 0.5d |
| 2 | Repo Page (Project Grid) | `pages/Repo.tsx` + Sidebar nav | 0.5d |
| 3 | Project Detail (Core) | `pages/ProjectDetail.tsx` — PRD editor, Feature tree | 2d |
| 4 | Artifact System | Viewer, editor, CRUD, markdown renderer | 1.5d |
| 5 | AI Generation Pipeline | Orchestrator, templates, multi-provider | 2d |
| 6 | PRD Chat + Analysis | BMAD workflow, analysis documents | 2d |
| 7 | MCP Connections | Registry, connect modal, activity logs | 1.5d |
| 8 | Skills + Polish | Skills catalog, routing, integration | 1d |

**See phase files for details: `phase-01-*.md` through `phase-08-*.md`**
