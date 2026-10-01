import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

/**
 * Shared security primitives (C1/C2/C3).
 *
 * - Auth is a minimal operator token for this interview/demo project, which
 *   has no user system. The token lives ONLY in the OPERATOR_TOKEN env var
 *   (never hardcoded). When unset (plain local dev) POST endpoints stay open
 *   so `npm run dev` works out of the box; when set (any staging/prod), all
 *   POST /api/* control endpoints require it.
 * - Rate limiters are process-local (single Node instance demo). They return
 *   HTTP 429 when the window budget is exceeded.
 * - CORS allowlist comes from ALLOWED_ORIGINS (comma-separated) or
 *   FRONTEND_ORIGIN, defaulting to the local Vite dev server.
 */

export function getOperatorToken(): string | null {
  const t = (process.env.OPERATOR_TOKEN ?? "").trim();
  return t ? t : null;
}

function extractToken(req: Request): string | null {
  const header = req.header("x-operator-token");
  if (header) return header;
  const auth = req.header("authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return null;
}

/** C1: protect all POST control endpoints. GET /api/state stays public. */
export function requireOperator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const expected = getOperatorToken();
  if (!expected) return next(); // dev mode: no token configured
  const got = extractToken(req);
  if (got !== expected)
    return res.status(401).json({ error: "operator authentication required" });
  return next();
}

/** C2: general budget for hall/car calls (human clicking stays far below). */
export const postLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "too many requests, slow down" },
});

/** C2: stricter budget for door hold/close (the C1 DoS vector). */
export const doorLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "too many door requests, slow down" },
});

const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

/** C3/C4: explicit allowlist, never "*". */
export function getAllowedOrigins(): string[] {
  const raw =
    process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : DEV_ORIGINS;
}
