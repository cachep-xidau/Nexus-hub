# Workflow-Agent-Skill Reference cho BSA

## Tổng quan

BSA sử dụng **workflows**, **agents** và **skills** để thiết kế solutions từ requirements đến technical specifications.

## Cấu trúc

```
Business Need
    ↓
Workflow (quy trình phân tích)
    ↓
Agent (BSA specialist)
    ↓
Skill (công cụ/template)
    ↓
Deliverable (BRD, FRS, SDD)
```

## Workflows chính cho BSA

### 1. Requirements Analysis Workflow
**Khi nào dùng:** Bắt đầu project, gather requirements

**Agents:**
- `project-planner` - Scope definition
- `explorer-agent` - Research existing systems

**Skills:**
- `bsa-analysis` - Requirements elicitation, gap analysis
- `brainstorming` - Workshop facilitation
- `plan-writing` - Structured documentation

**Deliverables:**
- Business Requirements Document (BRD)
- Functional Requirements Specification (FRS)
- Requirements Traceability Matrix (RTM)

**Example:**
```bash
/plan requirements analysis for invoice system

# Agent workflow:
# 1. Elicit business needs
# 2. Analyze current state (As-Is)
# 3. Define future state (To-Be)
# 4. Gap analysis
# 5. Output BRD + FRS
```

### 2. Solution Design Workflow
**Khi nào dùng:** After requirements approved, before development

**Agents:**
- `backend-specialist` - API/database design
- `frontend-specialist` - UI/UX specifications

**Skills:**
- `bsa-solution-design` - SDD templates, integration patterns
- `database-design` - ERD, schema design
- `api-patterns` - REST API design

**Deliverables:**
- Solution Design Document (SDD)
- Entity Relationship Diagram (ERD)
- API specifications
- Integration architecture

**Example:**
```bash
/create solution design for invoice management

# Output:
# - System architecture diagram
# - Database schema (DBML)
# - API endpoint specs
# - Integration points
# - Deployment strategy
```

### 3. Data Modeling Workflow
**Khi nào dùng:** Database design, data migration

**Agents:**
- `backend-specialist` - Database architect

**Skills:**
- `database-design` - ERD, normalization
- `bsa-solution-design` - Data architecture patterns

**Deliverables:**
- ERD diagrams (DBML format for dbdiagram.io)
- Data dictionary
- Migration scripts

**Example:**
```bash
/create ERD for invoice system

# Output DBML:
Table users {
  id integer [primary key]
  email varchar(255) [unique]
  created_at timestamp
}

Table invoices {
  id integer [primary key]
  user_id integer [ref: > users.id]
  total decimal(10,2)
}
```

### 4. Process Modeling Workflow
**Khi nào dùng:** Document business processes, workflows

**Agents:**
- `explorer-agent` - Process discovery

**Skills:**
- `bsa-solution-design` - BPMN diagrams, use cases

**Deliverables:**
- Process flow diagrams (BPMN)
- Use case diagrams
- Sequence diagrams
- Swimlane diagrams

**Example:**
```bash
/create process flow for invoice approval

# Output: Mermaid diagram
graph TD
    A[Create Invoice] --> B{Manager Review}
    B -->|Approve| C[Send to Client]
    B -->|Reject| D[Return to User]
    D --> A
```

### 5. API Design Workflow
**Khi nào dùng:** RESTful API specifications

**Agents:**
- `backend-specialist` - API design

**Skills:**
- `api-patterns` - REST best practices
- `bsa-solution-design` - Integration design

**Deliverables:**
- API endpoint specifications
- Request/response examples
- Authentication flows
- Error handling specs

**Example:**
```bash
/design API for invoice CRUD operations

# Output:
POST /api/invoices
GET /api/invoices/:id
PUT /api/invoices/:id
DELETE /api/invoices/:id

# With full request/response examples
```

### 6. User Story Creation Workflow
**Khi nào dùng:** Agile development, sprint planning

**Agents:**
- `product-manager` - Story writing from BSA perspective

**Skills:**
- `bsa-solution-design` - User story templates (BSA format)

**Deliverables:**
- User stories with ACs
- Function lists
- Screen descriptions

**Example:**
```bash
/create user stories for invoice export

# Output:
**User Story US-001:**
As a user
I want to export invoice to PDF
So that I can send professional documents

**Acceptance Criteria:**
- PDF generated within 3 seconds
- Includes company logo
- Contains all invoice details
```

## Skills Reference for BSA

| Skill | Mục đích | Khi nào dùng |
|-------|----------|--------------|
| `bsa-analysis` | Requirements, gap analysis, impact analysis | Analysis phase |
| `bsa-solution-design` | SDD, ERD, API specs, user stories | Design phase |
| `database-design` | Schema design, ERD | Data modeling |
| `api-patterns` | REST API design | API specification |
| `frontend-design` | UI/UX specs, wireframes | Screen design |
| `architecture` | System architecture, ADRs | Architecture decisions |
| `plan-writing` | Structured docs | Documentation |
| `systematic-debugging` | Root cause analysis | Issue investigation |

## Deliverables Mapping

### BRD (Business Requirements Document)
```bash
/create BRD for [project]

# Agent: project-planner
# Skill: bsa-analysis
# Template includes:
- Executive summary
- Business objectives
- Stakeholders
- Scope (in/out)
- Success criteria
```

### FRS (Functional Requirements Specification)
```bash
/create FRS for [feature]

# Agent: project-planner
# Skill: bsa-solution-design
# Template includes:
- Functional requirements (FR-001, FR-002...)
- Use cases
- Business rules
- Validation rules
```

### SDD (Solution Design Document)
```bash
/create SDD for [solution]

# Agent: backend-specialist
# Skill: bsa-solution-design
# Template includes:
- Architecture diagram
- ERD (DBML)
- API specs
- Integration design
- Security design
```

### ERD (Entity Relationship Diagram)
```bash
/create ERD for [domain]

# Agent: backend-specialist
# Skill: database-design
# Output: DBML format
# Copy to dbdiagram.io for visualization
```

### Use Case Diagram
```bash
/create use case diagram for [system]

# Agent: explorer-agent
# Skill: bsa-solution-design
# Output: PlantUML format
```

### Sequence Diagram
```bash
/create sequence diagram for [flow]

# Agent: backend-specialist
# Skill: bsa-solution-design
# Output: PlantUML format
```

## Agent Coordination

### Typical BSA Flow:

```
1. Analysis Phase
   └─ project-planner + bsa-analysis
      → BRD, FRS

2. Design Phase
   └─ backend-specialist + bsa-solution-design
      → SDD, ERD, API specs

3. Validation Phase
   └─ explorer-agent + systematic-debugging
      → Review, validation

4. Documentation Phase
   └─ All agents + plan-writing
      → Final deliverables
```

## Practical Examples

### Example 1: Complete Requirements Analysis
```bash
# User request:
"Analyze requirements for invoice management system"

# Workflow:
/plan requirements analysis for invoice system

# Agents invoked:
1. project-planner (BRD)
2. explorer-agent (current system analysis)

# Skills used:
- bsa-analysis (elicitation, gap analysis)
- brainstorming (stakeholder workshops)

# Deliverables:
## BRD
- Business objective: Automate invoicing
- Stakeholders: Finance, Sales, Customers
- Scope: Create, send, track invoices

## FRS
FR-001: System shall create invoice
FR-002: System shall calculate tax
FR-003: System shall send email
```

### Example 2: Database Design
```bash
# User request:
"Design database schema for invoices"

# Workflow:
/create ERD for invoice domain

# Agent: backend-specialist
# Skill: database-design

# Output DBML:
Table users {
  id integer [pk, increment]
  email varchar(255) [unique, not null]
  name varchar(100)
}

Table invoices {
  id integer [pk]
  user_id integer [ref: > users.id]
  invoice_number varchar(20) [unique]
  total decimal(10,2)
  status varchar(20)
}

Table invoice_items {
  id integer [pk]
  invoice_id integer [ref: > invoices.id]
  description text
  amount decimal(10,2)
}

# Copy to dbdiagram.io for visual ERD
```

### Example 3: API Specification
```bash
# User request:
"Design REST API for invoice CRUD"

# Workflow:
/design API for invoice management

# Agent: backend-specialist
# Skills: api-patterns, bsa-solution-design

# Output:
## Endpoints

### Create Invoice
POST /api/invoices
Authorization: Bearer {token}

Request:
{
  "clientId": 123,
  "items": [
    {"description": "Service", "amount": 1000}
  ],
  "taxRate": 0.1
}

Response 201:
{
  "invoiceId": 456,
  "invoiceNumber": "INV-2026-001",
  "total": 1100
}

### Get Invoice
GET /api/invoices/:id
Response 200: {invoice details}

### Update Invoice
PUT /api/invoices/:id

### Delete Invoice
DELETE /api/invoices/:id
```

## Best Practices

### 1. Start with Requirements
```bash
❌ Bad: Jump to design without requirements
✅ Good: BRD → FRS → SDD
```

### 2. Use Templates
```bash
# BSA skills provide templates
/create BRD using template
/create FRS using template
/create SDD using template
```

### 3. Document Traceability
```bash
# Link everything
BR-001 → FR-001 → Design-001 → Test-001
```

### 4. Validate with Stakeholders
```bash
# After each deliverable
BRD → Stakeholder review → Approved → FRS
```

## Common BSA Workflows

| Workflow | Command | Output |
|----------|---------|--------|
| Requirements Gathering | `/plan requirements for [project]` | BRD + FRS |
| Solution Design | `/create solution design for [feature]` | SDD |
| Database Design | `/create ERD for [domain]` | DBML ERD |
| API Design | `/design API for [resource]` | API specs |
| Process Modeling | `/create process flow for [process]` | BPMN diagram |
| Use Case | `/create use case for [feature]` | PlantUML |
| User Stories | `/create user stories from [FRS]` | User stories |
| Gap Analysis | `/analyze gap between [current] and [target]` | Gap analysis report |

---

<p><a href="./README.md">← Trang chủ</a> | <a href="./01-tong-quan-bsa-solution-design.md">Tiếp: Tổng Quan BSA →</a></p>
