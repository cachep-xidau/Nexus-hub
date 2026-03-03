# Cấu Trúc Cơ Bản & API Message

### 2.1. Cấu trúc Message API của Anthropic

Khi giao tiếp qua API (hoặc các CLI dựa trên API), có 3 tham số bắt buộc:

1. `model`: Tên model (vd: `claude-3-haiku-20240307`).
2. `max_tokens`: Giới hạn cứng số token sinh ra.
3. `messages`: Mảng hội thoại. **Luôn phải bắt đầu bằng `user`** và **phải xen kẽ** giữa `user` và `assistant`.

### 2.2. System Prompt (Prompt Hệ Thống)

System prompt là nơi cung cấp bối cảnh (context), hướng dẫn (instructions) và quy định (guidelines) chung *trước khi* cuộc hội thoại bắt đầu. Nó đặc biệt hiệu quả trong việc giúp Claude tuân thủ luật lệ.

**Ví dụ:**

```python
# System prompt được tách biệt khỏi messages
SYSTEM_PROMPT = "Your answer should always be a series of critical thinking questions. Do not actually answer the user question."

# Message gửi đi
PROMPT = "Why is the sky blue?"
```

*Kết quả:* Claude sẽ không trả lời tại sao bầu trời màu xanh, mà sẽ hỏi ngược lại bạn các câu hỏi phản biện như "What defines the color blue?", "How does light interact with the atmosphere?".
