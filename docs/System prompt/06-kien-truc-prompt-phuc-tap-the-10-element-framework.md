# Kiến Trúc Prompt Phức Tạp (The 10-Element Framework)

Để viết một system prompt cấp độ doanh nghiệp (Complex Prompt từ con số 0), Anthropic khuyến nghị trật tự 10 thành phần sau. Sắp xếp này được tối ưu để Claude không bị lạc trôi context về cuối.

| 🧩 | Thành Phần | Giải Thích |
|---|---|---|
| **1.** | `User` Role | API bắt buộc tin nhắn bắt đầu bằng lượt từ người dùng. |
| **2.** | **Task Context** | Gán bối cảnh/vai trò ngay đầu: *`"You are an expert lawyer."`* |
| **3.** | **Tone Context** | *`"Maintain a highly professional and analytical tone."`* |
| **4.** | **Task Rules** | Gạch đầu dòng rõ ràng những gì được làm và KHÔNG được làm. |
| **5.** | **Examples** | Bọc các ví dụ mẫu siêu chuẩn bằng `<example>` tags. |
| **6.** | **Input Data** | Truyền văn bản cần phân tích/xử lý (bọc bằng `<document>` tags). |
| **7.** | **Immediate Task** | Lệnh nhắc việc (nằm sát dưới cùng): *`"Now review the document and..."`* |
| **8.** | **Precognition** | Yêu cầu tư duy: *`"First brainstorm your analysis in <thinking> tags."`* |
| **9.** | **Output Format** | *`"Put your final output strictly within <report> tags."`* |
| **10.** | `Assistant` Prefill | Bồi sẵn từ đầu tiên cho Assistant: *`[Lawyer] <thinking>`* |

> 🔑 **Important Rule of Thumb:**
>
> - Luôn đưa Data/Văn bản lên *TRƯỚC* câu hỏi (Question / Immediate Task) nằm ở cuối hộp prompt.
> - Tại sao? Khả năng ghi nhớ thông tin ở vế kết (recency bias) của LLMs rất cao. Lệnh và câu hỏi nằm dưới cùng sẽ được ưu tiên theo sát nhất.
