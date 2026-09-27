# Prompt cho Claude Code — Elevator Simulator (Node.js + React.js)

Copy toàn bộ nội dung dưới đây và đưa cho Claude Code để bắt đầu:

---

## YÊU CẦU DỰ ÁN

Xây dựng một web app mô phỏng hệ thống thang máy (Elevator Simulator) hoàn chỉnh, gồm:
- **Backend**: Node.js (Express) + WebSocket (Socket.IO) để cập nhật trạng thái real-time
- **Frontend**: React.js (đơn giản, không cần đẹp, nhưng phải đúng chức năng)
- **Ngôn ngữ**: TypeScript cho cả backend và frontend (ưu tiên type-safety khi thiết kế OOP)

### Bối cảnh nghiệp vụ
- Tòa nhà có **10 tầng** (Floor 1 → Floor 10)
- Có **3 thang máy** hoạt động song song, độc lập
- Hệ thống phải điều phối (dispatch) thang máy tới các yêu cầu sao cho **tối thiểu thời gian chờ** và **tối ưu hiệu suất tổng thể**

### Luồng nghiệp vụ chi tiết (bắt buộc đúng)

1. **Gọi thang máy ngoài hành lang (Hall Call)**
   - Mỗi tầng có 2 nút: gọi lên (▲) và gọi xuống (▼) — riêng Floor 1 chỉ có ▲, Floor 10 chỉ có ▼
   - Khi bấm, hệ thống chọn 1 thang máy phù hợp nhất (đang rảnh hoặc đang đi cùng hướng và sắp qua tầng đó) để phục vụ
   - Khi thang máy đến, cửa mở, người dùng có thể chọn tầng đích bên trong (Car Call)

2. **Quy tắc dừng theo hướng di chuyển (QUAN TRỌNG NHẤT — LOOK/SCAN algorithm)**
   - Một thang máy đang di chuyển (MOVING_UP hoặc MOVING_DOWN) **chỉ dừng** ở một tầng nếu:
     - Có yêu cầu Car Call (bên trong) tại tầng đó, HOẶC
     - Có Hall Call tại tầng đó **cùng hướng** với hướng đang di chuyển của thang máy
   - Ví dụ: thang máy đang đi từ Floor 1 → Floor 10 (hướng lên). Khách ở Floor 5:
     - Bấm ▲ → thang **dừng** đón (cùng hướng lên)
     - Bấm ▼ → thang **không dừng**, phải đợi thang máy lên tới Floor 10, đổi hướng xuống, rồi mới ghé đón ở lượt kế tiếp
   - Đây chính là thuật toán **LOOK (hoặc SCAN)** dùng trong thang máy thực tế — hãy triển khai đúng thuật toán này, không chỉ giả lập hời hợt

3. **Điều khiển cửa**
   - Nút "giữ cửa mở" (Door Hold) — cửa giữ trạng thái mở, không tự đóng
   - Nút "đóng cửa ngay" (Door Close) — đóng cửa ngay lập tức, elevator có thể tiếp tục di chuyển
   - Cửa cũng cần tự động đóng sau một khoảng thời gian mặc định (vd 3-5 giây) nếu không có tương tác

4. **Trạng thái thang máy cần quản lý**
   - IDLE (đang rảnh)
   - MOVING_UP / MOVING_DOWN
   - DOOR_OPENING / DOOR_OPEN / DOOR_CLOSING / DOOR_CLOSED
   - currentFloor, targetQueue (danh sách tầng cần dừng), direction

## YÊU CẦU KỸ THUẬT BẮT BUỘC

### 1. Object-Oriented Programming (bắt buộc, sẽ bị chấm điểm kỹ)
Thiết kế class rõ ràng, thể hiện đủ 3 tính chất OOP — không làm hời hợt cho có:

- **Encapsulation**: 
  - Class `Elevator` giấu (private/protected) các thuộc tính nội bộ như `_currentFloor`, `_direction`, `_queue`; chỉ expose qua method/getter công khai (`getState()`, `requestFloor()`, `moveOneStep()`...)
  
- **Inheritance**:
  - Tạo abstract class/base class chung, ví dụ `MovableUnit` hoặc `Vehicle` (có `currentPosition`, `move()`, `stop()`), sau đó `Elevator` kế thừa từ đó
  - Có thể mở rộng thêm: `ExpressElevator` (bỏ qua một số tầng) kế thừa từ `Elevator` để minh họa rõ inheritance thực chất, không bắt buộc nhưng là điểm cộng

- **Polymorphism**:
  - Thiết kế **Strategy Pattern** cho thuật toán điều phối (dispatch strategy): interface `IDispatchStrategy` với ít nhất 2 implementation khác nhau, ví dụ:
    - `NearestElevatorStrategy` (chọn thang gần nhất)
    - `LookAlgorithmStrategy` (chọn theo thuật toán LOOK chuẩn, ưu tiên thang cùng hướng)
  - `ElevatorController` nhận vào 1 strategy (dependency injection) và gọi qua interface chung → đây chính là polymorphism, và cũng thể hiện tư duy kiến trúc tốt

### 2. Cấu trúc class đề xuất
```
- Building (quản lý danh sách Elevator + Floor)
- Elevator (kế thừa từ MovableUnit) — quản lý state machine của 1 thang máy
- Floor (thông tin tầng, hall call buttons)
- Request / Call (HallCall, CarCall — có thể dùng inheritance ở đây luôn)
- ElevatorController / Dispatcher (nhận request, chọn elevator qua IDispatchStrategy)
- IDispatchStrategy (interface) → NearestElevatorStrategy, LookAlgorithmStrategy
```

### 3. Backend (Node.js)
- Express server expose REST API để lấy trạng thái ban đầu
- Socket.IO (hoặc WebSocket thuần) để push real-time update trạng thái tất cả thang máy tới frontend (vị trí, hướng, trạng thái cửa) — mô phỏng chuyển động mượt (mỗi X ms elevator di chuyển 1 tầng)
- API endpoints cần có:
  - `POST /api/hall-call` — gọi thang máy từ hành lang (floor, direction)
  - `POST /api/car-call` — chọn tầng đích từ bên trong thang máy cụ thể
  - `POST /api/door/hold` và `POST /api/door/close`
  - `GET /api/state` — lấy trạng thái hiện tại toàn bộ hệ thống

### 4. Frontend (React.js)
- UI đơn giản nhưng đủ chức năng, gồm:
  - Sơ đồ 10 tầng x 3 thang máy (có thể dùng CSS grid đơn giản, không cần animation phức tạp)
  - Mỗi tầng có nút gọi ▲/▼
  - Khi thang máy dừng ở 1 tầng và cửa mở, hiển thị panel bên trong với 10 nút chọn tầng + nút giữ/đóng cửa
  - Hiển thị trạng thái từng thang máy: tầng hiện tại, hướng di chuyển, trạng thái cửa
- Dùng React hooks (useState, useEffect) kết nối Socket.IO client để nhận update real-time
- Không cần UI đẹp, nhưng code React nên tổ chức component rõ ràng (Building, Floor, ElevatorCar, ElevatorPanel...)

### 5. Testing (nếu có thời gian)
- Viết ít nhất vài unit test cho phần logic quan trọng nhất: thuật toán LOOK (dừng đúng/sai theo hướng), state machine chuyển trạng thái của Elevator

## DELIVERABLES MONG MUỐN TỪ CLAUDE CODE

1. Thiết kế kiến trúc trước (liệt kê class, method chính, sơ đồ luồng dữ liệu) — trình bày ngắn gọn trước khi code
2. Tạo project structure rõ ràng: `/backend` (Node.js + TypeScript) và `/frontend` (React + TypeScript), có README hướng dẫn chạy (`npm install`, `npm run dev`)
3. Code đầy đủ, chạy được ngay (`npm run dev` ở cả 2 thư mục), không lỗi
4. Đảm bảo đúng 100% rule "chỉ dừng cùng hướng" — đây là phần quan trọng nhất, hãy viết rõ comment giải thích logic tại đoạn code xử lý thuật toán LOOK
5. Đảm bảo thể hiện rõ 3 tính chất OOP (encapsulation, inheritance, polymorphism) — có thể thêm comment ngắn chỉ rõ chỗ nào minh họa tính chất nào, để dễ giải thích khi present
6. File README.md tóm tắt: kiến trúc hệ thống, thuật toán điều phối đã chọn, cách chạy project, và gợi ý các điểm có thể mở rộng thêm (để chuẩn bị cho phần present 45 phút)

## LƯU Ý QUAN TRỌNG
- Ưu tiên code sạch, dễ đọc, có comment giải thích ở những đoạn logic phức tạp (đặc biệt là thuật toán dispatch và rule dừng theo hướng)
- Không cần thêm tính năng ngoài đề (không cần login, không cần database phức tạp — có thể lưu state trong memory là đủ)
- Hãy hỏi lại tôi nếu có phần nào chưa rõ trước khi bắt đầu code, đặc biệt là lựa chọn thư viện cụ thể (Socket.IO vs WebSocket thuần, có dùng Vite cho React không, v.v.)

---
