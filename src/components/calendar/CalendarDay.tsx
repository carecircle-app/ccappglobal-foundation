// ESLINT-LENIENT: screened 2025-09-17 (CareCircle)
/* ------------------------------------------------------------------
   CareCircle — Calendar Day (phone-first, presentational)
   Path: src/components/calendar/CalendarDay.tsx

   What this renders:
   - A single-day view with a compact header:
       [◀ Prev] [Today] [Next ▶]  +  native <input type="date">
   - The Sections grid for Meds/MAR, Vitals, Appointments, Tasks,
     School/Work, Alerts/SOS, and Notes/Chat.

   Data:
   - Controlled-ish. If you pass `data`, it will render that for the
     current date. You can update `data` from a parent when `onChangeDate`
     fires. If you don't pass data, it renders empty sections (safe).

   Example:
     <CalendarDay
       initialDateISO="2025-09-17"
       data={{
         meds:   [{ id:"m1", time:"08:00", title:"Metformin 500mg", who:"Mom", status:"due", badge:"MAR" }],
         vitals: [{ id:"v1", time:"08:15", title:"BP/HR", who:"Dad", status:"due", badge:"BP" }],
       }}
       onSelect={(row) => console.log('row', row)}
       onChangeDate={(d) => console.log('date changed to', d)}
       title="Family Day Plan"
     />
------------------------------------------------------------------- */

"use client";

import * as React from "react";
import Sections, {
  type CalendarSectionsData,
  type SectionsProps,
} from "@/components/calendar/sections";

/* ------------------------------- Types ------------------------------- */

export type CalendarDayProps = {
  /** Start date in yyyy-mm-dd; defaults to local "today" */
  initialDateISO?: string;
  /** Partial payload for the current date; you can swap it on onChangeDate */
  data?: Partial<Omit<CalendarSectionsData, "dateISO">>;
  /** Bubble up row selection (section + item) */
  onSelect?: SectionsProps["onSelect"];
  /** Notify parent when the day changes (via nav or date picker) */
  onChangeDate?: (dateISO: string) => void;
  /** Optional heading (defaults to "Day Plan") */
  title?: string;
  /** Max rows per section before scroll */
  maxRows?: number;
  /** Compact spacing for lists */
  compact?: boolean;
};

/* ------------------------------ Component ------------------------------ */

export default function CalendarDay({
  initialDateISO,
  data,
  onSelect,
  onChangeDate,
  title = "Day Plan",
  maxRows = 6,
  compact = true,
}: CalendarDayProps) {
  const [dateISO, setDateISO] = React.useState<string>(
    initialDateISO ?? todayISO()
  );

  // change helpers
  const changeDate = React.useCallback(
    (d: string) => {
      setDateISO(d);
      onChangeDate?.(d);
    },
    [onChangeDate]
  );

  const gotoPrev = React.useCallback(() => {
    changeDate(shiftISO(dateISO, -1));
  }, [dateISO, changeDate]);

  const gotoNext = React.useCallback(() => {
    changeDate(shiftISO(dateISO, 1));
  }, [dateISO, changeDate]);

  const gotoToday = React.useCallback(() => {
    changeDate(todayISO());
  }, [changeDate]);

  // keyboard left/right for convenience
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") gotoPrev();
      if (e.key === "ArrowRight") gotoNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gotoPrev, gotoNext]);

  const mergedData: CalendarSectionsData = {
    dateISO,
    meds: data?.meds ?? [],
    vitals: data?.vitals ?? [],
    appts: data?.appts ?? [],
    tasks: data?.tasks ?? [],
    school: data?.school ?? [],
    alerts: data?.alerts ?? [],
    notes: data?.notes ?? [],
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          {title}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={gotoPrev}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-l-xl"
              aria-label="Previous day"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={gotoToday}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              type="button"
              onClick={gotoNext}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-r-xl"
              aria-label="Next day"
            >
              ▶
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only">Pick date</span>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => changeDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </label>
        </div>
      </div>

      {/* Sections grid */}
      <Sections
        data={mergedData}
        onSelect={onSelect}
        maxRows={maxRows}
        compact={compact}
      />
    </div>
  );
}

/* ------------------------------ Utilities ------------------------------ */

function todayISO(): string {
  // local date to yyyy-mm-dd
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
