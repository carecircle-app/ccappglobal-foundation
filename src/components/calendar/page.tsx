// ESLINT-LENIENT: screened 2025-09-17 (CareCircle)
// Path: src/app/calendar/page.tsx

import CalendarApp from "@/components/calendar/CalendarApp";

export const metadata = {
  title: "CareCircle — Calendar",
  description:
    "Family day plan: meds, vitals, appointments, tasks, school/work, alerts, and notes.",
};

export default function CalendarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <CalendarApp />
    </div>
  );
}
