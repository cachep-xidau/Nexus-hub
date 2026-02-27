# Solution Design Document (SDD)

## SDD là gì?

**Solution Design Document** mô tả **HOW** to build the solution:
- System architecture
- Technical components
- Integration points
- Data flows
- Deployment strategy

## SDD Template

```markdown
# [Solution Name] - Design Document

## 1. Executive Summary
- **Project:** [Name]
- **Author:** [BSA Name]
- **Date:** [YYYY-MM-DD]
- **Version:** [1.0]
- **Status:** Draft | Review | Approved

**Purpose:** [Brief description of solution]
**Scope:** [What's included and excluded]

## 2. Business Context
- Current state (As-Is)
- Desired state (To-Be)
- Business drivers
- Success criteria

## 3. Solution Overview

### High-Level Architecture
```mermaid
graph TB
    A[Web App] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Core API]
    D --> E[(Database)]
    D --> F[Cache]
    D --> G[Queue]
    G --> H[Worker]
```

### Technology Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Modern, type-safe |
| Backend | Node.js + Express | Fast, scalable |
| Database | PostgreSQL | ACID, reliable |
| Cache | Redis | High performance |
| Queue | RabbitMQ | Async processing |

## 4. Detailed Design

### 4.1 Data Architecture

**Entity Relationship Diagram:**
```dbml
Table users {
  id integer [primary key]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  role varchar(50) [default: 'user']
  created_at timestamp [default: `now()`]
  updated_at timestamp
}

Table invoices {
  id integer [primary key]
  user_id integer [ref: > users.id]
  invoice_number varchar(20) [unique, not null]
  total decimal(10,2) [not null]
  status varchar(20) [default: 'draft']
  created_at timestamp [default: `now()`]
}

Table invoice_items {
  id integer [primary key]
  invoice_id integer [ref: > invoices.id]
  description text [not null]
  quantity decimal(10,2) [not null]
  unit_price decimal(10,2) [not null]
  amount decimal(10,2) [not null]
}
```

**Copy to dbdiagram.io for visual ERD**

### 4.2 API Design

**Authentication:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response 201:
{
  "userId": 123,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Invoice Management:**
```http
POST /api/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "clientId": 456,
  "items": [
    {
      "description": "Web Development",
      "quantity": 40,
      "unitPrice": 100
    }
  ],
  "taxRate": 0.10
}

Response 201:
{
  "invoiceId": 789,
  "invoiceNumber": "INV-2026-0211-001",
  "total": 4400,
  "pdfUrl": "https://cdn.example.com/invoices/789.pdf"
}
```

### 4.3 Integration Design

**Email Service (SendGrid):**
```javascript
// Email notification after invoice creation
const sendInvoiceEmail = async (invoice) => {
  const msg = {
    to: invoice.client.email,
    from: 'invoices@company.com',
    subject: `Invoice ${invoice.number} from Company`,
    html: `
      <h1>New Invoice</h1>
      <p>Amount: $${invoice.total}</p>
      <p>Due: ${invoice.dueDate}</p>
      <a href="${invoice.pdfUrl}">Download PDF</a>
    `
  };

  await sgMail.send(msg);
};
```

**Payment Gateway (Stripe):**
```javascript
// Process payment
const processPayment = async (invoiceId, paymentMethodId) => {
  const invoice = await Invoice.findById(invoiceId);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: invoice.total * 100, // cents
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number
    }
  });

  return paymentIntent;
};
```

### 4.4 Security Design

**Authentication Flow:**
```
1. User submits credentials
   ↓
2. Server validates against database
   ↓
3. Generate JWT token (15min expiry)
   ↓
4. Return token + refresh token (7 days)
   ↓
5. Client stores in httpOnly cookie
   ↓
6. Include token in Authorization header
   ↓
7. Server validates token on each request
```

**Security Measures:**
- Passwords: bcrypt hash (12 rounds)
- Tokens: JWT with RS256 signing
- HTTPS: TLS 1.3 enforced
- Rate limiting: 100 requests/min/IP
- SQL injection: Parameterized queries
- XSS: Content Security Policy headers

## 5. Non-Functional Design

### Performance
```yaml
Response Times:
  - API endpoints: < 200ms (p95)
  - Page load: < 2s
  - PDF generation: < 3s

Throughput:
  - 1000 requests/second
  - 100K invoices/month

Scalability:
  - Horizontal scaling via load balancer
  - Database read replicas
  - Redis cluster for cache
```

### Availability
```yaml
Uptime: 99.9% (43min downtime/month)
Backup: Daily automated backups
Recovery: RPO 1 hour, RTO 4 hours
Monitoring: Datadog + PagerDuty alerts
```

## 6. Deployment Architecture

### Infrastructure (AWS)
```
┌─────────────────────────────────────────┐
│ CloudFront CDN                          │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│ Application Load Balancer               │
└────┬───────────────────┬─────────────── ┘
     │                   │
┌────▼──────┐      ┌────▼──────┐
│ EC2 Auto  │      │ EC2 Auto  │
│ Scaling   │      │ Scaling   │
│ Group 1   │      │ Group 2   │
└────┬──────┘      └────┬──────┘
     │                   │
┌────▼───────────────────▼─────────────┐
│ RDS PostgreSQL (Multi-AZ)            │
└──────────────────────────────────────┘
```

### CI/CD Pipeline
```yaml
GitHub Push → GitHub Actions
  ↓
Run Tests (Jest + Cypress)
  ↓
Build Docker Image
  ↓
Push to ECR
  ↓
Deploy to ECS Staging
  ↓
Automated Tests
  ↓
Manual Approval
  ↓
Deploy to ECS Production
  ↓
Health Check
```

## 7. Migration Strategy

### Phase 1: Data Migration
```sql
-- Export from old system
SELECT * FROM legacy_invoices
INTO OUTFILE '/tmp/invoices.csv';

-- Transform and load
COPY invoices(invoice_number, client_id, total, created_at)
FROM '/tmp/invoices_transformed.csv'
DELIMITER ',' CSV HEADER;
```

### Phase 2: Parallel Run
- Run old and new systems simultaneously
- Compare outputs for validation
- Fix discrepancies

### Phase 3: Cutover
- Freeze old system
- Final data sync
- Switch traffic to new system
- Monitor closely

## 8. Testing Strategy

### Unit Tests
```javascript
describe('Invoice calculation', () => {
  it('should calculate total with tax', () => {
    const invoice = {
      subtotal: 1000,
      taxRate: 0.10
    };

    const total = calculateTotal(invoice);
    expect(total).toBe(1100);
  });
});
```

### Integration Tests
```javascript
describe('POST /api/invoices', () => {
  it('should create invoice and send email', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(invoiceData);

    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toMatch(/INV-/);
    expect(emailSent).toBe(true);
  });
});
```

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| API performance | High | Caching, indexing, load testing |
| Data loss | Critical | Automated backups, replication |
| Third-party outage | Medium | Retry logic, fallback options |

## 10. Appendix

### Database Indexes
```sql
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);
```

### Environment Variables
```bash
# .env.production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
SENDGRID_API_KEY=SG.xxx
STRIPE_SECRET_KEY=sk_live_xxx
JWT_SECRET=your-secret-key
```
```

---

## SDD Best Practices

✅ **Start with architecture** - High-level first
✅ **Use diagrams** - Mermaid, DBML, flowcharts
✅ **Be specific** - Exact tech, not "a database"
✅ **Include code** - API examples, queries
✅ **Think deployment** - How to ship it?
✅ **Plan migration** - From old to new
✅ **Test strategy** - How to verify?

---

<p><a href="./02-requirements-analysis.md">← Requirements Analysis</a> | <a href="./04-process-modeling.md">Tiếp: Process Modeling →</a></p>
