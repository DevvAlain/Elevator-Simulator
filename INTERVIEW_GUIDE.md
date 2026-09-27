# INTERVIEW GUIDE — Elevator Simulator (Bản siêu chi tiết, dễ hiểu nhất)

> Đọc xong là hiểu hết: project làm gì, từng file/hàm để làm gì, được gọi lúc nào, tại sao lại viết như vậy.
> Dùng để present 45 phút và trả lời round 2.

---

## Mục lục

1. [Project làm gì?](#1-project-làm-gì)
2. [Bản đồ file — file nào làm gì](#2-bản-đồ-file)
3. [Giải thích từng file, từng hàm (chi tiết nhất)](#3-giải-thích-từng-file-từng-hàm)
4. [Luồng chạy tổng — từ lúc bấm nút tới lúc thang tới](#4-luồng-chạy-tổng)
5. [Thuật toán LOOK — giải thích như kể chuyện](#5-thuật-toán-look)
6. [Tại sao làm vậy, tại sao KHÔNG làm cách khác](#6-tại-sao)
7. [Cách present 45 phút](#7-present)
8. [Round 2 — câu hỏi có thể gặp + gợi ý trả lời](#8-round-2)
9. [Checklist trước khi đi](#9-checklist)

---

## 1. Project làm gì?

Tòa nhà 10 tầng, 3 thang máy chạy cùng lúc.

- **Ngoài hành lang (Hall):** Mỗi tầng có nút ▲ (muốn đi lên) và ▼ (muốn đi xuống). Tầng 1 chỉ có ▲, tầng 10 chỉ có ▼. Bấm nút này gọi là **Hall Call**.
- **Trong cabin (Car):** Khi thang tới, cửa mở, bạn vào trong bấm số tầng muốn tới (1..10). Gọi là **Car Call**.
- **Luật quan trọng nhất — LOOK:** Thang đang đi lên thì chỉ đón người cũng muốn đi lên. Người muốn đi xuống phải đợi thang lên hết rồi quay đầu mới đón. Ngược lại cho chiều xuống. Đây là thuật toán thang máy thật, giám khảo sẽ hỏi kỹ nhất chỗ này.
- **Cửa:** Có nút giữ cửa mở (Hold), nút đóng ngay (Close), và tự đóng sau 3.5 giây nếu không bấm gì.

**Công nghệ:**
- Backend: Node.js + Express + Socket.IO + TypeScript
- Frontend: React + Vite + TypeScript + Socket.IO client
- Không cần database — lưu trong memory là đủ (đề nói vậy).

---

## 2. Bản đồ file — file nào làm gì

```
interview/
├── backend/
│   ├── package.json                      # Khai báo thư viện, lệnh chạy
│   ├── tsconfig.json                     # Cấu hình TypeScript
│   └── src/
│       ├── index.ts                      # Khởi động server, gắn tick + socket
│       ├── models/
│       │   ├── types.ts                  # Định nghĩa kiểu: Direction, DoorState, ElevatorState, ElevatorStatus
│       │   ├── MovableUnit.ts            # Class cha trừu tượng — thang kế thừa từ đây
│       │   ├── Request.ts                # Call → HallCall / CarCall (kế thừa thứ 2)
│       │   ├── Floor.ts                  # 1 tầng: có nút lên? có nút xuống?
│       │   ├── Building.ts               # Tòa nhà: 10 tầng + 3 thang + kiểm tra hợp lệ
│       │   └── Elevator.ts               # TRÁI TIM — state machine + LOOK (quan trọng nhất)
│       ├── services/
│       │   ├── dispatchStrategies.ts     # Chọn thang nào đi đón (2 cách)
│       │   └── ElevatorController.ts     # Điều phối: nhận yêu cầu → chọn thang → tick cho thang chạy
│       └── routes/
│           └── api.ts                    # 5 API: hall-call, car-call, hold, close, state
│       └── test/
│           ├── run.ts                    # Test cơ bản
│           └── audit.ts                  # Test 33 case chi tiết (đã pass hết)
│
├── frontend/
│   ├── package.json / vite.config.ts / tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx                      # App chính: kết nối socket, 4 hàm gọi API
│       └── components/
│           ├── Building.tsx              # Lưới 10 tầng × 3 thang
│           ├── Floor.tsx                 # 1 hàng tầng + nút ▲/▼
│           ├── ElevatorCar.tsx           # Ô thang (màu vàng/xanh)
│           └── ElevatorPanel.tsx         # Panel 10 nút + Hold/Close trong cabin
│
├── README.md                             # Hướng dẫn chạy + kiến trúc ngắn gọn
└── INTERVIEW_GUIDE.md                    # File này
```

---

## 3. Giải thích từng file, từng hàm — chi tiết nhất

### 3.1 `backend/src/models/types.ts` — Từ điển kiểu

**Làm gì:** Định nghĩa các kiểu dùng chung, không chứa logic.

| Dòng | Tên | Là gì | Ví dụ |
|---|---|---|---|
| `Direction` | `"UP" \| "DOWN" \| "IDLE"` | Hướng thang đang đi | Thang ở tầng 3 đi lên → `UP` |
| `DoorState` | `"OPENING" \| "OPEN" \| "CLOSING" \| "CLOSED"` | Trạng thái cửa | Vừa tới tầng → `OPENING` → `OPEN` |
| `ElevatorState` | `"IDLE" \| "MOVING_UP" \| "MOVING_DOWN" \| "DOOR_OPENING"...` | Trạng thái thang | Đứng yên → `IDLE`, đang chạy lên → `MOVING_UP` |
| `ElevatorStatus` | `{id, currentFloor, direction, state, doorState, queue, doorHeld}` | Ảnh chụp 1 thang gửi cho frontend | `E1 đang ở tầng 5, đi lên, queue [7,10]` |

**Ai xài:** Mọi file đều import từ đây. Frontend cũng dùng `ElevatorStatus` để biết vẽ gì.

---

### 3.2 `backend/src/models/MovableUnit.ts` — Class cha trừu tượng

```ts
export abstract class MovableUnit {
  protected _currentPosition: number;   // vị trí hiện tại (tầng mấy)
  protected _direction: Direction;      // hướng hiện tại
  constructor(initialPosition: number)  // tạo ở tầng nào
  get currentPosition()                 // cho phép đọc vị trí
  get direction()                       // cho phép đọc hướng
  abstract move(): void;                // BẮT BUỘC class con phải viết hàm di chuyển
  abstract stop(): void;                // BẮT BUỘC class con phải viết hàm dừng
}
```

**Làm gì:** Như bản thiết kế chung cho "mọi thứ di chuyển được". Sau này muốn thêm `Thang cuốn`, `Băng chuyền` chỉ cần `extends MovableUnit` và viết `move()`/`stop()` riêng.

**Tại sao `abstract`:** Để không ai tạo `new MovableUnit()` trực tiếp — nó chỉ là khuôn mẫu, phải tạo `Elevator` cụ thể.

**Ai kế thừa:** `Elevator` ở `Elevator.ts`.

**Khi present nói:** "Đây là Inheritance — tính kế thừa. MovableUnit là cha, Elevator là con. Cha định nghĩa `move/stop` trừu tượng, con viết chi tiết."

---

### 3.3 `backend/src/models/Request.ts` — Yêu cầu gọi thang

```ts
export abstract class Call {            // Cha chung
  constructor(floor, timestamp)         // tầng muốn tới + lúc nào gọi
  abstract kind: string;                // con phải nói mình là loại gì
}

export class HallCall extends Call {    // Gọi từ ngoài hành lang
  kind = "hall";
  constructor(floor, direction)         // tầng đang đứng + muốn đi UP hay DOWN
}

export class CarCall extends Call {     // Gọi từ trong cabin
  kind = "car";
  constructor(floor, elevatorId)        // muốn tới tầng mấy + đang ở thang nào
}
```

**Làm gì:** Phân biệt 2 loại yêu cầu. Cùng là "muốn tới tầng 5" nhưng khác ngữ nghĩa:
- `HallCall(5, "UP")` = "Tôi đứng ở tầng 5, tôi muốn ĐI LÊN" → thang phải check cùng hướng mới đón.
- `CarCall(5, 2)` = "Tôi đang trong thang số 2, tôi muốn tới tầng 5" → thang đó phải tới 5 bằng mọi giá.

**Ai xài:** Trong `Elevator.ts`, `Pending` chính là `HallCall`/`CarCall` thu gọn (`{floor, hallDir?}` — `hallDir` undefined nghĩa là CarCall).

**Khi present nói:** "Đây là Inheritance thứ 2 — Call là cha, HallCall/CarCall là con. Đề gợi ý 'có thể dùng inheritance ở đây luôn' nên làm theo để lấy điểm."

---

### 3.4 `backend/src/models/Floor.ts` — Một tầng

```ts
export class Floor {
  constructor(number, hasUp, hasDown)   // số tầng, có nút lên? có nút xuống?
  canCall(dir): boolean                 // tầng này có cho bấm hướng này không?
}
```

**Ví dụ:**
- `new Floor(1, true, false)` → tầng 1 có ▲, không có ▼ → `canCall("DOWN")` trả `false`.
- `new Floor(5, true, true)` → tầng 5 có cả hai.
- `new Floor(10, false, true)` → tầng 10 chỉ có ▼.

**Ai tạo:** `Building` tạo 10 Floor trong constructor.

**Ai gọi `canCall`:** `Building.validateHall()` gọi để kiểm tra Hall Call có hợp lệ không.

---

### 3.5 `backend/src/models/Building.ts` — Tòa nhà

```ts
export class Building {
  readonly floors: Floor[];             // 10 tầng
  constructor(numFloors, elevators)     // tạo 10 Floor: F1 chỉ UP, F10 chỉ DOWN
  getFloor(n): Floor | undefined        // lấy tầng số n
  validateHall(floor, dir): string | null // kiểm tra Hall Call hợp lệ? null = ok, string = lỗi
}
```

**Chi tiết từng hàm:**

- **`constructor(numFloors, elevators)`**
  - Làm gì: Chạy `Array.from({length: 10})` tạo 10 Floor. Tầng 1: `hasUp=true, hasDown=false`. Tầng 10: `hasUp=false, hasDown=true`. Còn lại cả hai true.
  - Khi nào gọi: `ElevatorController` tạo `new Building(10, elevators)` lúc khởi động server.
  - Tại sao: Gom 10 tầng vào 1 chỗ, không để controller tự tạo lẻ tẻ.

- **`getFloor(n)`**
  - Làm gì: Tìm Floor có `number == n`.
  - Khi nào gọi: `validateHall` gọi để lấy Floor cần kiểm tra.

- **`validateHall(floor, dir)`**
  - Làm gì: Kiểm tra 2 thứ:
    1. Tầng có tồn tại không? (`1..10` không?) → không thì trả `"floor must be 1..10"`.
    2. Tầng đó có cho bấm hướng này không? (`F1 DOWN` → `false`) → trả `"Floor 1 cannot call DOWN"`.
    3. Hợp lệ → trả `null` (nghĩa là không lỗi).
  - Khi nào gọi: `ElevatorController.dispatchHall()` gọi trước khi chọn thang. `routes/api.ts` cũng gián tiếp qua controller.
  - Ví dụ: `validateHall(1, "DOWN")` → `"Floor 1 cannot call DOWN"` → API trả 400. `validateHall(5, "UP")` → `null` → cho đi tiếp.

---

### 3.6 `backend/src/models/Elevator.ts` — TRÁI TIM (Quan trọng nhất, sẽ hỏi nhiều nhất)

Đây là file dài nhất, chứa toàn bộ trí thông minh của thang máy.

#### Cấu trúc chung

```ts
type Pending = { floor: number; hallDir?: "UP" | "DOWN" };
// hallDir undefined = CarCall (luôn phải tới), có giá trị = HallCall (phải cùng hướng mới tới)

export class Elevator extends MovableUnit {
  readonly id: number;                  // thang số mấy (1, 2, 3)
  private _state: ElevatorState;        // IDLE, MOVING_UP, DOOR_OPEN...
  private _doorState: DoorState;        // OPENING, OPEN, CLOSING, CLOSED
  private _pending: Pending[];          // danh sách thô — mọi yêu cầu chưa xong
  private _queue: number[];             // danh sách đã sắp xếp theo LOOK — thang sẽ đi theo thứ tự này
  private _doorHeld: boolean;           // có đang giữ cửa không?
  private _doorTimer: Timeout | null;   // hẹn giờ tự đóng cửa
  static DOOR_OPEN_MS = 3500;           // cửa mở 3.5 giây rồi tự đóng
  static DOOR_TRANSITION_MS = 600;      // cửa mở/đóng mất 0.6 giây
}
```

**`_pending` vs `_queue` — dễ nhầm, giải thích rõ:**
- `_pending`: Danh sách thô, chưa sắp xếp. Ví dụ: `[{floor:10}, {floor:5, hallDir:"DOWN"}]` — cứ có yêu cầu là đẩy vào.
- `_queue`: Danh sách đã sắp xếp theo LOOK. Ví dụ trên khi đang đi lên sẽ thành `[10, 5]` (10 trước, 5 để lượt về). Thang chỉ nhìn `_queue[0]` để biết đi đâu tiếp.

**Tại sao `private`:** Bên ngoài không được sờ trực tiếp `_pending`/`_queue`, chỉ được gọi `requestFloor()`, `requestHall()`, `getState()`. Đây là **Encapsulation** — đóng gói.

---

#### Từng hàm trong Elevator

**`constructor(id, startFloor)`**
- Làm gì: Gọi `super(startFloor)` (cha MovableUnit lưu vị trí), lưu `id`.
- Khi nào gọi: `ElevatorController` tạo `new Elevator(1, 1)`, `new Elevator(2, 1)`, `new Elevator(3, 1)` — 3 thang đều ở tầng 1 lúc đầu.

**`move(): void` — Quyết định đi lên, đi xuống, hay mở cửa**
```ts
move() {
  if (đang mở/đóng cửa) return;          // đang bận cửa thì không đi
  if (queue rỗng) → IDLE;               // không còn việc → nghỉ
  target = queue[0];                     // tầng cần tới tiếp theo
  if (target > vị trí) → MOVING_UP;     // cần lên
  else if (target < vị trí) → MOVING_DOWN; // cần xuống
  else openDoor();                       // đã ở đúng tầng → mở cửa luôn
}
```
- Khi nào gọi: Sau khi `rebuildQueue()` xong, hoặc sau khi cửa đóng xong (`beginClosing` gọi `move()`), hoặc khi có yêu cầu mới lúc đang IDLE (`addPending` gọi `move()`).
- Ví dụ: Thang ở tầng 3, queue `[7, 10]` → `target=7 > 3` → `MOVING_UP`.

**`stop()`**
- Làm gì: Đặt `state=IDLE, direction=IDLE`.
- Khi nào gọi: Ít dùng trực tiếp, chủ yếu `move()` tự đặt IDLE khi queue rỗng.

**`requestFloor(floor)` — Car Call (trong cabin)**
```ts
requestFloor(5) → addPending({floor: 5})  // hallDir không có = CarCall
```
- Khi nào gọi: `ElevatorController.carCall()` gọi khi frontend `POST /api/car-call {elevatorId:1, floor:5}`.
- Ví dụ: Bạn trong thang 1 bấm số 5 → `E1.requestFloor(5)`.

**`requestHall(floor, dir)` — Hall Call (ngoài hành lang)**
```ts
requestHall(5, "UP") → addPending({floor: 5, hallDir: "UP"})
```
- Khi nào gọi: `ElevatorController.dispatchHall()` gọi sau khi chọn được thang.
- Ví dụ: Bạn đứng tầng 5 bấm ▲ → `E2.requestHall(5, "UP")`.

**`addPending(p)` — Hàm nội bộ, thêm yêu cầu và xếp lại hàng đợi**
```ts
addPending(p) {
  if (chưa có yêu cầu giống hệt) push vào _pending;
  rebuildQueue();                        // xếp lại theo LOOK
  if (đang IDLE và cửa đóng) move();     // đang rảnh thì đi ngay
}
```
- Tại sao check trùng: Tránh queue có 2 lần tầng 5 khi 2 người cùng bấm.
- Khi nào gọi: `requestFloor` và `requestHall` đều gọi hàm này.

**`step()` — Gọi mỗi tick (1.2 giây), thang đi 1 tầng**
```ts
step() {
  if (MOVING_UP) currentPosition += 1;   // đi lên 1 tầng
  else if (MOVING_DOWN) currentPosition -= 1; // đi xuống 1 tầng
  else return;                            // đang mở cửa thì không đi

  if (shouldStopAt(vị trí mới)) {         // có nên dừng ở tầng này không? (LOOK)
    queue.shift();                        // bỏ tầng này khỏi hàng đợi
    pending = pending.filter(không phải tầng này hoặc không servable); // xóa yêu cầu đã xong
    rebuildQueue();                       // xếp lại
    openDoor();                           // mở cửa
  } else {
    if (queue[0] == vị trí mới) {         // tới tầng là đầu queue nhưng KHÔNG servable (ngược hướng)
      queue.shift(); rebuildQueue();      // bỏ qua, để lượt về
    }
    if (queue rỗng) → IDLE;
    else move();                          // đi tiếp
  }
}
```
- Khi nào gọi: `ElevatorController.startTick()` gọi mỗi 1200ms cho mỗi thang đang MOVING.
- Ví dụ 1: Thang UP từ 1, queue `[5, 10]`, đang ở 4 → `step()` → lên 5 → `shouldStopAt(5)` true (Hall UP servable) → mở cửa.
- Ví dụ 2: Thang UP, queue `[10, 5]` (5 là Hall DOWN), đang ở 4 → lên 5 → `shouldStopAt(5)` false (DOWN không servable khi UP) → không mở, queue `[10,5]` giữ nguyên, đi tiếp lên 10.
- Tại sao `pending.filter` chỉ xóa servable: Nếu tầng 5 có cả Hall UP và Hall DOWN, thang UP chỉ xóa UP, DOWN còn lại để lượt về đón.

**`rebuildQueue()` — Xếp hàng đợi theo LOOK (hàm khó nhất, giải thích kỹ ở mục 5)**

**`isServable(p)` — Yêu cầu này có đáng dừng không?**
```ts
isServable(p) {
  if (CarCall) return true;               // trong cabin → luôn dừng
  if (IDLE) return true;                  // đang rảnh → dừng
  if (UP và Hall UP) return true;         // cùng lên → dừng
  if (DOWN và Hall DOWN) return true;     // cùng xuống → dừng
  return false;                           // ngược hướng → không dừng
}
```
- Khi nào gọi: `shouldStopAt` và `rebuildQueue` gọi để quyết định.

**`shouldStopAt(floor)` — Có nên dừng ở tầng này không?**
```ts
shouldStopAt(floor) {
  if (queue[0] != floor) return false;    // không phải đầu hàng đợi → không dừng
  pendingsAt = pending.filter ở tầng này;
  if (có CarCall ở tầng này) return true;
  if (có Hall servable ở tầng này) return true;
  return false;                           // Hall ngược hướng → không dừng
}
```
- Khi nào gọi: `step()` gọi sau khi đi 1 tầng.

**`openDoor()` / `beginClosing()` / `holdDoor()` / `closeDoor()` — Cửa**
- `openDoor()`: Đặt `DOOR_OPENING`, sau 600ms thành `DOOR_OPEN`, hẹn 3500ms sau tự `beginClosing()` (nếu không hold).
- `beginClosing()`: Đặt `DOOR_CLOSING`, sau 600ms thành `CLOSED`, xếp lại queue, đi tiếp hoặc IDLE.
- `holdDoor()`: Đặt `doorHeld=true`, xóa hẹn giờ tự đóng. Nếu đang CLOSING thì revert thành OPENING.
- `closeDoor()`: Đặt `doorHeld=false`, nếu đang OPEN thì `beginClosing()` ngay.

**`getState()` / `isIdle()` / `distanceTo()`**
- `getState()`: Trả ảnh chụp `{id, currentFloor, direction, state, doorState, queue, doorHeld}` — frontend và API `GET /state` dùng.
- `isIdle()`: `state==IDLE && !doorHeld` — dispatch dùng để ưu tiên?
- `distanceTo(floor)`: `|currentFloor - floor|` — dispatch tính khoảng cách.

**`ExpressElevator extends Elevator`**
```ts
class ExpressElevator extends Elevator {
  skipFloors: Set<number>;
  requestFloor(floor) {
    if (skipFloors.has(floor)) return;    // bỏ qua tầng không dừng
    super.requestFloor(floor);
  }
}
```
- Làm gì: Thang tốc hành, ví dụ `new ExpressElevator(4, 1, [2,3,4])` → bấm 2,3,4 không có tác dụng.
- Tại sao: Điểm cộng inheritance, demo "con override cha". Đề nói "không bắt buộc nhưng là điểm cộng".

---

### 3.7 `backend/src/services/dispatchStrategies.ts` — Chọn thang nào đi đón

```ts
export interface IDispatchStrategy {      // Hợp đồng: mọi cách chọn phải có hàm select
  select(floor, dir, elevators): Elevator;
}

export class NearestElevatorStrategy {   // Cách 1: chọn thang gần nhất
  select(floor, dir, elevators) {
    sắp xếp theo distanceTo(floor) → lấy gần nhất
  }
}

export class LookAlgorithmStrategy {     // Cách 2: chọn thông minh theo LOOK
  select(floor, dir, elevators) {
    cho mỗi thang tính điểm:
      inferredDir = queue[0] > cur ? UP : queue[0] < cur ? DOWN : direction
                    // quan trọng: thang DOOR_OPEN vẫn có queue nên suy ra hướng từ queue, không nhìn direction IDLE
      điểm = khoảng cách
      nếu queue>0 && inferredDir==dir && sẽ đi qua (cur <= floor khi UP): điểm -= 45 // thang bận cùng hướng và tiện đường → ưu tiên nhất
      else nếu IDLE && queue rỗng: điểm -= 20                                         // thang rảnh → ưu tiên nhì
      else nếu inferredDir==dir && sẽ đi qua: điểm -= 45                             // cùng hướng rỗng queue nhưng vẫn tiện
      else nếu inferredDir != IDLE && inferredDir != dir: điểm += 20                 // ngược hướng → phạt
      else nếu không IDLE: điểm += 20
      điểm += queue.length * 5           // thang bận nhiều thì kém ưu tiên
    chọn thang điểm thấp nhất
  }
}
```

**Ví dụ tính điểm (code hiện tại):**
- Thang A: ở tầng 1, queue [10] (DOOR_OPEN, inferredDir UP), gọi tầng 5 UP.
  - Khoảng cách = |1-5|=4, queue>0 && UP==UP && 1<=5 → 4 -45 +5 = **-36**
- Thang B: ở tầng 1, IDLE rỗng.
  - Khoảng cách = |1-5|=4, IDLE rỗng → 4 -20 +0 = **-16** → A thắng (tiện đường thắng rảnh).
- Gọi tầng 5 DOWN khi A đang UP:
  - A: inferred UP != DOWN → 4 +20 +5 = **29** ; B: -16 → B thắng → đúng LOOK: E2 đi đón ▼.

**Ai gọi `select`:** `ElevatorController.dispatchHall()` gọi `this.strategy.select(...)`.

**Khi present nói:** "Đây là Polymorphism — đa hình. Controller chỉ biết `IDispatchStrategy`, không biết là Nearest hay Look. Đổi strategy không sửa controller — đúng Strategy Pattern."

---

### 3.8 `backend/src/services/ElevatorController.ts` — Bộ não điều phối

```ts
export class ElevatorController {
  readonly building: Building;           // tòa nhà 10 tầng + 3 thang
  get elevators() → building.elevators; // lối tắt
  private strategy: IDispatchStrategy;   // cách chọn thang hiện tại
  private tickTimer;                     // hẹn giờ tick
  private onUpdate;                      // hàm gọi khi có cập nhật (để đẩy socket)
}
```

**Từng hàm:**

- **`constructor(count=3, strategy=new LookAlgorithmStrategy(), numFloors=10)`**
  - Làm gì: Tạo 3 `new Elevator(1,1)`, `new Elevator(2,1)`, `new Elevator(3,1)` (đều ở tầng 1), tạo `new Building(10, elevators)`, lưu strategy.
  - Khi nào gọi: `index.ts` gọi `new ElevatorController(3)` lúc khởi động.
  - Tại sao 3 tham số có default: Dễ đổi thành 8 thang 20 tầng chỉ cần `new ElevatorController(8, strat, 20)`.

- **`setStrategy(s)`**
  - Làm gì: Đổi cách chọn thang lúc đang chạy.
  - Khi nào gọi: Có thể gọi từ API hoặc test. Hiện chưa expose API nhưng đã sẵn sàng.

- **`setUpdateHook(fn)`**
  - Làm gì: Lưu hàm `fn` để gọi mỗi khi tick xong.
  - Khi nào gọi: `index.ts` gọi `controller.setUpdateHook(() => io.emit("state", controller.getState()))` — mỗi tick xong là đẩy trạng thái cho frontend.

- **`dispatchHall(floor, dir): {assigned} | {error}`**
  - Làm gì:
    1. `building.validateHall(floor, dir)` → nếu lỗi trả `{error}`.
    2. `strategy.select(floor, dir, elevators)` → chọn thang.
    3. `thang.requestHall(floor, dir)` → giao việc cho thang.
    4. Trả `{assigned: thang.id}`.
  - Khi nào gọi: `routes/api.ts` gọi khi `POST /api/hall-call`.
  - Ví dụ: `dispatchHall(5, "UP")` → validate ok → Look chọn E2 → `E2.requestHall(5,"UP")` → trả `{assigned:2}`.

- **`carCall(elevatorId, floor): string | null`**
  - Làm gì: Kiểm tra `floor 1..10`, `elevatorId` tồn tại, rồi `elevator.requestFloor(floor)`. Lỗi trả string, ok trả null.
  - Khi nào gọi: `routes/api.ts` khi `POST /api/car-call`.

- **`holdDoor(id)` / `closeDoor(id)`**
  - Làm gì: Tìm elevator theo id, gọi `elevator.holdDoor()` / `closeDoor()`. Không tìm thấy trả lỗi.
  - Khi nào gọi: `POST /api/door/hold` hoặc `/close`.

- **`getState()`**
  - Làm gì: `elevators.map(e => e.getState())` → mảng 3 status.
  - Khi nào gọi: `GET /api/state` và `io.emit("state", getState())`.

- **`startTick(intervalMs=1500)`**
  - Làm gì: `setInterval` mỗi 1500ms (thực tế `index.ts` truyền 1200ms):
    ```ts
    for (mỗi thang) if (MOVING_UP/DOWN) thang.step();
    onUpdate(); // đẩy socket
    ```
  - Khi nào gọi: `index.ts` gọi `controller.startTick(1200)` lúc khởi động.
  - Tại sao chỉ step khi MOVING: Đang mở cửa thì không đi, đang IDLE thì không cần step.

---

### 3.9 `backend/src/routes/api.ts` — 5 API

```ts
function isIntInRange(v, min, max): number | null
// Kiểm tra v có phải số nguyên trong [min,max] không. "5"→5, "abc"→null, 5.5→null, 11→null.

export function createRouter(ctrl: ElevatorController) {
  const r = Router();
  // 5 routes:
}
```

**Từng route:**

| Route | Nhận gì | Làm gì | Trả gì |
|---|---|---|---|
| `GET /api/state` | không | `ctrl.getState()` | `[{id:1, currentFloor:3, ...}, ...]` 200 |
| `POST /api/hall-call` | `{floor:5, direction:"UP"}` | `isIntInRange(floor,1,10)` + check `UP/DOWN` → `ctrl.dispatchHall()` → nếu lỗi 400, ok 200 `{assignedElevator:2}` | 200 hoặc 400 `{error:...}` |
| `POST /api/car-call` | `{elevatorId:1, floor:7}` | `isIntInRange` cả hai → `ctrl.carCall()` → 400 nếu sai, 200 `{ok:true}` nếu ok | 200/400 |
| `POST /api/door/hold` | `{elevatorId:1}` | `isIntInRange(elevatorId)` → `ctrl.holdDoor()` | 200/400 |
| `POST /api/door/close` | `{elevatorId:1}` | tương tự | 200/400 |

**Tại sao `isIntInRange`:** Chặn `floor="abc"` (NaN), `5.5` (không nguyên), `0`, `11`, `undefined`. Không có hàm này thì `Number("abc")` ra NaN, so sánh sai.

**Ai gọi router:** `index.ts` gắn `app.use("/api", createRouter(controller))`.

---

### 3.10 `backend/src/index.ts` — Khởi động server

```ts
const controller = new ElevatorController(3);          // 3 thang, 10 tầng, Look strategy
const app = express();
app.use(cors({origin:"*"}));                           // cho phép mọi origin (local demo)
app.use(express.json({limit:"10kb"}));                 // đọc JSON, chặn body quá to
app.use("/api", createRouter(controller));             // gắn 5 API

const server = http.createServer(app);
const io = new Server(server, {cors:{origin:"*"}});
controller.setUpdateHook(() => io.emit("state", controller.getState())); // mỗi tick đẩy socket
controller.startTick(1200);                            // mỗi 1.2s đi 1 tầng
setInterval(() => io.emit("state", controller.getState()), 800); // đẩy thêm mỗi 0.8s cho cửa
io.on("connection", s => s.emit("state", controller.getState())); // mới kết nối gửi ngay
server.listen(4000);
```

**Luồng:**
1. Tạo controller (3 thang ở tầng 1).
2. Tạo Express + gắn API.
3. Tạo Socket.IO, gắn `onUpdate` để mỗi tick tự đẩy `state`.
4. Bắt đầu tick 1200ms.
5. Thêm interval 800ms đẩy state ngay cả khi không di chuyển (để frontend thấy cửa đang OPENING/CLOSING).
6. Khi có client mới kết nối, gửi state ngay.

---

### 3.11 `frontend/src/main.tsx` — App chính

```ts
export type ElevatorStatus = {...}       // giống backend

const socket = io();                     // kết nối tới backend (qua proxy)

export default function App() {
  const [elevators, setElevators] = useState([]); // 3 thang

  useEffect(() => {                      // chạy 1 lần khi mở trang
    socket.on("state", setElevators);    // nhận state từ socket → cập nhật màn hình
    fetch("/api/state").then(setElevators); // lấy snapshot ban đầu (phòng khi socket chậm)
    return () => socket.off("state");    // unmount thì gỡ listener
  }, []);

  const hall = (floor, dir) => fetch("/api/hall-call", {floor, direction:dir});
  const car  = (id, floor)  => fetch("/api/car-call", {elevatorId:id, floor});
  const hold = (id)         => fetch("/api/door/hold", {elevatorId:id});
  const close= (id)         => fetch("/api/door/close", {elevatorId:id});

  return <div>
    <h2>Elevator Simulator — 10 floors × 3 elevators (LOOK)</h2>
    <Building elevators onHall={hall} onCar={car} onHold={hold} onClose={close} />
  </div>
}
```

**4 hàm `hall/car/hold/close`:** Đơn giản là `fetch POST` tới API. Không cần xử lý lỗi phức tạp — bấm là gửi.

**Tại sao vừa socket vừa fetch:** Socket đẩy liên tục, nhưng khi mới mở trang socket chưa kịp gửi thì `fetch` lấy ngay để không trắng màn hình.

---

### 3.12 `frontend/src/components/Building.tsx` — Lưới 10 tầng × 3 thang

```ts
export default function Building({elevators, onHall, onCar, onHold, onClose}) {
  const floors = [10,9,8,7,6,5,4,3,2,1]; // từ trên xuống dưới

  return <div style="grid 80px + 3×140px">
    {/* Hàng tiêu đề: E1 F3 UP CLOSED → [5,7] */}
    {elevators.map(e => <div>E{e.id} F{e.currentFloor} {e.direction} {e.doorState} → {e.queue}</div>)}

    {/* 10 hàng, mỗi hàng: Floor | E1 | E2 | E3 */}
    {floors.map(f => <>
      <Floor floor={f} onHall={onHall} />           // cột 1: nút ▲/▼
      {elevators.map(e => {
        here = e.currentFloor === f;                 // thang có ở tầng này không?
        open = here && (OPEN || OPENING);            // có đang mở cửa không?
        return <div style="background: here? (open? xanh : vàng) : xám">
          <ElevatorCar e floor />                    // ô thang
          {open && <ElevatorPanel id onCar onHold onClose />} // panel chỉ hiện khi cửa mở
        </div>
      })}
    </>)}
  </div>
}
```

**Màu nền:** Vàng (`#ffe9a8`) = thang đang ở tầng này nhưng cửa đóng. Xanh (`#b6f7b6`) = cửa đang mở. Xám = không có thang.

**Panel chỉ hiện khi `open`:** Đúng yêu cầu "khi thang dừng và cửa mở, hiển thị panel 10 nút".

---

### 3.13 `frontend/src/components/Floor.tsx` — Một hàng tầng

```ts
export default function Floor({floor, onHall}) {
  return <div>
    <b>F{floor}</b>
    {floor < 10 && <button onClick={() => onHall(floor,"UP")}>▲</button>}
    {floor > 1  && <button onClick={() => onHall(floor,"DOWN")}>▼</button>}
  </div>
}
```

**Tại sao `floor<10` và `floor>1`:** Tầng 10 không có ▲, tầng 1 không có ▼ — đúng yêu cầu đề. Không cần if ở backend, frontend đã không cho bấm.

---

### 3.14 `frontend/src/components/ElevatorCar.tsx` — Ô thang

```ts
export default function ElevatorCar({e, floor}) {
  here = e.currentFloor === floor;
  open = here && (OPEN || OPENING);
  return <div style="background: here? (open? xanh : vàng) : xám">
    {here ? (open ? "🚪 OPEN" : "■") + " E" + e.id : null}
  </div>
}
```

**Làm gì:** Chỉ là ô vuông hiện thang đang ở đâu. Không có thang thì trống.

---

### 3.15 `frontend/src/components/ElevatorPanel.tsx` — Panel trong cabin

```ts
export default function ElevatorPanel({id, onCar, onHold, onClose}) {
  return <span>
    {[1..10].map(n => <button onClick={() => onCar(id, n)}>{n}</button>)}
    <button onClick={() => onHold(id)}>⧖ Hold</button>
    <button onClick={() => onClose(id)}>✕ Close</button>
  </span>
}
```

**Làm gì:** 10 nút số + 2 nút cửa. Bấm số 7 → `onCar(2, 7)` → `POST /api/car-call {elevatorId:2, floor:7}`.

---

## 4. Luồng chạy tổng — từ bấm nút tới thang tới

```
1. Bạn ở tầng 5 bấm ▲
   → Floor.tsx: onHall(5, "UP")
   → main.tsx: hall(5,"UP") → fetch POST /api/hall-call {floor:5, direction:"UP"}

2. Backend nhận
   → api.ts: isIntInRange(5,1,10) ok, direction UP ok
   → ElevatorController.dispatchHall(5,"UP")
     → Building.validateHall(5,"UP") → null (ok, tầng 5 có nút UP)
     → LookAlgorithmStrategy.select(5,"UP", [E1,E2,E3])
       → tính điểm 3 thang, chọn E1 (ví dụ)
     → E1.requestHall(5,"UP") → addPending({5,"UP"}) → rebuildQueue() → move()
       → queue ví dụ [5], direction UP, state MOVING_UP

3. Tick mỗi 1.2s
   → ElevatorController.startTick → E1.step()
     → currentPosition 1→2→3→4→5
     → tại 5: shouldStopAt(5) true (Hall UP servable khi UP) → queue.shift() → pending xóa → rebuildQueue → openDoor()
     → DOOR_OPENING → 600ms → DOOR_OPEN → hẹn 3500ms → DOOR_CLOSING → CLOSED → move() tiếp hoặc IDLE

4. Đẩy cho frontend
   → controller.onUpdate() → io.emit("state", [E1: tầng 5 OPEN, E2: tầng 1 IDLE, ...])
   → main.tsx: socket.on("state", setElevators) → Building re-render → ô E1 tầng 5 màu xanh + hiện ElevatorPanel

5. Bạn trong cabin bấm số 9
   → ElevatorPanel: onCar(1,9) → POST /api/car-call {elevatorId:1, floor:9}
   → E1.requestFloor(9) → queue [9] → sau khi cửa đóng, move() → đi 6→7→8→9 → mở cửa
```

---

## 5. Thuật toán LOOK — kể chuyện dễ hiểu

**Tưởng tượng bạn là thang máy, đang đi lên từ tầng 1 tới tầng 10:**

```
Tầng:  1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
       ──────── ĐANG ĐI LÊN ────────►
```

- Tầng 5 có người bấm **▲ (muốn lên)**: Cùng hướng với bạn → bạn **DỪNG** đón (tiện đường).
- Tầng 5 có người bấm **▼ (muốn xuống)**: Ngược hướng → bạn **KHÔNG DỪNG**, đi tiếp lên 10, quay đầu đi xuống mới đón ở lượt về.

**Đây là LOOK:** "Nhìn" xem tầng nào cùng hướng thì đón, ngược hướng để sau. Khác với SCAN (đi tới tận cùng dù không ai).

### Hàm `rebuildQueue()` làm gì?

Chia `_pending` thành 2 nhóm theo hướng hiện tại:

```ts
// Đang đi UP, ở tầng 3:
pending = [{10}, {5, DOWN}, {7, UP}, {2, UP}]
           Car    Hall DOWN  Hall UP   Hall UP

// servableUp = Car hoặc Hall UP hoặc ở đúng tầng hiện tại
// Nhóm UP (servable + floor>=3): [{7,UP}, {10}] → sort tăng dần → [7, 10]
// Nhóm còn lại: [{5,DOWN}, {2,UP}] → sort giảm dần → [5, 2]
// queue = [7, 10, 5, 2]
```

Khi đi UP: đón 7, rồi 10, quay đầu đón 5, rồi 2. Hall DOWN ở 5 bị để sau — đúng luật LOOK.

Khi ở IDLE: hướng = tới pending gần nhất. Ở tầng 5, pending 3 và 8 → 3 gần hơn → hướng DOWN.

---

## 6. Tại sao làm vậy

| Quyết định | Tại sao | Tại sao KHÔNG làm cách khác |
|---|---|---|
| `MovableUnit` abstract | Đề bắt buộc inheritance, chứa state chung | Interface không chứa state |
| `Call → HallCall/CarCall` | Đề gợi ý, phân biệt Car luôn dừng vs Hall phải cùng hướng | 1 class với optional field khó đọc, mất điểm |
| `Floor + Building` | Gom validate 1 chỗ, đổi 20 tầng chỉ sửa 1 dòng | Rải rác if ở controller khó bảo trì |
| `IDispatchStrategy` 2 cách | Đề bắt buộc polymorphism + DI, thêm cách mới không sửa controller | if/else trong controller vi phạm OCP |
| Chọn LOOK | Nhanh nhất, tiết kiệm nhất, thang thật dùng LOOK | FCFS chậm, SCAN lãng phí |
| Express + Socket.IO | Nhẹ, đúng đề, Socket.IO tự reconnect | NestJS quá to, WebSocket thuần phải tự lo reconnect |
| Tick 1.2s | Đủ chậm để nhìn thấy, đủ nhanh để không đợi | 100ms quá nhanh không thấy LOOK |
| Vite | Nhanh hơn CRA, 1 dòng proxy | CRA chậm, config nhiều |
| 4 components đúng tên đề | Giám khảo tick checklist | Gộp 1 file mất điểm |
| `express.json({limit:"10kb"})` + `isIntInRange` | Chặn payload lớn, NaN, 5.5, 999 | Không validate thì NaN lọt vào queue |
| Test 1 file assert | Đề "nếu có thời gian", 1 file đủ chứng minh | Jest nặng, không cần thiết |

**Không làm gì và tại sao:**

| Không làm | Tại sao |
|---|---|
| Database | Đề nói memory đủ — thêm DB là thừa |
| Đăng nhập | Đề nói không cần |
| Redux | `useState` đủ, 3 thang không cần Redux |
| Animation phức tạp | Đề nói không cần — màu nền đủ |

---

## 7. Cách present 45 phút

| Phút | Nói gì | Mở file gì |
|---|---|---|
| 0-5 | **Demo chạy:** `npm run dev` 2 bên, mở :5173, cho thang chạy 1→10, bấm tầng 5 ▲ (dừng) và ▼ (không dừng) để thấy LOOK. | Browser |
| 5-15 | **OOP:** Chỉ vào `MovableUnit→Elevator→ExpressElevator`, `Call→HallCall/CarCall`, `IDispatchStrategy` + DI. Đọc comment Inheritance/Encapsulation/Polymorphism. | `MovableUnit.ts`, `Elevator.ts`, `Request.ts`, `dispatchStrategies.ts` |
| 15-30 | **LOOK:** Đi qua `rebuildQueue → isServable → shouldStopAt`, vẽ tầng 1→10 + 5 hai hướng lên bảng, giải thích queue `[5,10]` vs `[10,5]`. | `Elevator.ts` dòng 144-203 |
| 30-40 | **Dispatch + Cửa + Real-time:** Cách tính điểm Look, state machine cửa, tick + socket. | `dispatchStrategies.ts`, `Elevator.ts` dòng 205-231, `index.ts` |
| 40-45 | **Mở rộng:** ExpressElevator đã có, thêm cân nặng/persist/animation làm sao, mỗi ý 1 phút. | `README.md` |

---

## 8. Round 2 — câu hỏi có thể gặp

### A. Hỏi sâu về LOOK

**Q: Tại sao LOOK mà không phải FCFS hay SCAN?**
> FCFS (ai gọi trước đón trước) công bằng nhưng chậm — thang chạy lòng vòng. SCAN đi tới tận cùng dù không ai cần — lãng phí. LOOK chỉ tới yêu cầu xa nhất — nhanh nhất, thang thật dùng LOOK.

**Q: Cùng tầng 5 mà 1 người ▲ 1 người ▼ thì sao?**
> Mỗi yêu cầu lưu riêng `{5,UP}` và `{5,DOWN}`. Thang UP chỉ xóa `{5,UP}` (`pending.filter` chỉ xóa servable), `{5,DOWN}` còn lại để lượt về. Code ở `step()` dòng 98-99.

**Q: Thang đang ở tầng 5, có người ở tầng 5 bấm ▲ thì sao?**
> Vẫn đón ngay — `servableUp` có `p.floor==cur` nên ở đúng tầng thì luôn servable, `move()` thấy `target==cur` thì `openDoor()` luôn, không di chuyển. Hàm `addPending` dòng 135-142.

**Q: 3 thang đều bận, gọi mới thì sao?**
> Vẫn chọn thang điểm thấp nhất (ít việc, gần). Không có hàng đợi trung tâm — gán ngay. Muốn xịn hơn thì thêm `PendingHallQueue`.

**Q: Chứng minh LOOK đúng?**
> Chạy `npm test` (`test/audit.ts` 33 case): Hall UP `[5,10]`, Hall DOWN `[10,5]`. Demo mắt: 1→10, bấm 5 ▼ không dừng.

### B. Hỏi về OOP / SOLID

**Q: Chỉ ra 3 tính chất OOP?**
> - **Đóng gói:** `Elevator` private `_pending/_queue/_doorHeld` — chỉ `getState/requestFloor/step` public. File `Elevator.ts` dòng 18-23.
> - **Kế thừa:** `MovableUnit→Elevator→ExpressElevator` (`MovableUnit.ts` + `Elevator.ts` 234-245) và `Call→HallCall/CarCall` (`Request.ts`).
> - **Đa hình:** `IDispatchStrategy` 2 impl + DI vào Controller (`dispatchStrategies.ts` + `ElevatorController.ts` dòng 28).

**Q: SOLID ở đâu?**
> - **S:** Mỗi class 1 việc (Elevator chạy/dừng/cửa, Building quản tầng, Strategy chọn thang).
> - **O:** Thêm strategy mới không sửa controller.
> - **L:** ExpressElevator thay Elevator được.
> - **I:** IDispatchStrategy 1 hàm `select`.
> - **D:** Controller phụ thuộc interface, không phụ thuộc concrete (`constructor(strategy: IDispatchStrategy)` dòng 14-18).

**Q: Tại sao kế thừa mà không composition?**
> Đề yêu cầu kế thừa và chấm điểm kỹ. Với `MovableUnit→Elevator` quan hệ "là một" nên kế thừa hợp lý.

**Q: Thêm thang chở hàng thì sao?**
> `class FreightElevator extends Elevator { maxLoad; requestFloor() check cân }` — không sửa code cũ.

### C. Hỏi mở rộng

**Q: 20 tầng 8 thang?**
> `new ElevatorController(8, strategy, 20)` — 1 dòng.

**Q: Tắt server mất yêu cầu?**
> Lưu `getState()` vào Redis/file mỗi tick, khởi động đọc lại. Hiện memory đủ theo đề.

**Q: Quá tải?**
> Thêm `currentLoad/maxLoad`, `requestFloor` check, `CapacityAwareStrategy`.

**Q: Animation mượt?**
> CSS `transition: transform 1.2s` cho `ElevatorCar`.

**Q: Đổi strategy lúc chạy?**
> `controller.setStrategy(new NearestStrategy())` đã có (dòng 27-29), có thể expose `POST /api/strategy`.

### D. Hỏi real-time / backend

**Q: Tại sao tick 1.2s?**
> Đủ chậm để thấy LOOK, đủ nhanh để không đợi. Đổi qua `startTick(ms)`.

**Q: Mất mạng?**
> Socket.IO tự reconnect + `fetch /api/state` lúc mount.

**Q: Xung đột giữa bấm nút và tick?**
> Node.js single-thread — không chạy song song, không cần lock.

### E. Hỏi bảo mật

**Q: Spam bấm nút?**
> Chưa có rate limit — thêm `express-rate-limit` 20 req/phút/IP. `isIntInRange` đã chặn payload bậy.

**Q: Gửi tầng "abc" hoặc thang 999?**
> 400 — `isIntInRange` và `elevator not found` (`api.ts` + `ElevatorController.ts` 45-64).

### F. Hỏi tư duy

**Q: Còn 1 giờ cắt gì?**
> Cắt ExpressElevator, NearestStrategy, test — giữ LOOK + Building + 4 components + README.

**Q: Làm lại khác gì?**
> Thêm hàng đợi trung tâm cho Hall khi 3 thang bận.

**Q: Học được gì?**
> LOOK là "có đáng dừng không theo hướng" không chỉ sắp xếp. Strategy giúp thêm tính năng không sửa code cũ. State machine cần tách timer cửa riêng.

---

## 9. Checklist trước khi đi

```bash
cd backend && npx tsc --noEmit && npx ts-node --transpile-only test/audit.ts
# expect: 33 passes, 0 fails, ALL CHECKS PASSED

cd frontend && npx tsc --noEmit
# expect: no error

# Chạy thử
cd backend && npm run dev   # :4000
cd frontend && npm run dev  # :5173
# Mở http://localhost:5173
# Thử 1: Cho thang 1→10, bấm tầng 5 ▲ → dừng. Bấm 5 ▼ → không dừng (đi tới 10 rồi quay).
# Thử 2: Bấm F1 ▼ → báo lỗi. Bấm F10 ▲ → báo lỗi.
# Thử 3: Khi cửa mở, bấm số trong panel + Hold/Close.
```

- [ ] Thuộc 3 hàm LOOK: `rebuildQueue → isServable → shouldStopAt` (`Elevator.ts` 144-203)
- [ ] Thuộc 3 ví dụ OOP, mở file là chỉ được
- [ ] Demo được 1 Hall UP + 1 Hall DOWN cùng lúc để thấy khác biệt
