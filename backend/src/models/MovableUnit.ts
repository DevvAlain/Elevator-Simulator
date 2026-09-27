import { Direction } from "./types";

// Inheritance: base class cho mọi đơn vị di chuyển — Elevator kế thừa
export abstract class MovableUnit {
  protected _currentPosition: number;
  protected _direction: Direction = "IDLE";

  constructor(initialPosition: number) {
    this._currentPosition = initialPosition;
  }

  get currentPosition() {
    return this._currentPosition;
  }
  get direction() {
    return this._direction;
  }

  abstract move(): void;
  abstract stop(): void;
}
