import { Elevator } from "../models/Elevator";

// Polymorphism: Strategy Pattern
export interface IDispatchStrategy {
  select(floor: number, dir: "UP" | "DOWN", elevators: Elevator[]): Elevator;
}

export class NearestElevatorStrategy implements IDispatchStrategy {
  select(floor: number, _dir: "UP" | "DOWN", elevators: Elevator[]): Elevator {
    return [...elevators].sort(
      (a, b) => a.distanceTo(floor) - b.distanceTo(floor),
    )[0];
  }
}

export class LookAlgorithmStrategy implements IDispatchStrategy {
  select(floor: number, dir: "UP" | "DOWN", elevators: Elevator[]): Elevator {
    // Ưu tiên: thang cùng hướng sẽ đi qua (kể cả đang mở cửa nhưng queue đã có) > thang rảnh > ngược hướng
    const scored = elevators.map((e) => {
      const s = e.getState();
      let score = e.distanceTo(floor);
      const inferredDir =
        s.queue.length > 0
          ? s.queue[0] > s.currentFloor
            ? "UP"
            : s.queue[0] < s.currentFloor
              ? "DOWN"
              : s.direction
          : s.direction;
      const willPass =
        (dir === "UP" && s.currentFloor <= floor) ||
        (dir === "DOWN" && s.currentFloor >= floor);
      if (s.queue.length > 0 && inferredDir === dir && willPass) score -= 45;
      else if (s.state === "IDLE" && s.queue.length === 0) score -= 20;
      else if (inferredDir === dir && willPass) score -= 45;
      else if (inferredDir !== "IDLE" && inferredDir !== dir) score += 20;
      else if (s.state !== "IDLE") score += 20;
      score += s.queue.length * 5;
      return { e, score };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0].e;
  }
}
