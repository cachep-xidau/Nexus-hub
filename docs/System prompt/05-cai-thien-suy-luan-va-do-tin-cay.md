# Cải Thiện Suy Luận và Độ Cậy (Advanced)

### 5.1. Tư Duy Từng Bước (Precognition / Chain of Thought)

Tương tự như con người, nếu bạn buộc Claude viết nháp quá trình suy nghĩ trước khi chốt đáp án, tỷ lệ chính xác tăng vọt ở các câu phức tạp. Đây gọi là Chain of Thought (CoT).

**Ví dụ minh chứng:**

```text
Name a famous movie starring an actor born in 1956.
First brainstorm about some actors and their birth years in <brainstorm> tags.
Then give your final answer.
```

*Kết quả:* Claude sẽ viết ra: Tom Hanks (1956), Bryan Cranston (1956)... sau đó mới trả lời. Việc này loại bỏ hoàn toàn các lỗi "chọn bừa" do vội vã.

### 5.2. Chống Ảo Giác (Avoiding Hallucinations)

Claude có thể cố gắng quá mức để giúp đỡ bạn, dẫn đến việc bịa đặt thông tin (Hallucination) nếu nó không biết.

**Kỹ thuật 1: Cho Claude "lối thoát" (Give Claude an out)**

```text
Who is the heaviest hippo of all time? Only answer if you know the answer with certainty.
If you don't know, just say "I don't know."
```

**Kỹ thuật 2: Trích dẫn chứng cứ trước khi kết luận (Quote & Grounding)**
Thay vì hỏi trực tiếp từ một tài liệu dài, hãy bắt Claude trích dẫn câu văn trả lời ra trước:

```text
Read this long article.
Find the exact sentences that answer the question: "What was the revenue in Q3 2023?".
Quote them inside <quotes> tags, then provide your final answer.
```

### 5.3. Sử Dụng Ví Dụ (Few-Shot Prompting)

Việc cung cấp 1 đến 3 ví dụ về đầu ra mong muốn là cách hữu hiệu nhất thế giới AI để đảm bảo format và sắc thái. Claude là bậc thầy về suy diễn logic mẫu (extrapolate).

**Ví dụ Few-shot phân loại:**

```text
Classify the intent of the following emails:
Example 1:
Email: "My item is broken."
Category: [B] Defective Item

Example 2:
Email: "Where is my order?"
Category: [C] Shipping

Now classify this email:
Email: "The screen has a crack."
Category:
```
