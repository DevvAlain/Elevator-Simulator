import { Router } from "express";
import { ElevatorController } from "../services/ElevatorController";

function isIntInRange(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export function createRouter(ctrl: ElevatorController) {
  const r = Router();
  r.get("/state", (_req, res) => res.json(ctrl.getState()));

  r.post("/hall-call", (req, res) => {
    const floor = isIntInRange(req.body?.floor, 1, ctrl.building.numFloors);
    const direction = req.body?.direction;
    if (floor === null || !["UP", "DOWN"].includes(direction)) {
      return res
        .status(400)
        .json({
          error: `floor 1..${ctrl.building.numFloors} and direction UP/DOWN required`,
        });
    }
    const result = ctrl.dispatchHall(floor, direction);
    if ("error" in result) return res.status(400).json({ error: result.error });
    res.json({ assignedElevator: result.assigned });
  });

  r.post("/car-call", (req, res) => {
    const elevatorId = isIntInRange(req.body?.elevatorId, 1, 99);
    const floor = isIntInRange(req.body?.floor, 1, ctrl.building.numFloors);
    if (elevatorId === null || floor === null) {
      return res
        .status(400)
        .json({
          error: `elevatorId and floor 1..${ctrl.building.numFloors} required (integers)`,
        });
    }
    const err = ctrl.carCall(elevatorId, floor);
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });

  r.post("/door/hold", (req, res) => {
    const id = isIntInRange(req.body?.elevatorId, 1, 99);
    if (id === null)
      return res.status(400).json({ error: "elevatorId required" });
    const err = ctrl.holdDoor(id);
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });

  r.post("/door/close", (req, res) => {
    const id = isIntInRange(req.body?.elevatorId, 1, 99);
    if (id === null)
      return res.status(400).json({ error: "elevatorId required" });
    const err = ctrl.closeDoor(id);
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });

  return r;
}
