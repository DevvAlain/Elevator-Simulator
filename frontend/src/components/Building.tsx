import { ElevatorStatus } from "../main";
import FloorComp from "./Floor";
import ElevatorCar from "./ElevatorCar";
import ElevatorPanel from "./ElevatorPanel";
import React from "react";

export default function Building({
  elevators,
  onHall,
  onCar,
  onHold,
  onClose,
}: {
  elevators: ElevatorStatus[];
  onHall: (f: number, d: "UP" | "DOWN") => void;
  onCar: (id: number, f: number) => void;
  onHold: (id: number) => void;
  onClose: (id: number) => void;
}) {
  const floors = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "80px repeat(3, 140px)",
        gap: 4,
      }}>
      <div />
      {elevators.map((e) => (
        <div
          key={e.id}
          style={{ textAlign: "center", fontWeight: 700, fontSize: 12 }}>
          E{e.id} F{e.currentFloor} {e.direction} {e.doorState}
          {e.queue.length ? " → " + e.queue.join(",") : ""}
        </div>
      ))}
      {floors.map((f) => (
        <React.Fragment key={f}>
          <FloorComp floor={f} onHall={onHall} />
          {elevators.map((e) => {
            const here = e.currentFloor === f;
            const open =
              here && (e.doorState === "OPEN" || e.doorState === "OPENING");
            return (
              <div
                key={e.id + "-" + f}
                style={{
                  border: "1px solid #ccc",
                  minHeight: 56,
                  background: here ? (open ? "#b6f7b6" : "#ffe9a8") : "#f7f7f7",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                }}>
                <ElevatorCar e={e} floor={f} />
                {open && (
                  <ElevatorPanel
                    id={e.id}
                    onCar={onCar}
                    onHold={onHold}
                    onClose={onClose}
                  />
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
