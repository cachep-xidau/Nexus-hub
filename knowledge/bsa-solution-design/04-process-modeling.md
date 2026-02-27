# Process Modeling với BPMN

## BPMN Diagrams

### Invoice Creation Flow
```mermaid
graph TD
    Start([User clicks Create Invoice]) --> Input[Fill Invoice Form]
    Input --> Validate{Valid?}
    Validate -->|No| Error[Show Errors]
    Error --> Input
    Validate -->|Yes| Calculate[Calculate Totals]
    Calculate --> Preview[Show Preview]
    Preview --> Confirm{Confirm?}
    Confirm -->|No| Input
    Confirm -->|Yes| Save[Save to Database]
    Save --> PDF[Generate PDF]
    PDF --> Email{Send Email?}
    Email -->|Yes| SendEmail[Send via SendGrid]
    Email -->|No| Done([Success])
    SendEmail --> Done
```

### Approval Workflow
```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Pending: Submit
    Pending --> Approved: Manager Approves
    Pending --> Rejected: Manager Rejects
    Rejected --> Draft: Edit
    Approved --> Paid: Payment Received
    Paid --> [*]
```

## Use Case Diagram (PlantUML)

```plantuml
@startuml
left to right direction
actor User
actor Admin

rectangle "Invoice System" {
  User --> (Create Invoice)
  User --> (Edit Invoice)
  User --> (View Invoice)
  User --> (Download PDF)

  Admin --> (Manage Users)
  Admin --> (View Reports)

  (Create Invoice) .> (Calculate Tax) : include
  (Create Invoice) .> (Send Email) : include
}
@enduml
```

## Sequence Diagram

```plantuml
@startuml
actor User
participant "Web App" as App
participant "API" as API
participant "Database" as DB
participant "PDF Service" as PDF
participant "Email Service" as Email

User -> App: Click "Create Invoice"
App -> API: POST /invoices
API -> DB: Save invoice
DB --> API: Invoice ID
API -> PDF: Generate PDF
PDF --> API: PDF URL
API -> Email: Send email
Email --> API: Success
API --> App: Invoice created
App --> User: Show success
@enduml
```

## Swimlane Diagram

```markdown
┌─────────────────────────────────────────────────────┐
│ Invoice Approval Process                            │
├──────────┬──────────────┬──────────────┬───────────┤
│ User     │ Manager      │ Finance      │ System    │
├──────────┼──────────────┼──────────────┼───────────┤
│ Create   │              │              │           │
│ Invoice  │              │              │           │
│    │     │              │              │           │
│    ▼     │              │              │           │
│ Submit ──┼─► Review     │              │           │
│          │     │        │              │           │
│          │     ▼        │              │           │
│          │  Approve? ───┼─► Process    │           │
│          │     │        │     │        │           │
│          │     │        │     ▼        │           │
│          │     │        │  Record ─────┼─► Update  │
│          │     │        │              │   Status  │
│          │     ▼        │              │     │     │
│      ◄───┼── Notify     │              │     │     │
│  Receive │              │              │     │     │
│  Email   │              │              │     ▼     │
│          │              │              │   Done    │
└──────────┴──────────────┴──────────────┴───────────┘
```

## Data Flow Diagram (Level 0)

```mermaid
graph LR
    A[User] -->|Invoice Data| B(Invoice System)
    B -->|Invoice PDF| A
    B -->|Email| C[Client]
    B -->|Store| D[(Database)]
    D -->|Retrieve| B
```

## Tools

- **Mermaid.js** - Diagrams in markdown
- **PlantUML** - UML diagrams
- **Lucidchart** - Online diagramming
- **Draw.io** - Free, open-source

---

<p><a href="./03-solution-design-document.md">← Solution Design Document</a> | <a href="./README.md">Về Trang chủ →</a></p>
