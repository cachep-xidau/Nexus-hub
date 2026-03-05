# Phase 3: Frontend Sidebar

## Context Links
- Sidebar: `src/components/layout/Sidebar.tsx`
- Knowledge pattern: `KnowledgeDomainSidebar` component

## Overview
- Priority: P1
- Status: Completed
- Effort: 45m

Transform Repo link into expandable tree with companies and projects.

## Architecture

**Sidebar structure:**
```
Repo ▼ (nav-group-toggle)
├── Company A ▼ (nav-group-toggle)
│   ├── Project 1 (nav-sub-item → /repo/companyId/projectId)
│   └── Project 2
├── Company B ▶ (collapsed)
└── + Add Company (opens modal)
```

**State management:**
- `sectionsOpen.repo` - controls Repo section
- `expandedCompanies` - Record<companyId, boolean>
- React Query for companies + projects

## Implementation Steps

1. **Add companies API hook** (`use-companies.ts`)
   ```ts
   useCompanies() - GET /api/companies
   useCreateCompany() - POST /api/companies
   useDeleteCompany() - DELETE /api/companies/:id
   ```

2. **Update Sidebar.tsx**
   - Change Repo from Link to expandable toggle
   - Add `repo` to `SidebarSectionKey`
   - Fetch companies on expand
   - Render company tree with projects

3. **Add Company create modal**
   - Similar to existing project create modal
   - Name input only

4. **Add routing logic**
   - Click company → navigate to `/repo/:companyId`
   - Click project → navigate to `/repo/:companyId/:projectId`

5. **Persist expand state**
   - Store in localStorage like other sections

## Files to Create
- `src/lib/hooks/use-companies.ts`

## Files to Modify
- `src/components/layout/Sidebar.tsx` - Add Repo tree

## Success Criteria
- [x] Repo section expands/collapses
- [x] Companies load and display
- [x] Projects nested under companies
- [x] Click company → navigate
- [x] Click project → navigate
- [x] Add company modal works
- [x] State persists on reload

## UX Considerations
- Loading state while fetching companies
- Empty state: "No companies. Create one!"
- Max 20 projects shown per company (paginate if more)
