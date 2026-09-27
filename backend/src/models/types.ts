export type Direction = "UP" | "DOWN" | "IDLE";
export type DoorState = "OPENING" | "OPEN" | "CLOSING" | "CLOSED";
export type ElevatorState =
  | "IDLE"
  | "MOVING_UP"
  | "MOVING_DOWN"
  | "DOOR_OPENING"
  | "DOOR_OPEN"
  | "DOOR_CLOSING";

export interface ElevatorStatus {
  id: number;
  currentFloor: number;
  direction: Direction;
  state: ElevatorState;
  doorState: DoorState;
  queue: number[]; // target floors ordered by LOOK
  doorHeld: boolean;
}

export interface HallCall {
  floor: number;
  direction: "UP" | "DOWN";
}
export interface CarCall {
  elevatorId: number;
  floor: number;
}
