import { ElevatorStatus } from "../main";
export default function ElevatorCar({
  e,
  floor,
}: {
  e: ElevatorStatus;
  floor: number;
}) {
  const here = e.currentFloor === floor;
  const open = here && (e.doorState === "OPEN" || e.doorState === "OPENING");
  return (
    <div
      style={{
        border: "1px solid #ccc",
        height: 56,
        background: here ? (open ? "#b6f7b6" : "#ffe9a8") : "#f7f7f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      {here ? (
        <span>
          {open ? "🚪 OPEN" : "■"} E{e.id}
        </span>
      ) : null}
    </div>
  );
}
