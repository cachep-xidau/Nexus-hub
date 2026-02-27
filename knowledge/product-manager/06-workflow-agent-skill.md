# Workflow-Agent-Skill Reference cho Product Manager

## Tổng quan

Product Manager sử dụng **workflows**, **agents** và **skills** để quản lý product lifecycle một cách hiệu quả.

## Cấu trúc tương tự BMAD

```
User Request
    ↓
Workflow (quy trình)
    ↓
Agent (chuyên gia AI)
    ↓
Skill (công cụ cụ thể)
    ↓
Deliverable (sản phẩm)
```

## Workflows chính cho PM

### 1. Product Discovery Workflow
**Khi nào dùng:** Bắt đầu feature mới, validate ideas

**Agents liên quan:**
- `explorer-agent` - Market research, competitor analysis
- `product-manager` - User interviews, problem validation

**Skills:**
- `web-search` - Tìm kiếm thông tin thị trường
- `apify` - Scrape social media insights
- `user-research-synthesis` - Tổng hợp user feedback

**Deliverables:**
- Opportunity assessment
- User research report
- Problem validation document

**Example:**
```bash
/plan research competitor features for invoicing tools

# Agent sẽ:
# 1. Use web-search skill để tìm competitors
# 2. Use apify skill để scrape reviews
# 3. Synthesize findings
# 4. Output comparison report
```

### 2. PRD Creation Workflow
**Khi nào dùng:** Define new features, major updates

**Agents:**
- `project-planner` - Scope definition
- `product-manager` - Requirements gathering

**Skills:**
- `feature-spec` - PRD template generation
- `brainstorming` - Ideation sessions
- `bsa-analysis` - Requirements analysis

**Deliverables:**
- Product Requirements Document
- User stories
- Acceptance criteria

**Example:**
```bash
/create PRD for invoice PDF export feature

# Output: PRD với structure:
# - Problem statement
# - User stories
# - Functional requirements
# - Technical considerations
# - Success metrics
```

### 3. Metrics & Analytics Workflow
**Khi nào dùng:** Track product performance, A/B testing

**Agents:**
- `product-manager` - Metrics definition
- `explorer-agent` - Data analysis

**Skills:**
- `metrics-tracking` - Define KPIs
- `experimentation` - A/B test design
- `data-analysis` - SQL queries, analytics

**Deliverables:**
- Metrics dashboard specs
- A/B test plans
- Performance reports

**Example:**
```bash
/plan A/B test for checkout flow optimization

# Output:
# - Hypothesis
# - Test variants
# - Success metrics
# - Statistical significance calculator
```

### 4. Roadmap Planning Workflow
**Khi nào dùng:** Quarterly planning, prioritization

**Agents:**
- `product-manager` - Feature prioritization
- `project-planner` - Resource planning

**Skills:**
- `roadmap-management` - RICE scoring, prioritization
- `stakeholder-comms` - Stakeholder updates
- `feature-spec` - Feature breakdown

**Deliverables:**
- Quarterly roadmap
- OKRs
- Feature priority list

**Example:**
```bash
/plan Q2 2026 roadmap with RICE prioritization

# Output:
# - Features ranked by RICE score
# - Timeline allocation
# - Dependencies map
```

### 5. User Story Creation Workflow
**Khi nào dùng:** Breaking down features for dev

**Agents:**
- `product-manager` - Story writing
- `frontend-specialist` - UI stories
- `backend-specialist` - API stories

**Skills:**
- `feature-spec` - Story templates
- `user-research-synthesis` - User perspective
- `acceptance-criteria` - Clear ACs

**Deliverables:**
- User stories (INVEST format)
- Acceptance criteria
- Story points estimation

**Example:**
```bash
/create user stories for invoice PDF export

# Output:
# Story 1: As user, I want to preview PDF...
# Story 2: As user, I want to download PDF...
# Story 3: As user, I want to email PDF...
```

## Skills Reference for PM

| Skill | Mục đích | Khi nào dùng |
|-------|----------|--------------|
| `feature-spec` | PRD, user stories | Defining features |
| `roadmap-management` | Prioritization, planning | Quarterly planning |
| `stakeholder-comms` | Updates, alignment | Communication |
| `user-research-synthesis` | Insights từ research | After user interviews |
| `competitive-analysis` | Competitor research | Market analysis |
| `metrics-tracking` | KPI definition | Performance tracking |
| `market-sizing` | TAM/SAM/SOM | Business case |
| `pricing-research` | Pricing strategy | Monetization |
| `customer-journey-mapping` | User flows | UX optimization |
| `experimentation` | A/B testing | Feature validation |
| `web-search` | General research | Any research task |
| `apify` | Social media intel | User sentiment analysis |

## Agent Coordination

### Typical PM Flow:

```
1. Discovery Phase
   └─ explorer-agent + web-search + apify
      → Market research report

2. Planning Phase
   └─ product-manager + feature-spec + brainstorming
      → PRD document

3. Execution Phase
   └─ project-planner + roadmap-management
      → Sprint planning

4. Validation Phase
   └─ product-manager + metrics-tracking + experimentation
      → A/B test results
```

## Practical Examples

### Example 1: Competitive Analysis
```bash
# User request
"Research top 3 invoice tools and their pricing"

# Workflow triggers:
/plan competitive analysis for invoice tools

# Behind the scenes:
1. explorer-agent invoked
2. Loads skills: web-search, competitive-analysis
3. Searches for: FreshBooks, QuickBooks, Wave
4. Extracts: Features, pricing, reviews
5. Outputs: Comparison table

# Deliverable:
| Tool | Pricing | Key Features | User Rating |
|------|---------|--------------|-------------|
| FreshBooks | $15/mo | Simple UI | 4.5/5 |
| QuickBooks | $25/mo | Full accounting | 4.3/5 |
| Wave | Free | Basic invoicing | 4.0/5 |
```

### Example 2: Create PRD
```bash
# User request
"Create PRD for recurring invoice feature"

# Workflow:
/create PRD for recurring invoices

# Agent: product-manager
# Skills: feature-spec, bsa-analysis

# Output structure:
## 1. Problem Statement
Users manually create same invoice monthly

## 2. User Stories
- As a user, I want to set invoice recurrence
- As a user, I want to auto-send on schedule

## 3. Success Metrics
- 40% of users enable recurring
- 30% reduction in manual invoice creation

## 4. Technical Requirements
- Cron job for scheduling
- Email notification system
```

### Example 3: User Research Synthesis
```bash
# User request
"Synthesize insights from 15 user interviews"

# Workflow:
/analyze user interview transcripts

# Agent: product-manager
# Skill: user-research-synthesis

# Output:
## Top Pain Points
1. Invoice creation takes 5+ min (12/15 users)
2. No templates available (10/15 users)
3. Email delivery unreliable (8/15 users)

## Feature Requests
1. Auto-fill client details (13/15)
2. Recurring invoices (11/15)
3. Payment tracking (9/15)

## Recommended Actions
→ Prioritize templates (high impact, low effort)
→ Build recurring invoices (high demand)
```

## Best Practices

### 1. Always Start with Discovery
```bash
❌ Bad: Jump straight to PRD
✅ Good: /plan market research → validate → create PRD
```

### 2. Use Right Agent for Task
```bash
❌ Bad: Ask frontend-specialist for market research
✅ Good: Use explorer-agent for research
```

### 3. Leverage Multiple Skills
```bash
# Combine skills for better results
/plan feature with:
- competitive-analysis (what competitors do)
- user-research-synthesis (what users need)
- market-sizing (business opportunity)
```

### 4. Iterate Based on Data
```bash
# Workflow cycle
Research → PRD → Build → Metrics → Iterate
   ↑                                    ↓
   └────────── Feedback loop ───────────┘
```

## Common PM Workflows

| Workflow | Trigger Command | Output |
|----------|----------------|--------|
| Market Research | `/plan market research for [topic]` | Research report |
| Create PRD | `/create PRD for [feature]` | PRD document |
| Competitive Analysis | `/plan competitive analysis` | Comparison table |
| User Story Writing | `/create user stories for [epic]` | User stories |
| Roadmap Planning | `/plan [quarter] roadmap` | Prioritized roadmap |
| Metrics Definition | `/plan metrics for [feature]` | KPI dashboard spec |
| A/B Test Design | `/plan A/B test for [hypothesis]` | Test plan |

---

<p><a href="./README.md">← Trang chủ</a> | <a href="./01-tong-quan-product-management.md">Tiếp: Tổng Quan PM →</a></p>
