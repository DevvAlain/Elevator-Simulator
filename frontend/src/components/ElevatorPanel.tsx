export default function ElevatorPanel({
  id,
  onCar,
  onHold,
  onClose,
}: {
  id: number;
  onCar: (id: number, f: number) => void;
  onHold: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <span
      style={{
        display: "flex",
        gap: 4,
        marginTop: 4,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onCar(id, n)}
          style={{ width: 28, height: 22, fontSize: 11 }}>
          {n}
        </button>
      ))}
      <button onClick={() => onHold(id)}>⧖ Hold</button>
      <button onClick={() => onClose(id)}>✕ Close</button>
    </span>
  );
}
