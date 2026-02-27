# Quy Tắc Và Tính Năng Đặc Biệt

[← Tùy Chỉnh Agent](./07-tuy-chinh-agent.md) | [Tiếp: Ví Dụ Full BMad →](./09-vi-du-full-bmad-method.md)

---

## Quy tắc quan trọng khi sử dụng

1. **Luôn dùng chat mới** cho mỗi workflow -- tránh lỗi context
2. **Không bỏ qua bước** -- step-file architecture yêu cầu tuần tự
3. **Chờ input** -- khi agent hiện menu, phải chọn trước khi tiếp
4. **Dùng `/bmad-help`** khi không biết bước tiếp theo
5. **Artifacts là context** -- PRD → Architecture → Stories, mỗi document là input cho bước sau

## Party Mode

Đưa toàn bộ team AI vào 1 cuộc trò chuyện. BMad Master điều phối, chọn agent phù hợp cho mỗi tin nhắn. Agents phản hồi theo tính cách, đồng ý/phản đối và xây dựng ý tưởng lẫn nhau.

**Lệnh:** `/bmad-party-mode`

**Phù hợp cho:**
- Quyết định lớn có tradeoffs
- Brainstorming sessions
- Post-mortem khi có sự cố
- Sprint retrospective và planning

**Ví dụ:**
```
Bạn: "Monolith hay microservices cho MVP?"

Winston (Architect): "Bắt đầu monolith."
John (PM): "Đồng ý. Time to market quan trọng hơn."
Amelia (Dev): "Monolith với clear module boundaries."
```

## Advanced Elicitation

Buộc LLM xem xét lại output bằng phương pháp lý luận có cấu trúc.

**Các phương pháp:**
- First Principles
- Red Team vs Blue Team
- Pre-mortem Analysis
- Socratic Questioning
- ... và nhiều phương pháp khác

**Cách hoạt động:**
1. LLM gợi ý 5 phương pháp phù hợp cho nội dung
2. Bạn chọn 1 (hoặc shuffle để xem options khác)
3. Phương pháp được áp dụng, cải tiến hiển thị
4. Chấp nhận hoặc loại bỏ, lặp lại hoặc tiếp tục

**Khi nào dùng:**
- Sau workflow generate content, muốn alternatives
- Output có vẻ OK nhưng nghi ngờ có depth hơn
- Stress-test assumptions
- High-stakes content

## Brainstorming

60+ kỹ thuật ideation được tích hợp sẵn.

**Lệnh:** `/bmad-brainstorming`

**Kỹ thuật có sẵn:** SCAMPER, Mind Mapping, Six Thinking Hats, Reverse Brainstorming, Problem Reframing...

**Cách hoạt động:**
1. **Setup** -- Định nghĩa topic, goals, constraints
2. **Chọn approach** -- Tự chọn, AI recommend, random, hoặc progressive flow
3. **Facilitation** -- Probing questions, collaborative coaching
4. **Organize** -- Ideas nhóm theo themes, prioritized
5. **Action** -- Top ideas → next steps + success metrics

**Nguyên tắc:** AI đóng vai facilitator -- không tạo ý tưởng thay bạn, mà kích thích tư duy sáng tạo của bạn. Mọi ý tưởng đều đến từ bạn.

## Adversarial Review

Review phản biện tìm tối thiểu 10 issues trong bất kỳ nội dung nào.

**Lệnh:** `/bmad-review-adversarial-general`

- Được tích hợp tự động trong Code Review workflow
- Dùng riêng cho document review cũng rất hữu ích
- Nếu tìm được 0 issues → HALT, re-analyze (suspicious)

## Document Project (cho brownfield)

Scan codebase hiện có và tạo documentation tự động.

**Lệnh:** `/bmad-bmm-document-project`

Phù hợp khi:
- Onboard vào dự án mới
- Cần AI agents hiểu codebase trước khi implement
- Tạo documentation cho dự án thiếu docs
