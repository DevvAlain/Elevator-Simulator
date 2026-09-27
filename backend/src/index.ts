import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { ElevatorController } from "./services/ElevatorController";
import { createRouter } from "./routes/api";

const controller = new ElevatorController(3);
const app = express();
app.use(cors({ origin: "*" })); // local demo; lock to frontend origin when deploying
app.use(express.json({ limit: "10kb" }));
app.use("/api", createRouter(controller));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
controller.setUpdateHook(() => io.emit("state", controller.getState()));
controller.startTick(1200);
setInterval(() => io.emit("state", controller.getState()), 800);
io.on("connection", (s) => s.emit("state", controller.getState()));
const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => console.log(`Backend http://localhost:${PORT}`));
