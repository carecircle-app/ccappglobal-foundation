import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { randomUUID } from "node:crypto";

/**
 * CareCircle  Minimal Dev Backend (v3.1-lite)
 * Goals: unblock /admin locally with simple in-memory endpoints.
 * Port: process.env.PORT || 4000
 * CORS: allows localhost:3000 and :3004 (configurable via ALLOWED_ORIGINS)
 * Env helper: DEV_ALLOW_HEADER=1 lets the frontend send custom headers if needed.
 */

const PORT = Number(process.env.PORT || 4000);

// CORS
const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3004",
  "http://127.0.0.1:3004",
];
const ALLOWED = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(","))
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const app = express();
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    return cb(null, true); // dev: be permissive
  },
  credentials: true,
}));
app.use(bodyParser.json());

// Dev header passthrough (for your Admin)
app.use((req, res, next) => {
  if (process.env.DEV_ALLOW_HEADER === "1") {
    res.header("Access-Control-Expose-Headers", "*");
  }
  next();
});

// ---- In-memory data stores ----
type Task = {
  id: string;
  title: string;
  assignees: string[];   // kid ids or names
  due?: string;          // ISO string
  status: "new"|"started"|"done"|"help";
  note?: string;
  createdAt: string;
};

let PLAN = { plan: "elite", maxKids: 5 }; // keep generous for testing
let TASKS: Task[] = [];

// ---- Health & info ----
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "CareCircle Dev Backend (v3.1-lite)",
    port: PORT,
    endpoints: ["/api/plan", "/api/tasks (GET/POST)", "/api/tasks/:id (PATCH/DELETE)", "/api/parental/enforce (POST)"],
  });
});

// ---- Plan ----
app.get("/api/plan", (_req, res) => {
  res.json(PLAN);
});

// ---- Tasks ----
app.get("/api/tasks", (_req, res) => {
  res.json(TASKS);
});

app.post("/api/tasks", (req, res) => {
  const { title, assignees = [], due, note } = req.body || {};
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title required" });
  }
  const task: Task = {
    id: randomUUID(),
    title,
    assignees: Array.isArray(assignees) ? assignees : [],
    due: typeof due === "string" ? due : undefined,
    status: "new",
    note: typeof note === "string" ? note : undefined,
    createdAt: new Date().toISOString(),
  };
  TASKS.unshift(task);
  res.status(201).json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const t = TASKS.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: "not found" });
  const { title, assignees, due, status, note } = req.body || {};
  if (typeof title === "string") t.title = title;
  if (Array.isArray(assignees)) t.assignees = assignees;
  if (typeof due === "string" || due === null) t.due = due ?? undefined;
  if (status && ["new","started","done","help"].includes(status)) t.status = status;
  if (typeof note === "string" || note === null) t.note = note ?? undefined;
  res.json(t);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const before = TASKS.length;
  TASKS = TASKS.filter(x => x.id !== id);
  const deleted = before !== TASKS.length;
  res.json({ ok: true, deleted });
});

// ---- Parental enforce (stub) ----
app.post("/api/parental/enforce", (req, res) => {
  // Accepts { action, target } but no-op in dev
  res.json({ ok: true, received: req.body || {} });
});

// ---- Start ----
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`CareCircle Dev Backend listening on http://localhost:${PORT}`);
});
