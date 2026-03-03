# Brainstorm Report: Nexus Hub SaaS Migration

**Date:** 2026-03-03
**Decision:** Full Cloud Migration (Option 1)
**Timeline:** 4-6 weeks
**Status:** Approved by user

---

## Problem Statement

Convert Nexus Hub from local-first single-user desktop app to multi-tenant SaaS with:
- Tiered pricing (Free/Pro/Enterprise)
- Cloud PostgreSQL data storage
- Cross-device sync & backup
- License enforcement via auth gate
- Future team collaboration support

---

## Architecture Decision

### Current State
```
Tauri Desktop App (self-contained)
├─ React UI
├─ SQLite (local)
├─ AI calls (client-side)
└─ No auth
```

### Target State
```
Tauri Desktop App (thin client)
        │
        ▼
Backend API (NestJS)
├─ Better Auth (email + OAuth)
├─ PostgreSQL (Neon)
├─ Polar (billing)
└─ R2 (file storage)
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Auth | Better Auth | Self-hosted, TypeScript-native, flexible |
| Database | Neon PostgreSQL | Serverless, auto-scaling, generous free tier |
| ORM | Prisma | Type-safe, familiar from BSA Kit |
| Backend | NestJS | Modular, Type-safe, enterprise-ready |
| Billing | Polar.sh | Developer-friendly, lower fees than Stripe |
| Storage | Cloudflare R2 | S3-compatible, free egress |
| Deployment | Railway | Simple deploy, good DX |

---

## Data Model (PostgreSQL)

### Core Tables

```prisma
// Users & Auth
model User {
  id            String    @id @cuid()
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  subscription  Subscription?
  projects      Project[]

  @@map("users")
}

model Subscription {
  id              String      @id @cuid()
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [id])
  tier            Tier        @default(FREE)
  status          SubStatus   @default(ACTIVE)
  polarId         String?     @unique
  currentPeriodEnd DateTime?

  @@map("subscriptions")
}

enum Tier {
  FREE
  PRO
  ENTERPRISE
}

enum SubStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

// Projects (from SQLite migration)
model Project {
  id          String      @id @cuid()
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  name        String
  description String?
  prdContent  String?     @db.Text
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  features    Feature[]
  artifacts   Artifact[]
  analysis    AnalysisDoc[]
  connections Connection[]

  @@map("projects")
}

model Feature {
  id          String     @id @cuid()
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String
  description String?
  order       Int        @default(0)
  createdAt   DateTime   @default(now())

  functions   Function[]

  @@map("features")
}

model Function {
  id          String     @id @cuid()
  featureId   String
  feature     Feature    @relation(fields: [featureId], references: [id], onDelete: Cascade)
  name        String
  description String?
  order       Int        @default(0)
  createdAt   DateTime   @default(now())

  artifacts   Artifact[]

  @@map("functions")
}

model Artifact {
  id           String       @id @cuid()
  projectId    String
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  functionId   String?
  function     Function?    @relation(fields: [functionId], references: [id], onDelete: Cascade)
  type         ArtifactType
  content      String       @db.Text
  metadata     Json?        // traceability, model, timestamp
  createdAt    DateTime     @default(now())

  @@map("artifacts")
}

enum ArtifactType {
  USER_STORY
  FUNCTION_LIST
  SRS
  ERD
  SQL
  FLOWCHART
  SEQUENCE
  USE_CASE
  ACTIVITY
  SCREEN_DESC
}
```

---

## API Endpoints

### Auth (Better Auth handles these)
- `POST /auth/sign-in/email`
- `POST /auth/sign-up/email`
- `POST /auth/sign-out`
- `GET /auth/session`

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (cascade)

### Features & Functions
- `GET /api/projects/:id/features` - List features
- `POST /api/projects/:id/features` - Create feature
- `PUT /api/features/:id` - Update feature
- `DELETE /api/features/:id` - Delete feature
- (Same pattern for functions)

### Artifacts
- `GET /api/projects/:id/artifacts` - List artifacts
- `POST /api/projects/:id/artifacts/generate` - Generate artifacts
- `GET /api/artifacts/:id` - Get artifact
- `DELETE /api/artifacts/:id` - Delete artifact

### AI (Proxied)
- `POST /api/ai/chat` - Chat with streaming
- `POST /api/ai/generate` - Non-streaming generation

### Billing
- `GET /api/subscription` - Get current subscription
- `POST /api/subscription/checkout` - Create checkout session
- `POST /api/subscription/portal` - Customer portal

---

## Tier Limits

| Feature | Free | Pro ($29/mo) | Enterprise ($99/mo) |
|---------|------|--------------|---------------------|
| Projects | 3 | Unlimited | Unlimited |
| Artifacts/month | 50 | 500 | Unlimited |
| AI tokens/month | 100K | 1M | 10M |
| Export formats | MD only | MD + JSON | All + API |
| Support | Community | Email | Priority |

---

## Migration Phases

### Phase 1: Backend Foundation (Week 1-2)

**Deliverables:**
- [ ] NestJS project scaffold
- [ ] Prisma schema + migrations
- [ ] Better Auth setup (email + Google OAuth)
- [ ] Basic CRUD endpoints (projects, features, functions)
- [ ] Neon database setup
- [ ] Railway deployment

**Files to Create:**
```
nexus-backend/
├── src/
│   ├── auth/
│   │   └── auth.module.ts
│   ├── prisma/
│   │   └── prisma.module.ts
│   ├── projects/
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── projects.module.ts
│   ├── features/
│   ├── functions/
│   ├── artifacts/
│   └── app.module.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

### Phase 2: Desktop Auth Integration (Week 2-3)

**Deliverables:**
- [ ] Login/register pages in Tauri app
- [ ] JWT token storage (secure)
- [ ] Auth guard for protected routes
- [ ] Session refresh logic
- [ ] Logout functionality

**Files to Modify:**
```
src/
├── pages/
│   └── Login.tsx (new)
├── lib/
│   ├── auth.ts (new)
│   └── api-client.ts (new)
└── App.tsx (add auth routes)
```

### Phase 3: Data Layer Migration (Week 3-4)

**Deliverables:**
- [ ] Replace SQLite calls with API calls
- [ ] Implement optimistic UI updates
- [ ] Add loading states
- [ ] Error handling
- [ ] Offline queue (retry on reconnect)

**Key Changes:**
- `repo-db.ts` → API calls
- Add React Query for caching
- Add error boundaries

### Phase 4: Billing Integration (Week 4-5)

**Deliverables:**
- [ ] Polar.sh integration
- [ ] Checkout session creation
- [ ] Webhook handling
- [ ] Tier limit enforcement
- [ ] Subscription management UI

### Phase 5: Polish & Testing (Week 5-6)

**Deliverables:**
- [ ] E2E tests (Playwright)
- [ ] Error handling audit
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production deployment

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| JWT in desktop app | Store in OS keychain (tauri-plugin-store) |
| API rate limiting | ThrottlerModule in NestJS |
| SQL injection | Prisma parameterized queries |
| XSS | Sanitize markdown content |
| CORS | Whitelist only tauri:// protocol |

---

## Cost Breakdown

| Service | Free Tier | Pro Usage | Cost/mo |
|---------|-----------|-----------|---------|
| Neon Postgres | 0.5GB | 10GB | $0-19 |
| Railway | $5 credit | 2 services | $0-10 |
| Better Auth | Free | - | $0 |
| Polar | % fee | - | Rev-share |
| R2 | 10GB free | 100GB | $0-5 |
| **Total** | | | **$0-35** |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users angry about losing offline | High | High | Offer legacy mode, communicate early |
| API latency degrades UX | Medium | High | Optimistic UI, React Query caching |
| Migration bugs lose data | Medium | Critical | Backup script, gradual migration |
| Subscription doesn't convert | Medium | High | Free tier value, annual discount |

---

## Next Steps

1. **Create backend repo** (`nexus-backend`)
2. **Set up Neon database** (free tier)
3. **Scaffold NestJS** with Better Auth
4. **Migrate Prisma schema** from SQLite model
5. **Build login UI** in Tauri app
6. **Replace DB calls** with API calls (incremental)

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| AI keys | **Hybrid:** BYOK (user provides) OR backend proxy (you pay). Both options. |
| Migration tool | **Yes:** Simple JSON export/import script |
| Legacy mode | **No:** Full migration only, no offline-only version |

---

## AI Strategy (Hybrid)

```
┌─────────────────────────────────────────────┐
│  User Settings                              │
│  ┌─────────────────────────────────────┐    │
│  │ AI Provider Configuration           │    │
│  │                                     │    │
│  │ ○ Use my API key (Free)             │    │
│  │   └─ Enter Gemini/OpenAI key        │    │
│  │                                     │    │
│  │ ○ Use Nexus AI (Pro/Enterprise)     │    │
│  │   └─ Backend proxy, included in sub │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Tier AI Limits

| Tier | BYOK | Backend Proxy |
|------|------|---------------|
| Free | ✅ Unlimited | ❌ Not available |
| Pro | ✅ Unlimited | ✅ 1M tokens/mo |
| Enterprise | ✅ Unlimited | ✅ 10M tokens/mo |

---

## Migration Script

**Location:** `nexus-tauri/src/lib/migration-export.ts`

```typescript
// Export format
interface MigrationExport {
  version: string;
  exportedAt: string;
  projects: Project[];
  features: Feature[];
  functions: Function[];
  artifacts: Artifact[];
}

// Flow:
// 1. Desktop app: File → Export Data → JSON file
// 2. User logs into SaaS version
// 3. Desktop app: File → Import Data → Select JSON → API upload
```

---

*Report generated by brainstormer agent*
*Decision: Full Cloud Migration (Option 1)*
*Date: 2026-03-03*
