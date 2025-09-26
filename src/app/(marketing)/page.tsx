import type { ReactNode } from "react";

// Simple section + key/value line helpers
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 rounded border p-4">{children}</div>
    </section>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-40 shrink-0 text-sm text-gray-600">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">CareCircle — Family-Only Care OS</h1>
        <p className="mt-2 text-gray-600">
          Calendar • ADL Tasks • MAR • Vault • Budgets • Chat • Roles • Devices
        </p>
        <div className="mt-4 flex gap-3">
          <a href="#calendar" className="rounded bg-black px-4 py-2 text-white">See Features</a>
          <a href="/app" className="rounded border px-4 py-2">Open App</a>
        </div>
      </header>

      <Section id="calendar" title="Box 1 — Shared Care Calendar">
        <Line k="Purpose" v="One calendar for appointments, meds windows, chores, rides." />
        <Line k="Dropdowns" v="View • Recurrence • Reminder • Assignee • Visibility • Filter by Person/Audience" />
        <Line k="API" v="GET/POST /api/events, POST /api/events/:id/rsvp" />
      </Section>

      <Section id="adl" title="Box 2 — Smart Prep Checklists & Tasks (ADL)">
        <Line k="Purpose" v="ADLs/IADLs, routine prep, escalation for minors." />
        <Line k="Dropdowns" v="Template • Assignees (plan-gated) • Recurrence • Time • Auto-Action • Audience" />
        <Line k="API" v="GET/POST/PATCH /api/tasks, POST /api/tasks/:id/ack" />
      </Section>

      <Section id="meds" title="Box 3 — Medication Management & MAR">
        <Line k="Purpose" v="Schedules, barcode ingest, MAR logging." />
        <Line k="Dropdowns" v="Person • Route • Schedule • Barcode Format • Dose • Given-By" />
        <Line k="API" v="GET/POST /api/meds, POST /api/mar, GET /api/mar?medId&from&to" />
      </Section>

      <Section id="vault" title="Box 4 — Visit Notes & Doc Vault">
        <Line k="Purpose" v="Notes, IEPs, IDs, consents with uploads." />
        <Line k="Dropdowns" v="Note Type • Tags • Visibility • File Type" />
        <Line k="API" v="POST /api/uploads/presign → PUT /uploads/:key → POST /api/docs" />
      </Section>

      <Section id="household" title="Box 5 — Household & Mental Load">
        <Line k="Purpose" v="Lists, budgets, school deadlines." />
        <Line k="Dropdowns" v="List Type • Assignee • Status • Budget Period • Category" />
        <Line k="API" v="GET/POST /api/lists, PATCH /api/lists/:id/items/:itemId" />
      </Section>

      <Section id="chat" title="Box 6 — Communication & Social">
        <Line k="Purpose" v="Private chat and optional livestream." />
        <Line k="Dropdowns" v="Room Scope • Participants • Attachment Type • Provider" />
        <Line k="API" v="GET/POST /api/chat/rooms, GET/POST /api/chat/messages, SSE /api/sse" />
      </Section>

      <Section id="security" title="Box 7 — Security, Permissions & Roles">
        <Line k="Purpose" v="Roles, audience controls, caregiver expiry, 2FA." />
        <Line k="Dropdowns" v="Role • Caregiver Expiry • 2FA Method • Audience" />
        <Line k="API" v="POST/DELETE memberships, GET /api/audits, POST /api/parental/enforce" />
      </Section>

      <Section id="devices" title="Box 8 — Device Telemetry & Parental Controls (Optional)">
        <Line k="Purpose" v="Geofences, policy checks, enforce actions." />
        <Line
          k="Dropdowns"
          v="Device Kind • Auto/Manual • Auto-Action • Geofence Preset • Telemetry Type • Policy Keywords/Domains"
        />
        <Line k="API" v="GET/POST/DELETE /api/devices, POST /api/geofences, GET/POST /api/policy, POST /api/telemetry/events" />
      </Section>

      <Section id="legal" title="Privacy • Safety • Legal">
        <Line k="Consent" v="Dropdowns for Location, Push, Sensitive categories; parent export/delete." />
        <Line k="Payments" v="Plan select (Free/Lite/Elite), Stripe; donation toggle." />
        <Line k="i18n" v="Language dropdown (en/es/tl/hi) with localized reminders." />
      </Section>

      <footer className="mx-auto max-w-6xl px-6 py-12 text-xs text-gray-500">
        © {new Date().getFullYear()} CareCircle. Family-Only.
      </footer>
    </main>
  );
}

