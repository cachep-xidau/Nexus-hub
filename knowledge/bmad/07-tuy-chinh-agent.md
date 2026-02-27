# Tùy Chỉnh Agent (Customization)

[← Danh Sách Workflows](./06-danh-sach-workflows.md) | [Tiếp: Quy Tắc & Tính Năng →](./08-quy-tac-va-tinh-nang-dac-biet.md)

---

## File customization

BMAD cho phép tùy chỉnh agent mà không mất update khi nâng cấp:

```
_bmad/_config/agents/
├── core-bmad-master.customize.yaml
├── bmm-analyst.customize.yaml
├── bmm-architect.customize.yaml
├── bmm-dev.customize.yaml
├── bmm-pm.customize.yaml
├── bmm-qa.customize.yaml
├── bmm-quick-flow-solo-dev.customize.yaml
├── bmm-sm.customize.yaml
├── bmm-tech-writer.customize.yaml
└── bmm-ux-designer.customize.yaml
```

## Các thuộc tính có thể tùy chỉnh

### Tên agent

```yaml
agent:
  metadata:
    name: 'Linh'           # Thay vì "Amelia" mặc định
```

### Persona (thay thế toàn bộ persona mặc định)

```yaml
persona:
  role: 'Senior Full-Stack Engineer'
  identity: 'Chuyên gia React/Next.js với 10 năm kinh nghiệm'
  communication_style: 'Thẳng thắn, dùng nhiều ví dụ code'
  principles:
    - 'Clean code trên hết'
    - 'Test coverage >= 80%'
```

### Memories (context lâu dài)

```yaml
memories:
  - 'Dự án Antigravity dùng Next.js 15 + Prisma + PostgreSQL'
  - 'Coding conventions: ESLint + Prettier'
  - 'Commit theo Conventional Commits'
```

### Custom menu items

```yaml
menu:
  - trigger: deploy
    action: '#deploy-prompt'
    description: Deploy lên Vercel
  - trigger: my-workflow
    workflow: '{project-root}/my-custom/workflows/my-workflow.yaml'
    description: My custom workflow
```

### Critical actions (chạy khi agent khởi động)

```yaml
critical_actions:
  - 'Kiểm tra CI trước khi bắt đầu dev'
  - 'Alert user nếu có PR đang pending review'
```

### Custom prompts

```yaml
prompts:
  - id: deploy-prompt
    content: |
      Deploy current branch:
      1. Run tests
      2. Build project
      3. Execute deployment
```

## Áp dụng thay đổi

**Sau khi chỉnh sửa, PHẢI rebuild:**

```bash
npx bmad-method install
```

Chọn:
- **Quick Update** -- Cập nhật packages + rebuild agents
- **Rebuild Agents** -- Chỉ rebuild agents, không pull updates

## Ví dụ: Tùy chỉnh PM cho dự án Việt Nam

```yaml
# File: _bmad/_config/agents/bmm-pm.customize.yaml

agent:
  metadata:
    name: 'Minh'

persona:
  role: 'Product Manager chuyên SaaS B2B tại Việt Nam'
  identity: 'Hiểu sâu thị trường APAC, đặc biệt SEA'
  communication_style: 'Trực tiếp, dùng data, mix Việt-Anh'
  principles:
    - 'Ưu tiên mobile-first cho thị trường VN'
    - 'Xem xét payment gateway local (VNPay, MoMo, ZaloPay)'
    - 'Compliance PDPA/cybersecurity law VN'

memories:
  - 'Dự án Antigravity targeting Vietnamese SMEs'
  - 'Competitors: Base.vn, Lark, 1Office'
  - 'Budget constraint: bootstrap, optimize cost'
```

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Thay đổi không hiển thị | Chạy `npx bmad-method install` → Rebuild |
| Agent không load | Kiểm tra YAML syntax (indentation) |
| Cần reset về mặc định | Xóa nội dung file `.customize.yaml` → Rebuild |
