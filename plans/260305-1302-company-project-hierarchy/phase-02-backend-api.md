# Phase 2: Backend API

## Context Links
- Controller pattern: `nexus-backend/src/projects/projects.controller.ts`
- Service pattern: `nexus-backend/src/projects/projects.service.ts`

## Overview
- Priority: P1
- Status: Completed
- Effort: 45m

Add Company CRUD endpoints and update Project endpoints to filter by company.

## Architecture

**New endpoints:**
```
GET    /api/companies           - List user's companies
POST   /api/companies           - Create company
GET    /api/companies/:id       - Get company with projects
PUT    /api/companies/:id       - Update company
DELETE /api/companies/:id       - Delete company (cascades projects)
```

**Updated endpoints:**
```
GET    /api/projects?companyId=X - Filter by company
POST   /api/projects             - Requires companyId in body
```

## Implementation Steps

1. **Create Company module**
   ```bash
   cd nexus-backend
   nest g module companies
   nest g controller companies
   nest g service companies
   ```

2. **Define DTOs**
   - `create-company.dto.ts`
   - `update-company.dto.ts`

3. **Implement CompaniesService**
   - CRUD operations
   - Include projects on find
   - User scoping

4. **Implement CompaniesController**
   - Standard REST endpoints
   - Auth guards

5. **Update ProjectsService**
   - Add `companyId` filter to findAll
   - Require `companyId` on create

6. **Update ProjectsController**
   - Add `companyId` query param

7. **Register in AppModule**

## Files to Create
- `nexus-backend/src/companies/companies.module.ts`
- `nexus-backend/src/companies/companies.controller.ts`
- `nexus-backend/src/companies/companies.service.ts`
- `nexus-backend/src/companies/dto/create-company.dto.ts`
- `nexus-backend/src/companies/dto/update-company.dto.ts`
- `nexus-backend/src/companies/entities/company.entity.ts`

## Files to Modify
- `nexus-backend/src/app.module.ts` - Add CompaniesModule
- `nexus-backend/src/projects/projects.service.ts` - Add company filter
- `nexus-backend/src/projects/projects.controller.ts` - Add companyId param
- `nexus-backend/src/projects/dto/create-project.dto.ts` - Add companyId

## Success Criteria
- [x] GET /api/companies returns list
- [x] POST /api/companies creates company
- [x] GET /api/companies/:id includes projects
- [x] DELETE cascades to projects (service-level transaction)
- [x] Projects filtered by companyId

## Security Considerations
- All endpoints require auth
- User can only access their own companies
- Cascade delete warning in UI
