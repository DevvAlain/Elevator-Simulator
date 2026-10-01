import { Router } from "express";
import { ElevatorController } from "../services/ElevatorController";
import {
  doorLimiter,
  postLimiter,
  requireOperator,
} from "../middleware/security";

// P1: accept ONLY primitive numbers. The old Number(v) coercion turned
// [5] into 5, "5" into 5 and true into 1. Downstream code must only ever
// see a validated integer.
function isIntInRange(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  if (v < min || v > max) return null;
  return v;
}

export function createRouter(ctrl: ElevatorController) {
  const r = Router();
  r.get("/state", (_req, res) => res.json(ctrl.getState()));

  // C1: every state-changing endpoint requires the operator token
  // (when OPERATOR_TOKEN is configured). C2: rate-limited (429 on excess).
  r.post("/hall-call", postLimiter, requireOperator, (req, res) => {
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

  r.post("/car-call", postLimiter, requireOperator, (req, res) => {
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

  r.post("/door/hold", doorLimiter, requireOperator, (req, res) => {
    const id = isIntInRange(req.body?.elevatorId, 1, 99);
    if (id === null)
      return res.status(400).json({ error: "elevatorId required" });
    const err = ctrl.holdDoor(id);
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });

  r.post("/door/close", doorLimiter, requireOperator, (req, res) => {
    const id = isIntInRange(req.body?.elevatorId, 1, 99);
    if (id === null)
      return res.status(400).json({ error: "elevatorId required" });
    const err = ctrl.closeDoor(id);
    if (err) return res.status(400).json({ error: err });
    res.json({ ok: true });
  });

  return r;
}
