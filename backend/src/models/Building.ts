import { Floor } from "./Floor";
import { Elevator } from "./Elevator";

export class Building {
  readonly floors: Floor[];
  constructor(
    public readonly numFloors: number,
    public readonly elevators: Elevator[],
  ) {
    this.floors = Array.from({ length: numFloors }, (_, i) => {
      const n = i + 1;
      return new Floor(n, n < numFloors, n > 1);
    });
  }
  getFloor(n: number) {
    return this.floors.find((f) => f.number === n);
  }
  validateHall(floor: number, dir: "UP" | "DOWN"): string | null {
    const f = this.getFloor(floor);
    if (!f) return `floor must be 1..${this.numFloors}`;
    if (!f.canCall(dir)) return `Floor ${floor} cannot call ${dir}`;
    return null;
  }
}
