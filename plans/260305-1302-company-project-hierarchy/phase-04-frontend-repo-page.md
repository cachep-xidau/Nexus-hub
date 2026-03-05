# Phase 4: Frontend Repo Page

## Context Links
- Repo page: `src/pages/Repo.tsx`
- Project detail: `src/pages/ProjectDetail.tsx`

## Overview
- Priority: P1
- Status: Completed
- Effort: 45m

Update Repo page to show company context and update routing.

## Architecture

**Routes:**
```
/repo              → Redirect to first company or empty state
/repo/:companyId   → Projects grid for company
/repo/:projectId   → Redirect to /repo/:companyId/:projectId (backward compat)
```

**Page changes:**
- Header shows company name
- Add project button creates in current company
- Breadcrumb: Repo > Company Name

## Implementation Steps

1. **Update routing** (`App.tsx`)
   ```tsx
   <Route path="/repo" element={<Repo />} />
   <Route path="/repo/:companyId" element={<Repo />} />
   <Route path="/repo/:companyId/:projectId" element={<ProjectDetail />} />
   ```

2. **Update Repo.tsx**
   - Extract `companyId` from params
   - If no companyId → redirect to first company
   - Fetch company info for header
   - Filter projects by company
   - Create project with companyId

3. **Add company context header**
   - Company name + description
   - Edit company button
   - Breadcrumb

4. **Update project create modal**
   - Pre-select current company
   - Or show company dropdown if accessed from /repo

5. **Handle backward compatibility**
   - `/repo/:projectId` → lookup project's company → redirect

## Files to Modify
- `src/App.tsx` - Update routes
- `src/pages/Repo.tsx` - Company context
- `src/lib/hooks/use-repo-api/projects.ts` - Add companyId filter
- `src/lib/hooks/use-repo-api/types.ts` - Add company to types

## Success Criteria
- [x] /repo redirects to first company
- [x] /repo/:companyId shows company projects
- [x] Header displays company name
- [x] Create project associates with company
- [x] Breadcrumb navigation works
- [x] Old /repo/:projectId URLs redirect correctly

## UX Considerations
- Empty company: "No projects yet. Create one!"
- Company settings accessible from header
- Smooth transitions between companies
