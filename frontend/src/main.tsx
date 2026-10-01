import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";
import Building from "./components/Building";

export type ElevatorStatus = {
  id: number;
  currentFloor: number;
  direction: string;
  state: string;
  doorState: string;
  queue: number[];
  doorHeld: boolean;
};

const socket = (globalThis as any).__elevatorSocket ?? ((globalThis as any).__elevatorSocket = io());

// C1: operator token for the protected POST /api/* endpoints.
// Set VITE_OPERATOR_TOKEN in frontend/.env to match the backend's
// OPERATOR_TOKEN. When unset (plain local dev, backend without token)
// no header is sent and everything works as before.
function authHeaders(): Record<string, string> {
  const t = (import.meta as any).env?.VITE_OPERATOR_TOKEN as string | undefined;
  return t ? { "x-operator-token": t } : {};
}
export default function App() {
  const [elevators, setElevators] = useState<ElevatorStatus[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("state", (data: ElevatorStatus[]) => {
      setElevators(data);
      setErr(null);
    });
    // retry fetch until backend ready
    let tries = 0;
    function load() {
      fetch("/api/state")
        .then((r) => {
          if (!r.ok) throw new Error(r.status + " " + r.statusText);
          return r.json();
        })
        .then((data) => {
          setElevators(data);
          setErr(null);
        })
        .catch((e) => {
          if (tries++ < 20) setTimeout(load, 1000);
          setErr("Không kết nối được backend :4000 — " + e.message + ". Hãy chạy: cd backend && npm run dev");
        });
    }
    load();
    return () => {
      socket.off("state");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);
  const hall = (floor: number, dir: "UP" | "DOWN") =>
    fetch("/api/hall-call", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ floor, direction: dir }),
    }).then((r) => {
      if (!r.ok) r.json().then((j) => alert(j.error || r.statusText)).catch(() => {});
    });
  const car = (elevatorId: number, floor: number) =>
    fetch("/api/car-call", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ elevatorId, floor }),
    });
  const hold = (id: number) =>
    fetch("/api/door/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ elevatorId: id }),
    });
  const close = (id: number) =>
    fetch("/api/door/close", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ elevatorId: id }),
    });
  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h2>Elevator Simulator — 10 floors × 3 elevators (LOOK)</h2>
      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <span style={{ color: connected ? "green" : "red" }}>● {connected ? "Socket connected" : "Socket disconnected"}</span>
        {err && <span style={{ color: "red", marginLeft: 12 }}>{err}</span>}
      </div>
      <Building elevators={elevators} onHall={hall} onCar={car} onHold={hold} onClose={close} />
      <p style={{ color: "#666", fontSize: 12, marginTop: 12 }}>
        Rule: hall call chỉ được đón khi cùng hướng với thang đang chạy (LOOK). Trái hướng phải đợi lượt quay đầu.
      </p>
      {err && (
        <pre style={{ background: "#fff3cd", padding: 12, border: "1px solid #ffc107", fontSize: 12 }}>
          Cách chạy (2 terminal):{"\n"}
          Terminal 1: cd backend && npm install && npm run dev   (chạy ở http://localhost:4000){"\n"}
          Terminal 2: cd frontend && npm install && npm run dev  (mở http://localhost:5173)
        </pre>
      )}
    </div>
  );
}
const container = document.getElementById("root")!;
const root =
  ((container as any)._reactRoot as ReturnType<typeof ReactDOM.createRoot>) ??
  ((container as any)._reactRoot = ReactDOM.createRoot(container));
root.render(<App />);
