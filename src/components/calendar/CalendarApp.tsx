// ESLINT-LENIENT: screened 2025-09-17 (CareCircle)
// Path: src/components/calendar/CalendarApp.tsx
"use client";

import * as React from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import Sections, {
  type CalendarSectionsData,
  type SectionItem,
} from "@/components/calendar/sections";

/* ----------------------------- Types & constants ----------------------------- */

type Member = { id: string; name: string; phone?: string | null };
type TaskRow = {
  id: string;
  ownerName: string;
  title: string;
  date: string | Date;  // ISO or Date
  time?: string | null; // "HH:mm"
  location?: string | null;
  comments?: string | null;
  afterComment?: string | null;
  assignees?: Member[];
  // if your API returns more fields (e.g., reminders), they’re ignored safely
};

type PersonFilter = "all" | "mom" | "dad" | "kids";

const MAX = { name: 80, title: 120, location: 120, comments: 1000, afterComment: 120 };
const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

const PRESET_TASKS = [
  "Homework — Reading 15m",
  "Dishes — Load/Run Dishwasher",
  "Room — Tidy & Trash",
  "Stretch & Walk — 10m",
  "Practice — 20m",
] as const;

const PRESET_LOCATIONS = ["Home", "School", "Clinic", "Online", "N/A"] as const;

/* --------------------------------- Helpers ---------------------------------- */

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function shiftISO(dateISO: string, deltaDays: number): string {
  const d = new Date(dateISO + "T00:00:00");
  if (Number.isNaN(d.getTime())) return todayISO();
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function onlyDateISO(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return todayISO();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${txt}`.trim());
  }
  return res.json() as Promise<T>;
}

/* ------------------------------ Add Task Modal ------------------------------ */

type AddTaskModalProps = {
  open: boolean;
  onClose: () => void;
  dateISO: string;
  members: Member[];
  onCreated: () => void;
};

function AddTaskModal({ open, onClose, dateISO, members, onCreated }: AddTaskModalProps) {
  const [saving, setSaving] = React.useState(false);
  const [ownerName, setOwnerName] = React.useState("Owner");
  const [title, setTitle] = React.useState("");
  const [time, setTime] = React.useState<string>("");
  const [location, setLocation] = React.useState<string>("Home");
  const [comments, setComments] = React.useState("");
  const [afterComment, setAfterComment] = React.useState("");
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [smsOn, setSmsOn] = React.useState(false);
  const [smsTime, setSmsTime] = React.useState<string>("");
  const [smsPhone, setSmsPhone] = React.useState<string>("");

  const canSave =
    !saving &&
    ownerName.trim().length > 0 &&
    title.trim().length > 0 &&
    time.length > 0 &&
    location.trim().length > 0;

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: any = {
        ownerName: cap(ownerName.trim(), MAX.name),
        title: cap(title.trim(), MAX.title),
        date: dateISO, // yyyy-mm-dd
        time,
        location: cap(location.trim(), MAX.location),
        comments: comments ? cap(comments.trim(), MAX.comments) : undefined,
        afterComment: afterComment ? cap(afterComment.trim(), MAX.afterComment) : undefined,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
      };
      if (smsOn && smsTime) {
        payload.sms = {
          time: smsTime, // server enforces same-day
          toPhone: smsPhone?.trim() || undefined,
        };
      }
      await fetchJSON("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onCreated();
      onClose();
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-900">Add Task</h3>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="Owner (e.g., Mom)"
              value={ownerName}
              onChange={(e) => setOwnerName(cap(e.target.value, MAX.name))}
              helperText="Who created this task"
            />
            <Input
              placeholder="Location (Home / Clinic / School)"
              value={location}
              onChange={(e) => setLocation(cap(e.target.value, MAX.location))}
              list="locs"
            />
            <datalist id="locs">
              {PRESET_LOCATIONS.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(cap(e.target.value, MAX.title))}
              list="templates"
            />
            <datalist id="templates">
              {PRESET_TASKS.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>

            <input
              type="date"
              value={dateISO}
              readOnly
              className="h-11 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 shadow-sm"
              aria-label="Date"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              aria-label="Time"
              placeholder="HH:MM"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Input
              placeholder="Notes (optional)"
              value={comments}
              onChange={(e) => setComments(cap(e.target.value, MAX.comments))}
              helperText="Short and kind"
            />
            <Input
              placeholder="After-task note (optional)"
              value={afterComment}
              onChange={(e) => setAfterComment(cap(e.target.value, MAX.afterComment))}
              helperText="What happened afterward"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-800">Assign to</div>
            <div className="flex flex-wrap gap-2">
              {members.length === 0 ? (
                <span className="text-xs text-slate-500">
                  No members yet—use Kids/Admin to add.
                </span>
              ) : (
                members.map((m) => (
                  <label
                    key={m.id}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm cursor-pointer",
                      assigneeIds.includes(m.id)
                        ? "border-sky-500 bg-sky-50 text-sky-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="accent-sky-600"
                      checked={assigneeIds.includes(m.id)}
                      onChange={() => toggleAssignee(m.id)}
                    />
                    <span>{m.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1 rounded-2xl border border-slate-200 p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-sky-600"
                checked={smsOn}
                onChange={(e) => setSmsOn(e.target.checked)}
              />
              <span className="text-sm text-slate-800">Text reminder (same day)</span>
            </label>
            {smsOn ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="time"
                  value={smsTime}
                  onChange={(e) => setSmsTime(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="HH:MM"
                  aria-label="SMS time"
                />
                <Input
                  placeholder="Phone e.g., +15551234567"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  helperText="Server enforces E.164 & same-day"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            Save Task
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Main Calendar ------------------------------ */

export default function CalendarApp() {
  const [dateISO, setDateISO] = React.useState<string>(todayISO());
  const [filter, setFilter] = React.useState<PersonFilter>("all");
  const [maxRows, setMaxRows] = React.useState<number>(6);

  const [members, setMembers] = React.useState<Member[]>([]);
  const [tasks, setTasks] = React.useState<TaskRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  const [showAdd, setShowAdd] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [ms, ts] = await Promise.all([
        fetchJSON<Member[]>("/api/members"),
        fetchJSON<TaskRow[]>("/api/tasks"),
      ]);
      setMembers(ms);
      setTasks(ts);
    } catch (e) {
      setErr((e as Error).message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  // filter tasks to the selected date and map into SectionItems
  const sectionsData: CalendarSectionsData = React.useMemo(() => {
    // utility to keep rows by person type
    const keepByFilter = (who: string | undefined): boolean => {
      if (filter === "all") return true;
      const w = (who || "").toLowerCase();
      if (filter === "mom") return w.includes("mom");
      if (filter === "dad") return w.includes("dad");
      if (filter === "kids") return w.includes("(kid)") || /ryan|derek|kid/.test(w);
      return true;
    };

    const items: SectionItem[] = tasks
      .filter((t) => onlyDateISO(t.date) === dateISO)
      .map<SectionItem>((t) => ({
        id: t.id,
        time: t.time || undefined,
        title: cap(t.title, MAX.title),
        who: t.assignees && t.assignees.length
          ? t.assignees.map((a) => a.name).join(", ")
          : t.ownerName || undefined,
        where: t.location || undefined,
        status: "planned",
      }))
      .filter((it) => keepByFilter(it.who));

    // basic split: meds/vitals/appts heuristic via title/location badges
    const meds = items.filter((i) => /med|pill|MAR/i.test(i.title));
    const vitals = items.filter((i) => /bp|hr|vital|glucose|sugar/i.test(i.title));
    const appts = items.filter((i) => /clinic|doctor|dr\.|appointment|appt|televisit/i.test(i.title));
    const other = items.filter((i) => !meds.includes(i) && !vitals.includes(i) && !appts.includes(i));

    return {
      dateISO,
      meds,
      vitals,
      appts,
      tasks: other,
      school: other.filter((i) => /homework|school|class|study|practice/i.test(i.title)),
      alerts: [],
      notes: [],
    };
  }, [tasks, dateISO, filter]);

  // summary (evening check style)
  const summary = React.useMemo(() => {
    const total = tasks.filter((t) => onlyDateISO(t.date) === dateISO).length;
    return { total };
  }, [tasks, dateISO]);

  // actions (UI-only for now; server status fields not defined in guardrails code)
  function onSelectRow(row: SectionItem & { section: string }) {
    // future: open a read/edit modal; for now, noop
    console.log("row selected", row);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Family Calendar</CardTitle>
        <CardDescription>Day plan with add, filters, and quick view</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setDateISO(shiftISO(dateISO, -1))}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-l-xl"
              aria-label="Previous day"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => setDateISO(todayISO())}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateISO(shiftISO(dateISO, 1))}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-r-xl"
              aria-label="Next day"
            >
              ▶
            </button>
          </div>

          <label className="ml-2 text-sm text-slate-600">Date</label>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            aria-label="Pick date"
          />

          <label className="ml-2 text-sm text-slate-600">Who</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as PersonFilter)}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            aria-label="Filter by person"
          >
            <option value="all">All</option>
            <option value="mom">Mom</option>
            <option value="dad">Dad</option>
            <option value="kids">Kids</option>
          </select>

          <label className="ml-2 text-sm text-slate-600">Rows</label>
          <select
            value={String(maxRows)}
            onChange={(e) => setMaxRows(Number(e.target.value) || 6)}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            aria-label="Max rows per section"
          >
            <option value="4">4</option>
            <option value="6">6 (default)</option>
            <option value="8">8</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadAll()}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              + Add Task
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span>Day: {dateISO}</span>
          <span className="mx-2">•</span>
          <span>Total items: {summary.total}</span>
          {loading ? <span className="ml-2 text-sky-700">Loading…</span> : null}
          {err ? <span className="ml-2 text-rose-700">Error: {err}</span> : null}
        </div>

        {/* Sections */}
        <Sections data={sectionsData} onSelect={onSelectRow} maxRows={maxRows} compact />
      </CardContent>

      <CardFooter>
        <span className="text-xs text-slate-500">
          Guardrails active on server: origin allowlist, rate limit, zod validation, same-day SMS, length caps.
        </span>
      </CardFooter>

      {/* Modal */}
      <AddTaskModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        dateISO={dateISO}
        members={members}
        onCreated={() => loadAll()}
      />
    </Card>
  );
}
