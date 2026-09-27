type Props = { floor: number; onHall: (f: number, d: "UP" | "DOWN") => void };
export default function Floor({ floor, onHall }: Props) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 6,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
      <b>F{floor}</b>
      <span>
        {floor < 10 && (
          <button
            onClick={() => onHall(floor, "UP")}
            style={{ marginRight: 4 }}>
            ▲
          </button>
        )}
        {floor > 1 && <button onClick={() => onHall(floor, "DOWN")}>▼</button>}
      </span>
    </div>
  );
}
