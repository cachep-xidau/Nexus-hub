# Phụ Lục Chuyên Sâu

### 7.1. Chaining Prompts (Nối Chuỗi Prompt)

Claude làm việc tốt hơn khi được kiểm tra lại. Thay vì gom một siêu prompt khổng lồ, hãy chia nhỏ:

- **Chuỗi 1 (Extract):** "Trích xuất tất cả các tên công ty trong bài báo này vào thẻ `<companies>`."
- **Chuỗi 2 (Process):** Copy kết quả chuỗi 1 và hỏi: "Xếp các tên công ty sau theo thứ tự bảng chữ cái."
- **Chuỗi 3 (Self-Correction):** "Kiểm tra lại xem danh sách này đã đúng chưa, nếu có tên nào không phải là công ty thực sự, hãy loại bỏ." (Writing is rewriting).

### 7.2. Tích hợp Công Cụ (Tool Use / Function Calling)

Tool Use thực chất là sự kết hợp giữa **Prompt Chaining** và **Thay vì viết văn bản, Claude viết thông số hàm (arguments)**.

1. Bạn đưa mô tả về hàm (ví dụ: `calculator(a, b)`) vào System Prompt dưới dạng Schema định sẵn (XML hoặc JSON).
2. Khi Claude thấy hỏi môn Toán, thay vì tính bừa, nó sẽ emit ra:
   `<invoke name="calculator"><parameter name="a">10</parameter></invoke>`
3. Hệ thống của bạn bắt lấy chữ `<invoke>`, chặn Claude chạy tiếp, mang số `10` đi chạy hàm nội bộ của bạn.
4. Bạn ném kết quả `100` trở lại cuộc hội thoại cho Claude. Claude lấy đó làm cơ sở viết câu trả lời cuối cùng cho User.
