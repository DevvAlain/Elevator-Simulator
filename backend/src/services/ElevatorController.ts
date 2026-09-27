import { Elevator } from "../models/Elevator";
import { Building } from "../models/Building";
import { IDispatchStrategy, LookAlgorithmStrategy } from "./dispatchStrategies";

export class ElevatorController {
  readonly building: Building;
  get elevators() {
    return this.building.elevators;
  }
  private strategy: IDispatchStrategy;
  private tickTimer: NodeJS.Timeout | null = null;
  private onUpdate: (() => void) | null = null;

  constructor(
    count = 3,
    strategy: IDispatchStrategy = new LookAlgorithmStrategy(),
    numFloors = 10,
  ) {
    const elevators = Array.from(
      { length: count },
      (_, i) => new Elevator(i + 1, 1),
    );
    this.building = new Building(numFloors, elevators);
    this.strategy = strategy;
  }

  setStrategy(s: IDispatchStrategy) {
    this.strategy = s;
  }
  setUpdateHook(fn: () => void) {
    this.onUpdate = fn;
  }

  dispatchHall(
    floor: number,
    dir: "UP" | "DOWN",
  ): { assigned: number } | { error: string } {
    const err = this.building.validateHall(floor, dir);
    if (err) return { error: err };
    const e = this.strategy.select(floor, dir, this.elevators);
    e.requestHall(floor, dir);
    return { assigned: e.id };
  }

  carCall(elevatorId: number, floor: number): string | null {
    if (floor < 1 || floor > this.building.numFloors)
      return `floor must be 1..${this.building.numFloors}`;
    if (!this.elevators.some((e) => e.id === elevatorId))
      return "elevator not found";
    this.elevators.find((e) => e.id === elevatorId)!.requestFloor(floor);
    return null;
  }

  holdDoor(id: number): string | null {
    const e = this.elevators.find((x) => x.id === id);
    if (!e) return "elevator not found";
    e.holdDoor();
    return null;
  }
  closeDoor(id: number): string | null {
    const e = this.elevators.find((x) => x.id === id);
    if (!e) return "elevator not found";
    e.closeDoor();
    return null;
  }

  getState() {
    return this.elevators.map((e) => e.getState());
  }

  startTick(intervalMs = 1500) {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => {
      for (const e of this.elevators) {
        const s = e.getState();
        if (s.state === "MOVING_UP" || s.state === "MOVING_DOWN") e.step();
      }
      this.onUpdate?.();
    }, intervalMs);
  }
}
