# Requirements Analysis

## Requirements Analysis là gì?

Quá trình:
- Thu thập (Elicitation)
- Phân tích (Analysis)
- Xác định (Specification)
- Xác thực (Validation)

**Mục tiêu:** Đảm bảo solution đáp ứng đúng business needs.

## Types of Requirements

### 1. Business Requirements (BR)
**What:** High-level business objectives

**Ví dụ:**
- Tăng revenue 20% trong Q2
- Giảm customer churn từ 15% xuống 10%
- Mở rộng sang thị trường mới

### 2. Functional Requirements (FR)
**What:** System phải làm gì

**Ví dụ:**
- System phải cho phép user đăng nhập bằng email
- System phải gửi email xác nhận sau khi order
- System phải tính tax tự động

### 3. Non-Functional Requirements (NFR)
**What:** System phải hoạt động như thế nào

**Categories:**
- **Performance** - Response time < 2s
- **Scalability** - Support 10K concurrent users
- **Security** - Encrypt sensitive data
- **Availability** - 99.9% uptime
- **Usability** - Mobile responsive

## Requirements Elicitation

### Techniques

**1. Interviews**
- One-on-one với stakeholders
- Structured hoặc unstructured
- Document insights

**2. Workshops**
- Group sessions
- Brainstorming
- Consensus building

**3. Observation**
- Shadow users
- Workflow analysis
- Pain point identification

**4. Document Analysis**
- Review existing docs
- Process manuals
- System specifications

**5. Surveys/Questionnaires**
- Large user base
- Quantitative data
- Priority ranking

### Good Practices

✅ **Prepare questions beforehand**
✅ **Listen more than talk**
✅ **Ask "why" 5 times**
✅ **Document immediately**
✅ **Validate understanding**

❌ **Don't assume**
❌ **Don't lead stakeholders**
❌ **Don't skip validation**

## Business Requirements Document (BRD)

### Structure

```
1. Executive Summary
2. Business Objectives
3. Background/Context
4. Scope
   - In Scope
   - Out of Scope
5. Stakeholders
6. Business Requirements
7. Success Criteria
8. Assumptions & Constraints
9. Risks
10. Approval
```

### Example BR

**BR-001: User Authentication**
- **Description:** System must authenticate users securely
- **Business Value:** Protect user data, comply with regulations
- **Priority:** High
- **Source:** Security Team
- **Acceptance:** Users can login with MFA

## Functional Requirements Specification (FRS)

### Structure

```
1. Introduction
2. System Overview
3. Functional Requirements
   - Use Cases
   - User Stories
   - Acceptance Criteria
4. User Interface Requirements
5. Data Requirements
6. Integration Requirements
7. Traceability Matrix
```

### Writing Good FRs

**Template:** System shall [action] [object] [qualifier]

**Examples:**

✅ **Good:**
- System shall send email notification within 5 minutes of order confirmation
- System shall display error message when password is invalid

❌ **Bad:**
- System should be fast (vague)
- System must be user-friendly (subjective)

### SMART Requirements

- **S**pecific - Clear and unambiguous
- **M**easurable - Quantifiable
- **A**chievable - Technically feasible
- **R**elevant - Aligned with business goals
- **T**estable - Can verify implementation

## Use Cases

### Template

**Use Case:** Login to System

| Field | Value |
|-------|-------|
| Actor | End User |
| Precondition | User has account |
| Trigger | User clicks "Login" |
| Main Flow | 1. Enter credentials<br>2. System validates<br>3. Redirect to dashboard |
| Alternative Flow | Invalid credentials → Error message |
| Postcondition | User authenticated |

## User Stories (Agile)

### Format

**As a** [role]
**I want** [feature]
**So that** [benefit]

### Example

```
As a customer
I want to save my payment information
So that I can checkout faster next time
```

### Acceptance Criteria

**Given** [context]
**When** [action]
**Then** [outcome]

```
Given I am a logged-in customer
When I enter valid payment details and check "Save for future"
Then my payment info is encrypted and stored
And I see confirmation message
```

## Requirements Validation

### Techniques

**1. Reviews/Walkthroughs**
- Stakeholder reviews
- Peer reviews
- Formal inspections

**2. Prototyping**
- Show mockups
- Get feedback
- Iterate

**3. Test Case Development**
- Can we test it?
- Clear pass/fail criteria

### Validation Checklist

- ✅ Complete - All scenarios covered?
- ✅ Correct - Reflects actual needs?
- ✅ Consistent - No contradictions?
- ✅ Clear - Unambiguous?
- ✅ Feasible - Can be implemented?
- ✅ Testable - Can be verified?
- ✅ Traceable - Linked to business need?

## Requirements Traceability Matrix (RTM)

Maps requirements through lifecycle:

| Req ID | BR ID | Use Case | Design | Test Case | Status |
|--------|-------|----------|--------|-----------|--------|
| FR-001 | BR-001 | UC-001 | DD-001 | TC-001 | Complete |

**Benefits:**
- Ensure all requirements addressed
- Impact analysis for changes
- Coverage verification

## Change Management

### Process

1. **Submit Change Request**
2. **Impact Analysis** - Effort, cost, risk
3. **Approval** - Change Control Board
4. **Update Documentation**
5. **Communicate Changes**

### Change Request Template

- CR ID
- Requestor
- Date
- Current Requirement
- Proposed Change
- Justification
- Impact Assessment
- Decision

---

<p><a href="./01-tong-quan-bsa-solution-design.md">← Tổng quan BSA</a> | <a href="./03-solution-design-document.md">Tiếp: Solution Design →</a></p>
