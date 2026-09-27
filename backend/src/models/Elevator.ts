import { MovableUnit } from "./MovableUnit";
import { Direction, DoorState, ElevatorState, ElevatorStatus } from "./types";

type Pending = { floor: number; hallDir?: "UP" | "DOWN" }; // hallDir undefined = CarCall (always served)

/**
 * Elevator — state machine + LOOK (SCAN) algorithm.
 *
 * LOOK rule (quan trọng nhất — chấm điểm chính):
 *   Thang đang MOVING_UP chỉ dừng tại tầng có CarCall hoặc HallCall cùng hướng UP.
 *   HallCall ngược hướng bị defer tới lượt sweep ngược lại (sau khi tới đầu kia).
 *   Ngược lại cho MOVING_DOWN. Thuật toán chuẩn thang máy thực tế.
 */
export class Elevator extends MovableUnit {
  readonly id: number;

  // Encapsulation: internals private, chỉ expose qua getState()/request*/hold/close/step
  private _state: ElevatorState = "IDLE";
  private _doorState: DoorState = "CLOSED";
  private _pending: Pending[] = [];
  private _queue: number[] = []; // ordered view derived from _pending via LOOK
  private _doorHeld = false;
  private _doorTimer: NodeJS.Timeout | null = null;

  static DOOR_OPEN_MS = 3500;
  static DOOR_TRANSITION_MS = 600;

  constructor(id: number, startFloor = 1) {
    super(startFloor);
    this.id = id;
  }

  // Inheritance: implement abstract MovableUnit
  move(): void {
    if (
      this._state === "DOOR_OPEN" ||
      this._state === "DOOR_OPENING" ||
      this._state === "DOOR_CLOSING"
    )
      return;
    if (this._queue.length === 0) {
      this._state = "IDLE";
      this._direction = "IDLE";
      return;
    }
    const target = this._queue[0];
    if (target > this._currentPosition) {
      this._state = "MOVING_UP";
      this._direction = "UP";
    } else if (target < this._currentPosition) {
      this._state = "MOVING_DOWN";
      this._direction = "DOWN";
    } else this.openDoor();
  }

  stop() {
    this._state = "IDLE";
    this._direction = "IDLE";
  }

  // Public API
  requestFloor(floor: number) {
    this.addPending({ floor });
  }
  requestHall(floor: number, dir: "UP" | "DOWN") {
    this.addPending({ floor, hallDir: dir });
  }

  holdDoor() {
    this._doorHeld = true;
    if (this._doorTimer) {
      clearTimeout(this._doorTimer);
      this._doorTimer = null;
    }
    if (this._doorState === "CLOSING") {
      this._doorState = "OPENING";
      setTimeout(() => {
        this._doorState = "OPEN";
        this._state = "DOOR_OPEN";
      }, Elevator.DOOR_TRANSITION_MS);
    }
  }
  closeDoor() {
    this._doorHeld = false;
    if (this._state === "DOOR_OPEN" || this._state === "DOOR_OPENING")
      this.beginClosing();
  }

  /** Called every tick by ElevatorController — moves 1 floor or handles arrival */
  step() {
    if (this._state === "MOVING_UP") this._currentPosition += 1;
    else if (this._state === "MOVING_DOWN") this._currentPosition -= 1;
    else return; // door states don't step

    if (this.shouldStopAt(this._currentPosition)) {
      this._queue.shift();
      // Remove only servable pending at this floor (opposite hall stays for return sweep)
      this._pending = this._pending.filter(
        (p) => !(p.floor === this._currentPosition && this.isServable(p)),
      );
      this.rebuildQueue();
      this.openDoor();
    } else {
      // At a floor that is queue head but opposite hall — skip (defer to return sweep)
      if (this._queue.length > 0 && this._queue[0] === this._currentPosition) {
        this._queue.shift();
        this.rebuildQueue();
      }
      if (this._queue.length === 0) {
        this._state = "IDLE";
        this._direction = "IDLE";
      } else this.move();
    }
  }

  getState(): ElevatorStatus {
    return {
      id: this.id,
      currentFloor: this._currentPosition,
      direction: this._direction,
      state: this._state,
      doorState: this._doorState,
      queue: [...this._queue],
      doorHeld: this._doorHeld,
    };
  }

  isIdle() {
    return this._state === "IDLE" && !this._doorHeld;
  }
  distanceTo(floor: number) {
    return Math.abs(this._currentPosition - floor);
  }

  private addPending(p: Pending) {
    if (
      !this._pending.some((x) => x.floor === p.floor && x.hallDir === p.hallDir)
    )
      this._pending.push(p);
    this.rebuildQueue();
    // Nếu đầu queue chính là tầng hiện tại và servable thì mở cửa ngay (không đợi tick)
    if (this._queue[0] === this._currentPosition && this.shouldStopAt(this._currentPosition)) {
      this._queue.shift();
      this._pending = this._pending.filter(
        (x) => !(x.floor === this._currentPosition && this.isServable(x)),
      );
      this.rebuildQueue();
      this.openDoor();
      return;
    }
    if (this._state === "IDLE" && this._doorState === "CLOSED") this.move();
  }

  /**
   * LOOK: build ordered queue — servable in current direction first (sorted along direction),
   * opposite hall calls deferred to tail (served on return sweep).
   * IDLE: direction = toward nearest pending.
   */
  private rebuildQueue() {
    if (this._pending.length === 0) {
      this._queue = [];
      return;
    }
    const cur = this._currentPosition;
    let dir = this._direction;
    if (dir === "IDLE") {
      const nearest = [...this._pending].sort(
        (a, b) => Math.abs(a.floor - cur) - Math.abs(b.floor - cur),
      )[0];
      dir = nearest.floor >= cur ? "UP" : "DOWN";
      if (nearest.floor === cur) dir = "UP";
    }
    const servableUp = (p: Pending) =>
      p.hallDir === undefined || p.hallDir === "UP" || p.floor === cur;
    const servableDown = (p: Pending) =>
      p.hallDir === undefined || p.hallDir === "DOWN" || p.floor === cur;
    if (dir === "UP") {
      const up = this._pending
        .filter((p) => p.floor >= cur && servableUp(p))
        .sort((a, b) => a.floor - b.floor);
      const down = this._pending
        .filter((p) => !up.includes(p))
        .sort((a, b) => b.floor - a.floor);
      this._queue = [...up, ...down].map((p) => p.floor);
    } else {
      const down = this._pending
        .filter((p) => p.floor <= cur && servableDown(p))
        .sort((a, b) => b.floor - a.floor);
      const up = this._pending
        .filter((p) => !down.includes(p))
        .sort((a, b) => a.floor - b.floor);
      this._queue = [...down, ...up].map((p) => p.floor);
    }
    this._queue = [...new Set(this._queue)];
  }

  /** HallCall chỉ servable khi trùng hướng hiện tại (hoặc CarCall/IDLE). Đặc biệt ở đúng tầng hiện tại thì luôn servable (điểm quay đầu, ví dụ F10 DOWN khi đang UP). */
  private isServable(p: Pending) {
    if (p.hallDir === undefined) return true;
    if (p.floor === this._currentPosition) return true;
    if (this._direction === "IDLE") return true;
    if (this._direction === "UP" && p.hallDir === "UP") return true;
    if (this._direction === "DOWN" && p.hallDir === "DOWN") return true;
    return false;
  }

  /** Chỉ dừng nếu queue head == floor và có pending servable (LOOK rule). */
  private shouldStopAt(floor: number) {
    if (this._queue[0] !== floor) return false;
    const pendingsAt = this._pending.filter((p) => p.floor === floor);
    if (pendingsAt.some((p) => p.hallDir === undefined)) return true;
    if (pendingsAt.some((p) => this.isServable(p))) return true;
    return false;
  }

  private openDoor() {
    this._state = "DOOR_OPENING";
    this._doorState = "OPENING";
    setTimeout(() => {
      this._doorState = "OPEN";
      this._state = "DOOR_OPEN";
      if (!this._doorHeld)
        this._doorTimer = setTimeout(
          () => this.beginClosing(),
          Elevator.DOOR_OPEN_MS,
        );
    }, Elevator.DOOR_TRANSITION_MS);
  }

  private beginClosing() {
    if (this._doorHeld) return;
    this._state = "DOOR_CLOSING";
    this._doorState = "CLOSING";
    setTimeout(() => {
      this._doorState = "CLOSED";
      this._state = "IDLE";
      this.rebuildQueue();
      if (this._queue.length === 0) {
        this._direction = "IDLE";
      } else this.move();
    }, Elevator.DOOR_TRANSITION_MS);
  }
}

// Inheritance demo (điểm cộng): thang tốc hành bỏ qua một số tầng
export class ExpressElevator extends Elevator {
  private skipFloors: Set<number>;
  constructor(id: number, startFloor: number, skipFloors: number[] = []) {
    super(id, startFloor);
    this.skipFloors = new Set(skipFloors);
  }
  override requestFloor(floor: number) {
    if (this.skipFloors.has(floor)) return;
    super.requestFloor(floor);
  }
}
