# Cách Workflow - Agent - Skill - Reference Hoạt Động

[← Ba Track](./03-ba-track-lap-ke-hoach.md) | [Tiếp: Danh Sách Agents →](./05-danh-sach-agents.md)

---

## Mối quan hệ giữa các thành phần

```
┌──────────────────────────────────────────────────┐
│                 NGƯỜI DÙNG                        │
│        Gõ slash command: /bmad-bmm-create-prd    │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│            WORKFLOW (workflow.md/yaml)             │
│  Quy trình tuần tự theo step-file architecture    │
│  Mỗi step là 1 file riêng, load just-in-time      │
│  VD: create-prd có 12 steps                       │
└─────────────────────┬────────────────────────────┘
                      │ Workflow tự động load
                      ▼
┌──────────────────────────────────────────────────┐
│            AGENT (agent.md/yaml)                   │
│  Persona chuyên biệt: tên, vai trò, giao tiếp     │
│  VD: John (PM) - "Hỏi TẠI SAO? như thám tử"      │
│  Agent có menu với các trigger (CP, VP, EP...)     │
└─────────────────────┬────────────────────────────┘
                      │ Agent load config
                      ▼
┌──────────────────────────────────────────────────┐
│            CONFIG & REFERENCES                     │
│  config.yaml → user_name, language, output paths   │
│  Manifests → Registry of all workflows/agents      │
│  Templates → Cấu trúc output document             │
│  Data files → domain-complexity, project-types     │
└─────────────────────┬────────────────────────────┘
                      │ Tạo ra
                      ▼
┌──────────────────────────────────────────────────┐
│            ARTIFACTS (Output)                      │
│  planning-artifacts/ → PRD.md, architecture.md     │
│  implementation-artifacts/ → stories/, sprint      │
│  project-knowledge/ (docs/) → research, context   │
└──────────────────────────────────────────────────┘
```

## Step-File Architecture

Mỗi workflow chia quy trình thành các file nhỏ, mỗi file là 1 bước:

```
create-prd/
├── workflow-create-prd.md    ← Entry point
├── steps-c/
│   ├── step-01-init.md       ← Khởi tạo
│   ├── step-02-discovery.md  ← Khám phá yêu cầu
│   ├── step-03-success.md    ← Success metrics
│   ├── step-04-journeys.md   ← User journeys
│   ├── step-05-domain.md     ← Domain requirements
│   ├── step-06-innovation.md ← Tính năng sáng tạo
│   ├── step-07-project-type.md ← Phân loại dự án
│   ├── step-08-scoping.md    ← MVP scope
│   ├── step-09-functional.md ← Functional requirements
│   ├── step-10-nonfunctional.md ← Non-functional
│   ├── step-11-polish.md     ← Review & hoàn thiện
│   └── step-12-complete.md   ← Lưu file
└── templates/
    └── prd-template.md       ← Template cấu trúc
```

**5 nguyên tắc step-file:**

1. **Micro-file Design** -- Mỗi step là 1 file tự chứa
2. **Just-In-Time Loading** -- Chỉ load step hiện tại, không load trước
3. **Sequential Enforcement** -- Hoàn thành theo thứ tự, không bỏ qua
4. **State Tracking** -- Tiến trình ghi trong frontmatter (`stepsCompleted`)
5. **Append-Only Building** -- Document xây dựng bằng cách append

## Agent Architecture

Mỗi agent tuân theo cấu trúc thống nhất:

```
<agent>
  <activation>
    Step 1: Load persona từ agent file
    Step 2: Load config.yaml → user_name, language, paths
    Step 3: Remember user's name
    Step 4: Show greeting + display menu
    Step 5: Wait for input
  </activation>

  <persona>
    role, name, identity, communication_style, principles
  </persona>

  <menu>
    Trigger codes → Workflows
    VD: CP → Create PRD, VP → Validate PRD
  </menu>

  <menu-handlers>
    exec     → Load .md workflow file directly
    workflow → Load workflow.xml engine + .yaml config
    data     → Load data file as {data} variable
    action   → Execute inline or find <prompt> by ID
  </menu-handlers>
</agent>
```

## Menu Handler Types

| Type | Cách hoạt động |
|------|----------------|
| `exec` | Đọc file .md workflow trực tiếp và thực thi |
| `workflow` | Load `workflow.xml` (core engine), sau đó xử lý .yaml config |
| `data` | Load file dữ liệu, gán vào biến `{data}` |
| `action` | Thực thi inline instructions hoặc tìm `<prompt>` theo ID |

## Manifest System

Hệ thống manifest (CSV) đóng vai trò **registry** cho tất cả components:

| Manifest | Mô tả | Số entries |
|----------|-------|-----------|
| `workflow-manifest.csv` | Tất cả workflows, phase, agent, command | 27+ |
| `agent-manifest.csv` | Tất cả agents, persona, module | 10 |
| `task-manifest.csv` | Core tasks (help, review, shard...) | 6 |
| `files-manifest.csv` | Tất cả files + SHA-256 hashes | 207 |
| `bmad-help.csv` | Help routing: output locations, completed artifacts | 27+ |
