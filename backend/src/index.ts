import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import { ElevatorController } from "./services/ElevatorController";
import { createRouter } from "./routes/api";
import { getAllowedOrigins } from "./middleware/security";

const controller = new ElevatorController(3);
const app = express();
// H1: hide framework fingerprint + baseline headers. CSP/COEP stay off:
// this is a JSON + Socket.IO API (no documents served), so a default
// document-oriented CSP would add breakage risk for zero benefit here.
app.disable("x-powered-by");
app.use(
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
);
// C3: explicit origin allowlist (env-configurable), never "*".
// Non-browser clients (curl, no Origin) still work; browsers from a
// non-listed origin get no ACAO header, so the browser blocks the read.
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use("/api", createRouter(controller));

// N1: centralized error handler (4 args => Express treats it as error
// middleware). Body-parser failures (malformed JSON, oversized payload)
// otherwise fall through to Express' default HTML error page, which leaks
// the stack trace and absolute server paths. Normalize them to generic
// JSON with the SAME status codes; server-side detail goes to the log only.
// Every other error is passed on untouched (no swallowing app errors).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const status =
    err instanceof Error
      ? (err as Error & { status?: unknown }).status
      : undefined;
  const type =
    err instanceof Error
      ? (err as Error & { type?: unknown }).type
      : undefined;
  if (err instanceof SyntaxError && status === 400 && type === "entity.parse.failed") {
    console.error(`[api] malformed JSON rejected: ${err.message}`);
    return res.status(400).json({ error: "invalid JSON" });
  }
  if (status === 413 && type === "entity.too.large") {
    console.error("[api] oversized payload rejected");
    return res.status(413).json({ error: "payload too large" });
  }
  return next(err);
});

const server = http.createServer(app);
// C4: same allowlist for the realtime channel (polling + websocket).
const io = new Server(server, { cors: { origin: allowedOrigins } });
controller.setUpdateHook(() => io.emit("state", controller.getState()));
controller.startTick(1200);
setInterval(() => io.emit("state", controller.getState()), 800);
io.on("connection", (s) => s.emit("state", controller.getState()));
const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => console.log(`Backend http://localhost:${PORT}`));
