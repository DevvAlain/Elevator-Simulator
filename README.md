# Elevator Simulator — 10 floors × 3 elevators (LOOK/SCAN)

![stack](https://img.shields.io/badge/Node-Express%20%2B%20Socket.IO-green) ![frontend](https://img.shields.io/badge/React-Vite%20%2B%20Socket.IO-blue) ![lang](https://img.shields.io/badge/TypeScript-strict-blue)

Mô phỏng thang máy 10 tầng, 3 thang song song, dispatch tối ưu thời gian chờ, đúng thuật toán **LOOK** (chỉ dừng cùng hướng).

## Kiến trúc & OOP

```
MovableUnit (abstract: currentPosition, move(), stop())
  └─ Elevator (encapsulation: private _pending/_queue/_doorHeld, expose getState/requestFloor/moveOneStep)
       └─ ExpressElevator (inheritance demo: skip floors)

Call (abstract: floor, timestamp, kind)
  ├─ HallCall (floor + direction UP/DOWN)
  └─ CarCall (floor + elevatorId)

Floor (number, hasUp/hasDown, canCall)
Building (numFloors, floors[], elevators[], validateHall)

IDispatchStrategy (interface: select(floor,dir,elevators) -> Elevator) — polymorphism/Strategy
  ├─ NearestElevatorStrategy
  └─ LookAlgorithmStrategy — inject vào ElevatorController (DI)
ElevatorController (Building + strategy, tick, onUpdate hook → Socket.IO)
```

**Encapsulation**: `Elevator._pending`, `_queue`, `_direction`, `_doorTimer` là `private`; chỉ `getState()`, `requestFloor()`, `requestHall()`, `holdDoor()`, `closeDoor()`, `step()` là public.

**Inheritance**: `MovableUnit` → `Elevator` → `ExpressElevator`; `Call` → `HallCall`/`CarCall`.

**Polymorphism**: `ElevatorController` nhận `IDispatchStrategy` qua constructor, gọi `select()` qua interface — đổi `Nearest` ↔ `Look` không sửa controller.

## Thuật toán LOOK (quan trọng nhất)

File: [`backend/src/models/Elevator.ts`](backend/src/models/Elevator.ts) — `rebuildQueue()` + `shouldStopAt()` + `isServable()`

- `rebuildQueue()` chia `pending` thành segment cùng hướng sweep hiện tại: chỉ `CarCall` hoặc `HallCall` cùng hướng được xếp trước (vd hướng UP: `floor>=cur && (hallDir==UP || car)` sort tăng dần). Hall trái hướng bị đẩy ra sau, phục vụ ở lượt quay đầu.
- `shouldStopAt(floor)` chỉ trả `true` khi `queue[0]==floor` và có pending servable tại tầng đó (car luôn dừng, hall phải `isServable` — trùng `direction`).
- Ví dụ đề: thang UP 1→10, khách F5 `▲` → queue `[5,10]` (dừng), `▼` → queue `[10,5]` (skip F5 lượt đi, đón lượt về).

**Dispatch** — [`dispatchStrategies.ts`](backend/src/services/dispatchStrategies.ts): `LookAlgorithmStrategy` cho điểm `distance + queueLength*5`, thang bận cùng hướng và sẽ đi qua (`queue>0 && inferredDir==dir && willPass`) `-45` (ưu tiên nhất, kể cả khi `DOOR_OPEN` nhờ `inferredDir` từ `queue[0]`), thang rảnh rỗi `IDLE` `-20`, ngược hướng `+20`.

## Sơ đồ luồng

```
[Floor ▲/▼] --POST /api/hall-call--> ElevatorController.dispatchHall --select--> Elevator.requestHall
[Car panel 1..10] --POST /api/car-call--> Elevator.requestFloor
[Hold/Close] --POST /api/door/*--> Elevator.holdDoor/closeDoor
ElevatorController.tick(1200ms) -> for each MOVING elevator: step() -> move 1 floor / open door
                               -> onUpdate -> io.emit('state', getState())
Frontend: socket.on('state') + fetch /api/state ban đầu -> Building/Floor/ElevatorCar/ElevatorPanel render
```

## API

| Method | Path | Body | Mô tả |
|---|---|---|---|
| GET | /api/state | — | Toàn bộ trạng thái 3 thang |
| POST | /api/hall-call | {floor:1..10, direction: UP/DOWN} | Gọi thang ngoài hành lang (F1 chỉ UP, F10 chỉ DOWN) |
| POST | /api/car-call | {elevatorId, floor} | Chọn tầng đích trong cabin |
| POST | /api/door/hold | {elevatorId} | Giữ cửa mở |
| POST | /api/door/close | {elevatorId} | Đóng cửa ngay |

Socket.IO event `state: ElevatorStatus[]` push mỗi tick + mỗi 800ms.

## Chạy

```bash
# terminal 1 — backend :4000
cd backend && npm install && npm run dev

# terminal 2 — frontend :5173 (proxy /api + /socket.io về :4000)
cd frontend && npm install && npm run dev
```

Mở http://localhost:5173

## Test

```bash
cd backend && npm test   # chạy test/run.ts — kiểm tra LOOK (UP hall dừng, DOWN hall defer), Floor validate, dispatch
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

## Frontend components

`Building` → `Floor` (▲/▼) + `ElevatorCar` (ô thang) + `ElevatorPanel` (10 nút + Hold/Close khi cửa OPEN). Hooks `useState/useEffect` + `socket.io-client`.

## Mở rộng (gợi ý present 45')

- Đổi strategy runtime (`setStrategy`), thêm `CapacityAwareStrategy`
- `ExpressElevator` đã có sẵn, demo skip floors
- Persist state Redis/DB, thêm weight/capacity, priority queue, metrics wait-time
- Animation CSS transition khi `currentFloor` thay đổi
