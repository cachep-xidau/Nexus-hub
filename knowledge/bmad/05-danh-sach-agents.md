# Danh Sách Agents Đã Cài Đặt

[← Workflow-Agent-Skill](./04-workflow-agent-skill-reference.md) | [Tiếp: Danh Sách Workflows →](./06-danh-sach-workflows.md)

---

## Tổng quan 9 agents

| Agent | Tên | Vai trò | Menu Triggers |
|-------|-----|---------|---------------|
| **Analyst** | Mary | Business Analyst - phân tích chiến lược | Brainstorm Project, Market Research, Domain Research, Technical Research, Create Brief, Document Project |
| **Product Manager** | John | PRD, epics/stories, stakeholder alignment | Create PRD, Validate PRD, Edit PRD, Create Epics, Implementation Readiness, Correct Course |
| **Architect** | Winston | Thiết kế hệ thống, quyết định kỹ thuật | Create Architecture, Implementation Readiness |
| **UX Designer** | Sally | Trải nghiệm người dùng, thiết kế UI | Create UX Design |
| **Scrum Master** | Bob | Sprint planning, quản lý stories | Sprint Planning, Create Story, Execute Retrospective, Correct Course |
| **Developer** | Amelia | Implementation, code review | Dev Story, Code Review |
| **QA Engineer** | Quinn | Test automation | QA Automate |
| **Quick Flow Solo Dev** | Barry | Quick spec + dev cho tasks nhỏ | Quick Spec, Quick Dev, Code Review |
| **Technical Writer** | Paige | Documentation, Mermaid diagrams | Write Document, Update Standards, Mermaid Generate, Validate Doc, Explain Concept |

## Chi tiết từng agent

### Mary (Analyst)
- **Phase:** 1 - Analysis
- **Workflows:** Brainstorm, Market/Domain/Technical Research, Create Brief, Document Project
- **Tính cách:** Channeling expert business analysis frameworks (Porter's Five Forces...)
- **Khi nào dùng:** Bắt đầu dự án mới, cần research, tạo product brief

### John (Product Manager)
- **Phase:** 2 & 3
- **Workflows:** Create/Validate/Edit PRD, Create Epics & Stories, Implementation Readiness, Correct Course
- **Tính cách:** "Hỏi TẠI SAO? như thám tử. Direct và data-sharp."
- **Khi nào dùng:** Định nghĩa yêu cầu, chia stories, kiểm tra readiness

### Winston (Architect)
- **Phase:** 3
- **Workflows:** Create Architecture, Implementation Readiness
- **Tính cách:** "Cân bằng 'what could be' với 'what should be'"
- **Khi nào dùng:** Quyết định tech stack, patterns, ADRs

### Sally (UX Designer)
- **Phase:** 2
- **Workflows:** Create UX Design (14 steps)
- **Tính cách:** "Mọi quyết định phục vụ nhu cầu thực của user. Start simple."
- **Khi nào dùng:** Dự án có UI, cần design system

### Bob (Scrum Master)
- **Phase:** 4
- **Workflows:** Sprint Planning, Create Story, Retrospective, Correct Course
- **Tính cách:** "Servant leader"
- **Khi nào dùng:** Quản lý sprint, chuẩn bị stories cho dev

### Amelia (Developer)
- **Phase:** 4
- **Workflows:** Dev Story, Code Review
- **Tính cách:** Senior Software Engineer
- **Khi nào dùng:** Implement code, review code

### Quinn (QA Engineer)
- **Phase:** 4
- **Workflows:** QA Automate
- **Tính cách:** Test automation specialist
- **Khi nào dùng:** Generate test suite cho code đã implement

### Barry (Quick Flow Solo Dev)
- **Phase:** Anytime
- **Workflows:** Quick Spec, Quick Dev, Code Review
- **Tính cách:** "Elite Full-Stack, implementation-focused, dùng tech slang"
- **Khi nào dùng:** Bug fix, feature nhỏ, không cần full planning

### Paige (Technical Writer)
- **Phase:** Anytime
- **Workflows:** Write Document, Update Standards, Mermaid Generate, Validate Doc, Explain Concept
- **Tính cách:** "Clarity above all"
- **Khi nào dùng:** Tạo documentation, diagrams, giải thích concepts

## Agent-to-Phase mapping

```
Phase 1 (Analysis):        Mary
Phase 2 (Planning):        John, Sally
Phase 3 (Solutioning):     Winston, John
Phase 4 (Implementation):  Bob, Amelia, Quinn
Anytime:                   Barry, Paige, Mary
```
