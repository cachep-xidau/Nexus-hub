# Roadmap Planning

## Roadmap Structure

### Quarterly Roadmap
```markdown
Q1 2026: Foundation
├─ Jan: User Auth + Core Features
├─ Feb: Payments Integration
└─ Mar: Mobile App MVP

Q2 2026: Growth
├─ Apr: Analytics Dashboard
├─ May: Team Collaboration
└─ Jun: API Platform

Q3 2026: Scale
Q4 2026: Enterprise
```

## Prioritization Framework: RICE

**RICE = Reach × Impact × Confidence / Effort**

```javascript
const calculateRICE = (feature) => {
  const reach = feature.usersAffected; // per quarter
  const impact = feature.impactScore; // 0.25, 0.5, 1, 2, 3
  const confidence = feature.confidence; // 50%, 80%, 100%
  const effort = feature.personMonths; // team months

  return (reach * impact * confidence) / effort;
};

// Example
const exportPDF = {
  reach: 5000,
  impact: 2, // High
  confidence: 0.8,
  effort: 1
};

const score = calculateRICE(exportPDF);
// = (5000 × 2 × 0.8) / 1 = 8000
```

## Feature Template

```yaml
Feature: Export Invoices to PDF
Epic: Invoice Management
Priority: P0 (Must have)
Target: Q1 2026

User Story:
  As a user
  I want to export invoices to PDF
  So that I can send professional documents to clients

Success Metrics:
  - 60% of users export at least 1 invoice
  - PDF generation < 3 seconds
  - 95% success rate

Dependencies:
  - PDF library integration
  - Cloud storage setup

Effort: 2 weeks (1 engineer)
```

## Roadmap Communication

### Stakeholder Updates
```markdown
## February Product Update

### ✅ Shipped
- Invoice templates (80% adoption!)
- Email notifications (reduced support tickets 30%)
- Dark mode (requested by 200+ users)

### 🚧 In Progress
- Mobile app (iOS beta next week)
- Recurring invoices (70% complete)

### 📅 Next Month
- Payment tracking
- Multi-currency support
- API documentation

### ❌ Deprioritized
- Advanced reporting (waiting for analytics v2)
```

## OKR Framework

**Objective:** Become #1 invoicing tool for freelancers

**Key Results (Q1 2026):**
```markdown
KR1: Increase active users from 5K → 10K
  ├─ Current: 5,432 users
  ├─ Target: 10,000 users
  └─ Progress: 54% ██████████░░░░░░░░░░

KR2: Improve NPS from 30 → 50
  ├─ Current: 45
  ├─ Target: 50
  └─ Progress: 75% ███████████████░░░░░

KR3: Reduce churn from 5% → 3%
  ├─ Current: 3.8%
  ├─ Target: 3%
  └─ Progress: 60% ████████████░░░░░░░░
```

## Roadmap Tools

- **ProductBoard** - Feature prioritization
- **Aha!** - Strategy + roadmap
- **Jira** - Sprint planning
- **Notion** - Documentation

---

<p><a href="./04-metrics-and-analytics.md">← Metrics & Analytics</a> | <a href="./README.md">Về Trang chủ →</a></p>
