# Overview

Tài liệu này là hệ thống kiến thức toàn diện được đúc kết từ **[Interactive Prompt Engineering Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)** của Anthropic.
Mục tiêu là lưu trữ có cấu trúc các nguyên tắc, kỹ thuật và ví dụ chứng minh để phục vụ việc **học tập, giảng dạy**, và đặc biệt là làm kim chỉ nam để viết system prompts cho hệ thống AI.

## Nguyên Tắc Cốt Lõi (Golden Rules)

- **Nguyên Tắc Rõ Ràng (The Golden Rule of Clear Prompting):** Đưa prompt của bạn cho một đồng nghiệp đọc. Nếu họ cảm thấy bối rối hoặc không hiểu rõ cần làm gì, Claude cũng sẽ như vậy. Trí tuệ của Claude phụ thuộc vào sự rõ ràng trong hướng dẫn của bạn.
- **Không có ngữ cảnh ngầm (No Implicit Context):** Claude không tồn tại trong thế giới của bạn, nó chỉ biết chính xác những gì bạn viết trong box prompt. Càng giải thích rõ tình huống, kết quả càng chính xác.
- **Đào tạo như nhân viên mới:** Hãy coi việc prompt Claude như đang giao việc cho một thực tập sinh xuất sắc nhưng chưa làm việc ở công ty bạn bao giờ. Bạn cần hướng dẫn rõ nhiệm vụ, quy trình, và khuôn mẫu đầu ra mong muốn.
- **Prompting là môn khoa học thực nghiệm:** Kết quả hiếm khi hoàn hảo ngay từ lần đầu. Hãy thử nghiệm (trial & error), mix & match các kỹ thuật để đạt kết quả tối ưu.
