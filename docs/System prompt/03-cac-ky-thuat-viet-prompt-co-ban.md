# Các Kỹ Thuật Viết Prompt Cơ Bản (Beginner)

### 3.1. Rõ Ràng và Trực Tiếp (Being Clear & Direct)

Càng viết rườm rà, Claude càng dễ "lảng vảng" (thêm các câu rào trước đón sau như "Here is your answer..."). Mẹo là hãy yêu cầu trực tiếp!

**Ví dụ - Yêu cầu bỏ preamble (các câu mào đầu):**

- ❌ *Sai:* "Write a haiku about robots." (Claude có thể thêm "Here is a haiku you requested:...")
- ✅ *Đúng:* "Write a haiku about robots. Skip the preamble; go straight into the poem."

**Ví dụ - Ép ra quyết định:**

- ❌ *Sai:* "Who is the best basketball player of all time?" (Claude sẽ liệt kê Jordan, LeBron, Kobe... và không đưa ra lựa chọn).
- ✅ *Đúng:* "Who is the best basketball player of all time? Yes, there are differing opinions, but if you absolutely had to pick one player, who would it be?"

### 3.2. Gán Vai Trò (Role Prompting)

Yêu cầu Claude đảm nhận một vai trò (persona) cụ thể. Điều này không chỉ thay đổi giọng văn mà còn **cải thiện đáng kể độ chính xác** đối với các nhiệm vụ toán học và logic phức tạp.

**Ví dụ - Cải thiện logic:**
Khi được hỏi câu đố: *"Jack is looking at Anne. Anne is looking at George. Jack is married, George is not. Is a married person looking at an unmarried person?"*

- Nếu hỏi bình thường, Claude có thể suy luận sai là "Không đủ thông tin" do không biết tình trạng hôn nhân của Anne.
- Nhưng, nếu ta gán vai trò:

```python
SYSTEM_PROMPT = "You are a logic bot designed to answer complex logic problems."
```

*Kết quả:* Claude sẽ tập trung phân tích 2 trường hợp (Anne married hoặc Anne unmarried) và tìm ra kết quả chính xác tuyệt đối là "Yes".

> 💡 **Tip:** Đừng chỉ dừng lại ở vai trò. Hãy mô tả cả *đối tượng mà Claude đang nói chuyện*. "You are a cat" sẽ cho ra kết quả khác biệt so với "You are a cat talking to a crowd of skateboarders".
