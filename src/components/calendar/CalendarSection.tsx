// ESLINT-LENIENT: screened 2025-09-17 (CareCircle)
/* ------------------------------------------------------------------
   CareCircle — Calendar Sections (phone-first, presentational)
   Path: src/components/calendar/sections.tsx

   What this renders:
   - A tidy grid of day-sections: Meds (MAR), Vitals, Appointments,
     ADLs/Tasks, School/Work, Alerts/SOS, Notes/Chat.
   - Each section is scrollable if long, with compact item rows.

   No side-effects, no fetching. Feed it with props from parent page.

   Example usage:
     import Sections, { type CalendarSectionsData } from "@/components/calendar/sections";

     const data: CalendarSectionsData = {
       dateISO: "2025-09-17",
       meds:    [{ id:"m1", time:"08:00", title:"Metformin 500mg", who:"Mom", status:"due" }],
       vitals:  [{ id:"v1", time:"08:15", title:"BP/HR", who:"Dad", status:"due" }],
       appts:   [{ id:"a1", time:"10:30", title:"Clinic — Dr. Lee", who:"Mom", status:"scheduled", where:"Main Clinic" }],
       tasks:   [{ id:"t1", time:"16:00", title:"Stretch & Walk", who:"(Kid) Ryan", status:"planned" }],
       school:  [{ id:"s1", time:"13:00", title:"Homework — Reading", who:"(Kid) Derek", status:"planned" }],
       alerts:  [{ id:"x1", time:"—",     title:"Fall alert ready", who:"System", status:"armed" }],
       notes:   [{ id:"n1", time:"—",     title:"Pack meds for tomorrow", who:"Mom", status:"info" }],
     };

     <Sections data={data} onSelect={(item) => console.log(item)} />
------------------------------------------------------------------- */

"use client";

import * as React from "react";

/* --------------------------- Types & Interfaces --------------------------- */

export type SectionStatus =
  | "due"
  | "scheduled"
  | "planned"
  | "in-progress"
  | "done"
  | "missed"
  | "armed"
  | "triggered"
  | "info";

export type SectionItem = {
  id: string;
  time?: string;      // "HH:mm" or "—"
  title: string;      // short label
  who?: string;       // assignee or subject
  where?: string;     // location (for appts)
  status?: SectionStatus;
  badge?: string;     // optional tiny badge text (e.g., "MAR", "BP")
};

export type CalendarSectionsData = {
  dateISO: string; // yyyy-mm-dd
  meds?: SectionItem[];
  vitals?: SectionItem[];
  appts?: SectionItem[];
  tasks?: SectionItem[];
  school?: SectionItem[];
  alerts?: SectionItem[];
  notes?: SectionItem[];
};

export type SectionsProps = {
  data: CalendarSectionsData;
  /** Optional click handler for any row */
  onSelect?: (item: SectionItem & { section: SectionKey }) => void;
  /** Limit rows shown before scroll (per section). Default 6 on mobile */
  maxRows?: number;
  /** Compact mode toggles slightly tighter paddings */
  compact?: boolean;
};

type SectionKey =
  | "meds"
  | "vitals"
  | "appts"
  | "tasks"
  | "school"
  | "alerts"
  | "notes";

/* ------------------------------ UI constants ------------------------------ */

const SECTION_META: Record<
  SectionKey,
  { title: string; hint: string; icon: string }
> = {
  meds:   { title: "Meds (MAR)",      hint: "Tap when taken",        icon: "💊" },
  vitals: { title: "Vitals",          hint: "Log quick numbers",     icon: "📈" },
  appts:  { title: "Appointments",    hint: "Where & when",          icon: "📅" },
  tasks:  { title: "Care Tasks",      hint: "Do • Done • Help",      icon: "✅" },
  school: { title: "School / Work",   hint: "Study • Chores • Shift",icon: "🏫" },
  alerts: { title: "Alerts / SOS",    hint: "Ready • Clear • Review",icon: "🚨" },
  notes:  { title: "Notes / Chat",    hint: "Short & kind",          icon: "📝" },
};

const STATUS_STYLES: Record<
  SectionStatus,
  { dot: string; text: string; ring: string }
> = {
  "due":         { dot: "bg-red-500",       text: "text-red-600",       ring: "ring-red-200" },
  "scheduled":   { dot: "bg-amber-500",     text: "text-amber-700",     ring: "ring-amber-200" },
  "planned":     { dot: "bg-sky-500",       text: "text-sky-700",       ring: "ring-sky-200" },
  "in-progress": { dot: "bg-blue-500",      text: "text-blue-700",      ring: "ring-blue-200" },
  "done":        { dot: "bg-emerald-500",   text: "text-emerald-700",   ring: "ring-emerald-200" },
  "missed":      { dot: "bg-gray-400",      text: "text-gray-600",      ring: "ring-gray-200" },
  "armed":       { dot: "bg-fuchsia-500",   text: "text-fuchsia-700",   ring: "ring-fuchsia-200" },
  "triggered":   { dot: "bg-rose-600",      text: "text-rose-700",      ring: "ring-rose-200" },
  "info":        { dot: "bg-slate-400",     text: "text-slate-600",     ring: "ring-slate-200" },
};

/* ----------------------------- Helper components ----------------------------- */

function SectionShell(props: {
  k: SectionKey;
  count: number;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const meta = SECTION_META[props.k];
  return (
    <section
      aria-label={meta.title}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
    >
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>{meta.icon}</span>
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            {meta.title}
          </h3>
        </div>
        <span className="text-[11px] sm:text-xs text-slate-500">
          {props.count} item{props.count === 1 ? "" : "s"}
        </span>
      </header>

      <p className="sr-only">{meta.hint}</p>
      <div
        className={[
          "divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50",
          props.compact ? "max-h-44 overflow-y-auto" : "max-h-56 overflow-y-auto",
        ].join(" ")}
      >
        {props.children}
      </div>
    </section>
  );
}

function Row(props: {
  item: SectionItem;
  section: SectionKey;
  onSelect?: (item: SectionItem & { section: SectionKey }) => void;
  compact?: boolean;
}) {
  const s = props.item.status ?? "info";
  const sty = STATUS_STYLES[s];

  return (
    <button
      type="button"
      onClick={() => props.onSelect?.({ ...props.item, section: props.section })}
      className={[
        "w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "bg-white/90 hover:bg-white",
        "px-3 py-2 sm:px-3.5 sm:py-2.5",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            "h-2.5 w-2.5 rounded-full ring-4",
            sty.dot,
            sty.ring,
          ].join(" ")}
          aria-hidden
        />
        <span className="min-w-[3.5rem] text-xs font-medium text-slate-500 tabular-nums">
          {props.item.time ?? "—"}
        </span>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-slate-800">
              {props.item.title}
            </span>
            {props.item.badge ? (
              <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-semibold text-slate-600">
                {props.item.badge}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {props.item.who ? <span>{props.item.who}</span> : null}
            {props.item.who && props.item.where ? <span> • </span> : null}
            {props.item.where ? <span>{props.item.where}</span> : null}
          </div>
        </div>

        <span className={["text-[11px] font-semibold", sty.text].join(" ")}>
          {labelForStatus(props.item.status)}
        </span>
      </div>
    </button>
  );
}

function labelForStatus(s?: SectionStatus): string {
  switch (s) {
    case "due": return "Due";
    case "scheduled": return "Soon";
    case "planned": return "Planned";
    case "in-progress": return "Doing";
    case "done": return "Done";
    case "missed": return "Missed";
    case "armed": return "Armed";
    case "triggered": return "Alert";
    default: return "Note";
  }
}

/* --------------------------------- Component -------------------------------- */

export default function Sections({
  data,
  onSelect,
  maxRows = 6,
  compact = true,
}: SectionsProps) {
  const sections: { key: SectionKey; items: SectionItem[] }[] = [
    { key: "meds",   items: data.meds   ?? [] },
    { key: "vitals", items: data.vitals ?? [] },
    { key: "appts",  items: data.appts  ?? [] },
    { key: "tasks",  items: data.tasks  ?? [] },
    { key: "school", items: data.school ?? [] },
    { key: "alerts", items: data.alerts ?? [] },
    { key: "notes",  items: data.notes  ?? [] },
  ];

  // simple defensive sort by time where applicable (HH:mm → numeric)
  const parseTime = (t?: string) => {
    if (!t) return Number.POSITIVE_INFINITY;
    if (t === "—") return Number.POSITIVE_INFINITY;
    const [hh, mm] = t.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return Number.POSITIVE_INFINITY;
    return hh * 60 + mm;
    };
  sections.forEach((sec) => {
    sec.items = [...sec.items].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  });

  return (
    <div className="w-full">
      {/* Day header */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
          {prettyDate(data.dateISO)}
        </h2>
        <span className="text-xs text-slate-500">
          Tap any row to view or edit
        </span>
      </div>

      {/* Grid of sections */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((sec) => (
          <SectionShell
            key={sec.key}
            k={sec.key}
            count={sec.items.length}
            compact={compact}
          >
            {sec.items.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">
                No items yet.
              </div>
            ) : (
              sec.items.slice(0, maxRows).map((it) => (
                <Row
                  key={it.id}
                  item={it}
                  section={sec.key}
                  onSelect={onSelect}
                  compact={compact}
                />
              ))
            )}
          </SectionShell>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Small helpers ------------------------------ */

function prettyDate(dateISO: string): string {
  // safe, local-friendly label like "Wed, Sep 17"
  try {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateISO;
  }
}
