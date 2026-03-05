# Phase 1: Schema & Migration

## Context Links
- Schema: `nexus-backend/prisma/schema.prisma`
- Migration: `nexus-backend/prisma/migrations/`

## Overview
- Priority: P1
- Status: Completed
- Effort: 30m

Add Company model and update Project to belong to Company. Create migration script to move existing projects.

## Architecture

```prisma
model Company {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  projects    Project[]

  @@index([userId])
  @@map("companies")
}

model Project {
  // ... existing fields
  companyId   String?
  company     Company?  @relation(fields: [companyId], references: [id], onDelete: SetNull)
  // ... rest unchanged
}
```

## Implementation Steps

1. **Add Company model to schema.prisma**
   - Add after User model
   - Include proper indexes

2. **Update Project model**
   - Add `companyId` (nullable for migration)
   - Add `company` relation

3. **Run `prisma db push`** (dev) or create migration

4. **Create migration script** (`scripts/migrate-to-companies.ts`)
   ```ts
   // For each user:
   // 1. Create "My Projects" company
   // 2. Update all their projects to belong to it
   // 3. Make companyId required after migration
   ```

5. **Update schema: make companyId required**
   - Change `String?` → `String`
   - Run migration

## Files to Modify
- `nexus-backend/prisma/schema.prisma` - Add Company, update Project

## Files to Create
- `nexus-backend/prisma/migrations/YYYYMMDDHHMMSS_add_company.sql`
- `nexus-backend/scripts/migrate-to-companies.ts`

## Success Criteria
- [x] Company table exists (schema + SQL migration added)
- [x] Project has companyId column (nullable for transition)
- [x] Migration script added to move existing projects into "My Projects"
- [x] Transaction-safe migration flow implemented

## Risk Assessment
- **Data loss**: Low - migration script uses transaction
- **Rollback**: Keep companyId nullable initially
