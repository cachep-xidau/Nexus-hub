# Tổng Quan BSA Solution Design

## Business Systems Analyst là gì?

Business Systems Analyst (BSA) là **bridge giữa business và technology**. BSA:
- Phân tích business processes và requirements
- Thiết kế solutions để đáp ứng business needs
- Đảm bảo technical solutions align với business goals
- Facilitate communication giữa stakeholders và dev teams

## Vai trò cốt lõi

### 1. Requirements Analysis
- Elicit requirements từ stakeholders
- Document business và functional requirements
- Validate và verify requirements
- Manage requirements changes

### 2. Solution Design
- Design technical solutions
- Create system architecture
- Define integration patterns
- Document design decisions

### 3. Process Analysis
- Map current state (As-Is)
- Design future state (To-Be)
- Identify gaps và improvements
- Optimize business processes

### 4. Stakeholder Management
- Facilitate workshops
- Manage expectations
- Resolve conflicts
- Build consensus

### 5. Quality Assurance
- Define acceptance criteria
- Review test cases
- Validate implementations
- Ensure traceability

## BSA vs BA vs Technical BA

| Aspect | Business Analyst (BA) | BSA | Technical BA |
|--------|----------------------|-----|--------------|
| Focus | Business processes | Solutions & systems | Technical implementation |
| Deliverables | BRD, Process flows | FRS, Design docs | Technical specs, APIs |
| Technical depth | Low | Medium-High | High |
| Stakeholders | Business users | Business + Tech | Mainly Tech teams |

## Essential Skills

### Technical Skills
1. **Systems Analysis** - Architecture, Integration, Data flows
2. **Modeling** - UML, BPMN, ERD, DFD
3. **SQL & Databases** - Data analysis, Query writing
4. **APIs & Integration** - REST, SOAP, Microservices
5. **Tools** - Visio, Enterprise Architect, JIRA, Confluence

### Business Skills
1. **Domain Knowledge** - Industry-specific expertise
2. **Process Mapping** - BPMN, Flowcharts
3. **Requirements Engineering** - BABOK techniques
4. **Gap Analysis** - Current vs Future state
5. **Cost-Benefit Analysis** - ROI, TCO

### Soft Skills
1. **Communication** - Technical & non-technical audiences
2. **Facilitation** - Workshops, Meetings
3. **Problem Solving** - Root cause analysis
4. **Documentation** - Clear, concise, comprehensive
5. **Critical Thinking** - Challenge assumptions

## BABOK Framework

**BABOK (Business Analysis Body of Knowledge)** - Industry standard

### 6 Knowledge Areas:

1. **Business Analysis Planning & Monitoring**
   - Plan BA approach
   - Manage stakeholders
   - Govern BA activities

2. **Elicitation & Collaboration**
   - Prepare for elicitation
   - Conduct elicitation
   - Confirm results

3. **Requirements Life Cycle Management**
   - Trace requirements
   - Maintain requirements
   - Prioritize requirements

4. **Strategy Analysis**
   - Analyze current state
   - Define future state
   - Assess risks

5. **Requirements Analysis & Design Definition**
   - Specify & model requirements
   - Verify requirements
   - Validate requirements

6. **Solution Evaluation**
   - Measure solution performance
   - Analyze performance measures
   - Recommend improvements

## Solution Design Process

```
1. Understand Business Need
   ↓
2. Analyze Current State (As-Is)
   ↓
3. Define Future State (To-Be)
   ↓
4. Gap Analysis
   ↓
5. Solution Options
   ↓
6. Design Selected Solution
   ↓
7. Validate Design
   ↓
8. Document & Communicate
```

## Key Deliverables

### Discovery Phase
- Stakeholder Analysis (RACI, Power/Interest Grid)
- Current State Documentation (As-Is)
- Business Case
- Feasibility Study

### Analysis Phase
- Business Requirements Document (BRD)
- Functional Requirements Specification (FRS)
- Non-Functional Requirements (NFRs)
- Use Cases / User Stories

### Design Phase
- Solution Design Document (SDD)
- System Architecture Diagram
- Integration Design
- Data Model (ERD)
- API Specifications

### Implementation Phase
- Technical Specifications
- Test Cases
- User Acceptance Criteria
- Training Materials

## Common Modeling Techniques

1. **Process Models** - BPMN, Flowcharts, Swimlanes
2. **Data Models** - ERD, Data Dictionary
3. **Use Case Models** - Use Case Diagrams, Specifications
4. **Interface Models** - Wireframes, Mockups
5. **Sequence Models** - Sequence Diagrams, State Diagrams

## BSA trong Agile

Modern BSAs cần adapt:
- Write User Stories thay vì dài dòng specs
- Participate trong Sprint ceremonies
- Collaborate closely với Dev teams
- Iterate on requirements
- Balance documentation với working software

## Tools & Technologies

### Modeling Tools
- Microsoft Visio
- Enterprise Architect
- Lucidchart
- Draw.io

### Requirements Management
- JIRA
- Confluence
- Azure DevOps
- IBM DOORS

### Databases & SQL
- MySQL, PostgreSQL
- SQL Server
- Oracle

### API Tools
- Postman
- Swagger/OpenAPI
- SOAP UI

## Best Practices

1. **Start with Why** - Understand business context
2. **Involve Stakeholders Early** - Avoid rework
3. **Use Visual Models** - A picture is worth 1000 words
4. **Validate Often** - Don't wait until end
5. **Trace Everything** - Requirements to design to test
6. **Document Decisions** - ADRs (Architecture Decision Records)
7. **Think End-to-End** - Consider full lifecycle

## Common Challenges

- **Unclear Requirements** - Vague business needs
- **Scope Creep** - Ever-changing requirements
- **Technical Constraints** - Legacy systems, integrations
- **Stakeholder Conflicts** - Competing priorities
- **Time Pressure** - Fast delivery vs thorough analysis

## Career Path

```
Junior BSA → BSA → Senior BSA → Lead BSA → Enterprise Architect / Solution Architect
```

## Certifications

- **CBAP** (Certified Business Analysis Professional)
- **CCBA** (Certification of Capability in Business Analysis)
- **PMI-PBA** (Professional in Business Analysis)
- **IIBA Certifications** (Entry Certificate, ECBA)
- **Agile Analysis Certification** (IIBA-AAC)

---

<p><a href="./README.md">← Trang chủ</a> | <a href="./02-requirements-analysis.md">Tiếp: Requirements Analysis →</a></p>
